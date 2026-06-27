# NOTES.md

# Engineering Notes

## 1. No-Oversell Guarantee

The most important requirement of this assignment was ensuring that two users cannot successfully book the last available seat at the same time.

To handle this, I implemented the booking process inside a database transaction. Before creating a booking, the target event is locked using a row-level lock (`SELECT ... FOR UPDATE`). Once the event row is locked, I count the number of confirmed bookings for that event. If the event has already reached its capacity, the transaction returns a "Sold Out" response. Otherwise, the booking is created and the transaction is committed.

This approach guarantees that only one transaction can evaluate and reserve the last available seat at a time, preventing overselling even when multiple booking requests arrive simultaneously.

I manually verified this behavior by sending concurrent booking requests against an event with only one available seat. In every test, only one request succeeded while the others correctly returned a sold-out response.

---

## 2. Schema & Indexing Decisions

The database schema consists of four primary models:

* **User** – Stores authentication details and user roles (USER / ORGANIZER).
* **Event** – Stores event information such as title, venue, capacity, date, and organizer.
* **Booking** – Represents a user's reservation for an event and supports soft cancellation.
* **ActivityLog** – Records important user actions such as event views and booking-related activities for analytics.

### Dynamic Remaining Seats

Instead of storing `remainingSeats` in the database, I calculate it dynamically as:

```text
remainingSeats = capacity - confirmedBookings
```

This avoids duplicated state and eliminates the risk of the stored seat count becoming inconsistent with the actual bookings.

### Soft Cancellation

Bookings are never physically deleted. Instead, their status is updated to `CANCELLED` with a cancellation timestamp. This preserves booking history, supports future analytics, and avoids losing audit information.

### Indexing

I added indexes to optimize common queries:

* Event title and event date for searching and filtering.
* Organizer + event date for organizer dashboards.
* `(eventId, status)` on bookings to efficiently count confirmed bookings.
* `(userId, status)` for retrieving a user's bookings.
* ActivityLog indexes to support analytics queries.

I also enforce a unique constraint on `(userId, eventId)` so a user cannot create duplicate bookings for the same event.

---

## 3. AI Usage

I used AI as an engineering assistant during development, primarily for discussing architecture, reviewing database design, evaluating concurrency strategies, improving Docker configuration, and refining project documentation.

All implementation decisions, testing, debugging, and integration were completed manually. I reviewed every suggestion before incorporating it into the project and verified the behavior through testing.

---

## 4. Where I Disagreed with AI

I did not accept every AI suggestion directly.

Some design decisions were intentionally adjusted to better fit the assignment requirements and keep the implementation practical.

Examples include:

* Choosing dynamic remaining-seat calculation instead of storing a `remainingSeats` column.
* Using row-level locking with transactions for concurrency control instead of more complex approaches such as optimistic locking or serializable isolation.
* Keeping the architecture focused on the assignment scope instead of introducing additional infrastructure or unnecessary abstractions.

My priority throughout the implementation was correctness, maintainability, and a solution that could be clearly explained during a technical review.
