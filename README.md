# BookIt — Live Event Booking Platform

> Full-stack take-home assignment. A stripped-down Eventbrite: real accounts, real bookings, organizer dashboard, and analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + React Router v7 |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | JWT + bcrypt |
| Infra | Docker + Docker Compose |

---

## Architecture

```
bookit/
├── backend/          Node.js / Express API
│   ├── src/
│   │   ├── modules/  auth · events · bookings · organizer
│   │   ├── middleware/  authenticate · authorize · validate · errorHandler
│   │   ├── config/   prisma · constants
│   │   └── utils/    response helpers
│   └── prisma/       schema · migrations · seed
└── frontend/         React + Vite SPA
    └── src/
        ├── pages/    EventsPage · EventDetail · Login · Signup
        │             MyBookings · Dashboard · Attendees · Analytics
        ├── components/ Navbar · ProtectedRoute
        └── context/  AuthContext
```

---

## Quick Start (Docker — recommended)

### Prerequisites
- Docker Desktop running

### 1. Clone the repository

```bash
git clone <repo-url>
cd bookit
```

### 2. Set up environment variables

```bash
cp backend/.env.example backend/.env
```

> The default values work out of the box with Docker Compose — no changes needed.

### 3. Start all services

```bash
docker compose up --build
```

This starts:
- `postgres` — PostgreSQL 16 on port `5432`
- `backend` — Express API on port `5000`
- `frontend` — Vite dev server on port `5173`

On first start, Prisma automatically runs migrations and seeds the database with demo data.

### 4. Open the app

```
http://localhost:5173
```

---

## Seeded Demo Accounts

| Role | Email | Password |
|---|---|---|
| Organizer | organizer@bookit.dev | password123 |
| User | bob@bookit.dev | password123 |
| User | carol@bookit.dev | password123 |

---

## Features

### Authentication
- Sign up / Log in / Log out
- JWT-based session
- Single role flag: `USER` or `ORGANIZER`

### Events (Public)
- Browse all upcoming events
- Search by title
- Filter by date
- Pagination

### Bookings (User)
- Book a seat on any event
- View all your bookings
- Cancel a booking (seat returns to available)

### Organizer Dashboard
- Create events (title, venue, date, capacity, price)
- Edit events (capacity cannot drop below confirmed bookings)
- View attendee list per event
- Analytics: views → bookings conversion funnel

---

## API Endpoints

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/events                   ?search= &date= &page= &limit=
GET    /api/events/:id

POST   /api/events/:id/book          (auth required)
GET    /api/me/bookings              (auth required)
DELETE /api/bookings/:id             (auth required)

GET    /api/organizer/events         (organizer only)
POST   /api/organizer/events         (organizer only)
PATCH  /api/organizer/events/:id     (organizer only)
GET    /api/organizer/events/:id/attendees   (organizer only)
GET    /api/organizer/events/:id/analytics   (organizer only)
```

---

## Concurrency — No-Oversell Guarantee

The booking endpoint uses a **PostgreSQL row-level lock** inside a transaction:

```js
// booking.repository.js
return prisma.$transaction(async (tx) => {
  // Lock the event row — only one transaction can hold this at a time
  const [event] = await tx.$queryRaw`
    SELECT id, capacity FROM "Event"
    WHERE id = ${eventId} FOR UPDATE
  `;

  const confirmed = await tx.booking.count({ where: { eventId, status: 'CONFIRMED' } });

  if (confirmed >= event.capacity) {
    throw new AppError('Sorry, this event is sold out.', 409);
  }

  return tx.booking.create({ ... });
});
```

**Why this works:** When two requests arrive simultaneously, PostgreSQL serializes them at the lock level. The second request waits for the first to commit. By then, `confirmed >= capacity`, so it gets a clean 409.

### Running the concurrency test

```bash
# From the backend directory (or inside the backend container)
node test-concurrency.js
```

Expected output:
```
[PASS] Assignment Requirement: 1 seat, 2 users
       Got 1 success(es), capacity was 1

[PASS] Stress Test: 2 seats, 3 users
       Got 2 success(es), capacity was 2

[PASS] Stress Test: 5 seats, 10 users
       Got 5 success(es), capacity was 5

3/3 passed — No-oversell guarantee confirmed
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL to point to your local postgres
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm run dev        # starts on :5000
```

### Frontend

```bash
cd frontend
pnpm install
pnpm run dev        # starts on :5174 (proxies /api to :5000)
```

---

## Commit History

This monorepo preserves the full commit history from both the `backend` and `frontend` repositories, imported via `git subtree`. Each feature was committed incrementally:

- `feat: setup project foundation with modular architecture, authentication, and events module`
- `feat: add bookings module and organizer module with full API coverage`
- `feat: build complete frontend — auth, events, bookings, organizer dashboard, and analytics`
- `fix:` commits for Docker proxy, Prisma type coercion, useEffect closure
- `test: add concurrency test script`
