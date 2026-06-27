# NOTES.md

---

## 1. No-Oversell Guarantee

The race condition happens because HTTP requests are handled concurrently. Without any protection, two users booking the last seat simultaneously would both read `confirmedCount = 0`, both pass the capacity check, and both insert a booking. The event ends up with more confirmed bookings than its capacity — a classic read-modify-write race.

I ruled out an application-level check immediately. Checking the count in Node.js and then writing to the database are two separate operations with no atomicity guarantee. Any number of requests in flight between those two steps can produce a corrupt result.

I chose **PostgreSQL row-level locking inside a Prisma transaction** (`SELECT FOR UPDATE`). The reason I picked this over optimistic locking or `SERIALIZABLE` isolation is simplicity and correctness for this workload. Optimistic locking requires a version column and a retry loop — more moving parts for no benefit at this scale. `SERIALIZABLE` isolation would work but serializes more than necessary and requires handling serialization failures at the application level. `FOR UPDATE` is explicit, well-understood, and does exactly what I need: lock one row for the duration of one transaction.

The implementation in `booking.repository.js`:

```js
return prisma.$transaction(async (tx) => {
  // Acquire exclusive lock on this event row
  const event = await tx.$queryRaw`
    SELECT id, capacity FROM "Event" WHERE id = ${eventId} FOR UPDATE
  `;

  const confirmedCount = await tx.booking.count({
    where: { eventId, status: 'CONFIRMED' },
  });

  if (confirmedCount >= event[0].capacity) {
    throw { statusCode: 409, message: 'Sorry, this event is sold out.' };
  }

  return tx.booking.create({ data: { userId, eventId, status: 'CONFIRMED' } });
});
```

When two transactions hit this simultaneously, PostgreSQL allows only one to acquire the lock. The second waits. By the time the second transaction proceeds, the first has already committed the booking, `confirmedCount` equals `capacity`, and it returns 409. Only one booking ever succeeds for the final seat.

I verified this manually with `test-concurrency.js`, which fires multiple booking requests simultaneously using `Promise.all`. Tested at three levels: 1 seat / 2 users, 2 seats / 3 users, and 5 seats / 10 users. All three passed — confirmed booking counts matched capacity exactly, no oversells.

---

## 2. Schema & Indexing Decisions

**User** — a single model with a `role` enum (`USER` / `ORGANIZER`). I did not create separate tables for users and organizers. The role difference is purely behavioral, enforced by the `authorize()` middleware. One table is simpler and avoids joins for authentication.

**Event** — stores `capacity` as the ceiling for confirmed bookings. I do not store a `remainingSeats` counter column. Remaining seats are computed at query time as `capacity - COUNT(confirmed bookings)`. Storing a counter would require incrementing/decrementing it on every booking and cancellation — another write that needs to be inside the same transaction and creates another potential inconsistency point. Deriving it dynamically is slightly more expensive at read time but always accurate.

**Booking** — has a `@@unique([userId, eventId])` constraint. This means one database row per user/event pair regardless of booking history. Cancellation sets `status = CANCELLED` and re-booking updates that row back to `CONFIRMED`. I chose this over inserting a new row on every booking because it makes the duplicate check a simple unique lookup and prevents unbounded row growth for users who book and cancel repeatedly.

`onDelete: Restrict` on all foreign keys is intentional. I do not want cascading deletes. If an event is accidentally deleted, I want the database to reject the operation rather than silently destroy booking records.

**ActivityLog** — append-only. Every view, booking start, confirmation, and cancellation is written as a new row. Analytics are computed from this table using `groupBy` — no pre-aggregated counters. The table exists specifically so that the analytics endpoint reflects real user behavior rather than just booking counts.

**Indices:**
- `Event(title)` — supports the search filter (`ILIKE` on title).
- `Event(eventDate)` — supports the date filter.
- `Event(organizerId, eventDate)` — composite, covers the organizer dashboard query which filters by `organizerId` and sorts by `eventDate` in one index scan.
- `Booking(eventId, status)` — the most critical index. The capacity check counts `WHERE eventId = X AND status = CONFIRMED` on every booking attempt. Without this index, every booking would do a full table scan.
- `Booking(userId, status)` — covers `GET /me/bookings`.
- `ActivityLog(eventId, activityType)` — covers the analytics `groupBy` query.

---

## 3. AI Usage

I used AI as an engineering assistant throughout this project, not as a code generator. Specifically:

- **Architecture discussions** — I described the module structure I had in mind and used AI to sanity-check whether the layering (route → controller → service → repository) made sense and whether anything was obviously wrong.
- **Concurrency strategy** — I walked through three options (application-level check, optimistic locking, `SELECT FOR UPDATE`) and discussed the tradeoffs. The final decision was mine.
- **Schema review** — I described the models and asked whether any obvious indexing was missing. The `(eventId, status)` composite index on `Booking` came out of that conversation.
- **Docker configuration** — the `VITE_PROXY_TARGET` pattern for switching the Vite proxy target between local and Docker environments was suggested by AI and I implemented and tested it.
- **Documentation** — the README files were structured with AI assistance. I reviewed and edited every section to match what is actually implemented.

Every suggestion was reviewed before being used. I did not accept generated code without reading it, and I ran the application after every meaningful change to confirm it worked.

---

## 4. Where I Disagreed with AI

**Remaining seats as a derived value.** The initial suggestion leaned toward storing a `remainingSeats` counter on the `Event` model for read performance. I rejected this. A counter is only accurate if every booking and cancellation updates it atomically inside the same transaction. That is an additional write, an additional potential failure point, and an additional thing to keep in sync. For this scale, counting confirmed bookings at query time is cleaner and always correct.

**Row-level locking over serializable isolation.** AI initially suggested `SERIALIZABLE` transaction isolation as a cleaner, more general solution. I chose `SELECT FOR UPDATE` instead. `SERIALIZABLE` requires handling serialization failure errors (`40001`) in application code and retrying. `FOR UPDATE` is more explicit about what is being locked and simpler to reason about — there is no retry logic, and the failure mode is a clear 409 rather than a transaction abort.

**Scope.** At several points AI suggested additions — a waitlist, refresh tokens, rate limiting, event image uploads. I kept the implementation focused on what the assignment actually requires. Those features are listed in the README under Future Improvements, but I did not implement them. A clean, working implementation of the stated requirements is worth more than a bloated one with half-finished extras.
