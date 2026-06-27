# BookIt — Live Event Booking Platform

> Full-stack take-home assignment. A stripped-down Eventbrite: real accounts, real bookings, organizer dashboard, and analytics — with a production-grade concurrency guarantee.

---

## Table of Contents

1. [Assignment Overview](#assignment-overview)
2. [Interviewer Quick Start](#interviewer-quick-start)
3. [Features](#features)
4. [Technology Stack](#technology-stack)
5. [Architecture](#architecture)
6. [Folder Structure](#folder-structure)
7. [Database Overview](#database-overview)
8. [Booking Concurrency](#booking-concurrency)
9. [Docker Architecture](#docker-architecture)
10. [Environment Variables](#environment-variables)
11. [Installation Guide](#installation-guide)
12. [Manual Testing Guide](#manual-testing-guide)
13. [Concurrency Testing](#concurrency-testing)
14. [Assignment Requirement Mapping](#assignment-requirement-mapping)
15. [Troubleshooting](#troubleshooting)
16. [Future Improvements](#future-improvements)

---

## Assignment Overview

Build a working web app where **organizers** create events with limited seats, and **users** browse those events and book seats. Two user roles, real bookings, an organizer dashboard, and an analytics view.

**Scope:** Authentication · Events · Bookings · Organizer Dashboard · Analytics · Concurrency Safety

---

## Interviewer Quick Start

> Clone → Configure → Start → Verify. All commands are copy-paste ready.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git installed

### Step 1 — Clone the repository

```bash
git clone https://github.com/anshusaifi/bookit.git
cd bookit
```

### Step 2 — Configure environment variables

```bash
cp backend/.env.example backend/.env
```

The default values in `.env.example` work out of the box with Docker Compose. No changes needed.

### Step 3 — Build and start all containers

```bash
docker compose up --build -d
```

This builds and starts three containers:

| Container | Service | Port |
|---|---|---|
| `cloudzent-db` | PostgreSQL 16 | `5432` |
| `cloudzent-backend` | Express API | `5000` |
| `cloudzent-frontend` | Vite Dev Server | `5173` |

### Step 4 — Apply database migrations

```bash
docker exec cloudzent-backend pnpm prisma migrate deploy
```

### Step 5 — Seed the database

```bash
docker exec cloudzent-backend pnpm prisma db seed
```

### Step 6 — Verify backend is healthy

```bash
curl http://localhost:5000/api/health
```

Expected: `{"success":true,"data":{"status":"ok"}}`

### Step 7 — Open the frontend

```
http://localhost:5173
```

### Step 8 — Login with seeded accounts

| Role | Email | Password |
|---|---|---|
| Organizer | organizer@bookit.dev | password123 |
| User | bob@bookit.dev | password123 |
| User | carol@bookit.dev | password123 |

### Step 9 — Run the concurrency test

```bash
docker exec cloudzent-backend node test-concurrency.js
```

Expected output:

```
[PASS] Assignment Requirement: 1 seat, 2 users
[PASS] Stress Test: 2 seats, 3 users
[PASS] Stress Test: 5 seats, 10 users

3/3 passed — No-oversell guarantee confirmed
```

---

## Features

### Authentication
- Sign up with name, email, password, and role (`USER` or `ORGANIZER`)
- Login returns a signed JWT (7-day expiry)
- Logout endpoint
- `/auth/me` returns the current authenticated user

### Event Discovery (Public)
- Browse all upcoming events — no login required
- Full-text search by title
- Filter by date
- Pagination via `page` and `limit` query params
- Activity log: every view is recorded (with userId when logged in)

### Bookings (Users)
- Book a seat on any event (requires authentication)
- Duplicate booking prevention — one seat per user per event
- Re-booking after cancellation is allowed
- Cancel a booking — seat returns to pool immediately
- View all personal bookings with event details

### Organizer Dashboard
- Create events (title, venue, date/time, capacity, price)
- Edit events — capacity cannot drop below confirmed booking count
- View attendee list with name, email, and booking time
- Analytics: views → bookings conversion funnel per event

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 19.x |
| Frontend Build | Vite | 8.x |
| Frontend Routing | React Router DOM | 7.x |
| HTTP Client | Axios | 1.x |
| Backend Runtime | Node.js | 22.x |
| Backend Framework | Express | 5.x |
| ORM | Prisma | 6.x |
| Database | PostgreSQL | 16 |
| Auth | JWT (jsonwebtoken) | 9.x |
| Password Hashing | bcrypt | 6.x |
| Validation | express-validator | 7.x |
| Container | Docker + Docker Compose | — |
| Package Manager | pnpm | 10.x |

---

## Architecture

### High-Level

```
Browser (React SPA)
       |
       |  HTTP /api/*
       v
 Vite Dev Server  --- proxy /api ---> Express API  --- Prisma ---> PostgreSQL
  :5173                                :5000
```

In Docker, all three run as separate containers on `cloudzent-network`. The Vite proxy forwards `/api` to `http://backend:5000` using the Docker internal DNS name.

### Backend — 4-Layer Pattern

```
HTTP Request
    |
    v
Route -> Middleware (authenticate / authorize / validate)
    |
    v
Controller   thin layer, calls service, returns HTTP response
    |
    v
Service      business logic, ownership checks, orchestration
    |
    v
Repository   Prisma queries only, no business logic
    |
    v
PostgreSQL (via Prisma Client)
```

### Frontend

```
main.jsx
  BrowserRouter
    AuthProvider (React Context)
      App.jsx
        Navbar
        Routes
          /                         EventsPage
          /events/:id               EventDetailPage
          /login                    LoginPage
          /signup                   SignupPage
          /my-bookings              MyBookingsPage (protected)
          /dashboard                OrganizerDashboardPage (ORGANIZER)
          /dashboard/events/:id/attendees   AttendeesPage
          /dashboard/events/:id/analytics   AnalyticsPage
```

---

## Folder Structure

```
bookit/
├── .gitignore
├── README.md
├── docker-compose.yml
|
├── backend/
│   ├── .env.example
│   ├── .env                  (gitignored — copy from .env.example)
│   ├── .env.local            (gitignored — for local Prisma CLI only)
│   ├── Dockerfile
│   ├── index.js              server entry point
│   ├── test-concurrency.js   concurrency test script
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── migrations/
│   └── src/
│       ├── app.js            Express factory
│       ├── config/
│       │   ├── constants.js  roles, statuses, HTTP codes
│       │   └── prisma.js     singleton Prisma client
│       ├── middleware/
│       │   ├── authenticate.js
│       │   ├── authorize.js
│       │   ├── errorHandler.js
│       │   └── validate.js
│       ├── modules/
│       │   ├── auth/         controller, service, repository, routes, validation
│       │   ├── events/       controller, service, repository, routes, validation
│       │   ├── bookings/     controller, service, repository, routes
│       │   └── organizer/    controller, service, repository, routes
│       ├── routes/
│       │   └── index.js      central router
│       └── utils/
│           ├── jwt.js
│           └── response.js
|
└── frontend/
    ├── Dockerfile
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js            Axios instance (baseURL = /api)
        ├── index.css
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── EventsPage.jsx
            ├── EventDetailPage.jsx
            ├── LoginPage.jsx
            ├── SignupPage.jsx
            ├── MyBookingsPage.jsx
            ├── OrganizerDashboardPage.jsx
            ├── AttendeesPage.jsx
            └── AnalyticsPage.jsx
```

---

## Database Overview

### Models

| Model | Purpose |
|---|---|
| `User` | Accounts for both users and organizers. Role: `USER` or `ORGANIZER` |
| `Event` | Events created by organizers with capacity, price, and date |
| `Booking` | Seat reservation linking User to Event. Status: `CONFIRMED` or `CANCELLED` |
| `ActivityLog` | Immutable audit log of user actions used for analytics |

### Key Design Decisions

- `Booking` has `@@unique([userId, eventId])` — one row per user/event pair. Cancellation sets `status = CANCELLED`; re-booking updates that row back to `CONFIRMED` rather than creating a duplicate.
- `ActivityLog` is append-only. Analytics are derived from it via `groupBy`.
- `Event.capacity` stores the maximum allowed `CONFIRMED` bookings.
- `onDelete: Restrict` on all foreign keys prevents accidental cascading deletes.

### Indices

```
Event:    title, eventDate, (organizerId, eventDate)
Booking:  (eventId, status), (userId, status)
Activity: (eventId, activityType), userId, createdAt
```

---

## Booking Concurrency

### The Problem

Without protection, two simultaneous requests for the last seat can both read `confirmedCount = 0`, both pass the capacity check, and both insert — **overselling**.

### The Solution — PostgreSQL Row-Level Locking

```js
return prisma.$transaction(async (tx) => {
  // Step 1: Lock this event row — forces concurrent transactions to serialize
  const [event] = await tx.$queryRaw`
    SELECT id, capacity FROM "Event"
    WHERE id = ${eventId} FOR UPDATE
  `;

  // Step 2: Count confirmed bookings (within the same transaction)
  const confirmedCount = await tx.booking.count({
    where: { eventId, status: 'CONFIRMED' }
  });

  // Step 3: Reject if sold out
  if (confirmedCount >= event.capacity) {
    throw { statusCode: 409, message: 'Sorry, this event is sold out.' };
  }

  // Step 4: Only one transaction reaches here per available seat
  return tx.booking.create({ data: { userId, eventId, status: 'CONFIRMED' } });
});
```

### Timeline Under Concurrent Load

```
Transaction A:  FOR UPDATE  ->  acquires lock
Transaction B:  FOR UPDATE  ->  WAITS (blocked by A)

Transaction A:  count = 0, capacity = 1  ->  INSERT  ->  COMMIT
Transaction B:  (lock released)  ->  count = 1, capacity = 1  ->  409 Sold Out
```

The lock is row-level — only this event is serialized. All other events proceed in parallel.

---

## Docker Architecture

### Services

| Service | Image | Port | Role |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | Database |
| `backend` | bookit-backend (local build) | 5000 | Express API |
| `frontend` | bookit-frontend (local build) | 5173 | Vite dev server |

### Network

All containers share `cloudzent-network` (bridge driver). Services address each other by service name:
- Backend → Postgres: `postgres:5432`
- Frontend proxy → Backend: `backend:5000`

### Volumes

| Volume | Type | Purpose |
|---|---|---|
| `bookit_postgres_data` | Named | Persists PostgreSQL data |
| `/app/node_modules` | Anonymous | Preserves installed packages inside containers |

### Common Commands

```bash
# Start all (detached)
docker compose up -d

# Build and start (after code changes)
docker compose up --build -d

# Rebuild one service only
docker compose up --build -d backend

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Shell into backend container
docker exec -it cloudzent-backend sh

# Shell into database
docker exec -it cloudzent-db psql -U postgres -d cloudzent

# Stop all
docker compose down

# Full reset (destroys all data)
docker compose down -v
docker compose up --build -d
docker exec cloudzent-backend pnpm prisma migrate deploy
docker exec cloudzent-backend pnpm prisma db seed
```

---

## Environment Variables

### `backend/.env`

| Variable | Value (default) | Purpose |
|---|---|---|
| `PORT` | `5000` | Express server port |
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/cloudzent` | Prisma connection string (Docker hostname) |
| `POSTGRES_USER` | `postgres` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `cloudzent` | Database name |
| `JWT_SECRET` | *(set this)* | Secret for signing JWT tokens |

### `backend/.env.local` (local dev only, gitignored)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cloudzent
```

Used only by the Prisma CLI on your host machine. Overrides `DATABASE_URL` to use `localhost` instead of the Docker service name `postgres`.

### Why Two Files?

| File | Used by | Host resolves `postgres` as... |
|---|---|---|
| `.env` | Docker Compose + Express app | ✅ Docker container IP |
| `.env.local` | Prisma CLI on host terminal | ✅ localhost (port-mapped) |

---

## Installation Guide

### Docker (Recommended)

See [Interviewer Quick Start](#interviewer-quick-start).

### Local Development

```bash
# Backend
cd backend
cp .env.example .env           # edit DATABASE_URL to localhost:5432
echo 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bookit' > .env.local
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm run dev                   # http://localhost:5000

# Frontend (separate terminal)
cd frontend
pnpm install
pnpm run dev                   # http://localhost:5174
```

---

## Prisma Commands

Run from `backend/` directory:

| Command | Purpose | When |
|---|---|---|
| `pnpm prisma generate` | Regenerate Prisma Client | After schema changes |
| `pnpm prisma migrate dev` | Create + apply migration | During development |
| `pnpm prisma migrate deploy` | Apply existing migrations | Docker / production |
| `pnpm prisma db seed` | Insert demo data | After migrate |
| `pnpm prisma migrate reset` | Drop DB + re-migrate + re-seed | Full local reset |
| `pnpm prisma studio` | Visual DB browser at `:5555` | Debugging |

---

## Manual Testing Guide

### As a User
1. Sign up at `/signup` with role **User**
2. Browse events at `/` — search by title, filter by date
3. Click an event to view details
4. Click **Book a Seat**
5. Visit **My Bookings** to see the reservation
6. Cancel the booking

### As an Organizer
1. Login as `organizer@bookit.dev` / `password123`
2. Navigate to **Dashboard**
3. Create a new event with capacity = 1
4. View attendees after a user books
5. View the analytics funnel

### Sold-Out Behavior
1. Login as `bob@bookit.dev`
2. Go to **"Sold-Out Workshop"** — button shows **Sold Out**

---

## Concurrency Testing

```bash
docker exec cloudzent-backend node test-concurrency.js
```

The script runs 3 scenarios: 1 seat/2 users, 2 seats/3 users, 5 seats/10 users.

Verify in PostgreSQL:

```sql
-- Connect
docker exec -it cloudzent-db psql -U postgres -d cloudzent

-- Confirmed bookings must never exceed capacity
SELECT e.title, e.capacity, COUNT(b.id) AS confirmed
FROM "Event" e
LEFT JOIN "Booking" b ON b."eventId" = e.id AND b.status = 'CONFIRMED'
GROUP BY e.id, e.title, e.capacity;
```

---

## Assignment Requirement Mapping

| Requirement | Status | Endpoint / Feature |
|---|---|---|
| Sign up / Login / Logout | ✅ | `/auth/signup`, `/auth/login`, `/auth/logout` |
| Role flag user / organizer | ✅ | `User.role` enum + `authorize()` middleware |
| Browse events | ✅ | `GET /events` |
| Search events | ✅ | `?search=` query param |
| Book a seat | ✅ | `POST /events/:id/book` |
| View own bookings | ✅ | `GET /me/bookings` |
| Cancel a booking | ✅ | `DELETE /bookings/:id` |
| Create events | ✅ | `POST /organizer/events` |
| Set capacity | ✅ | `Event.capacity` field |
| View attendees | ✅ | `GET /organizer/events/:id/attendees` |
| Analytics view | ✅ | `GET /organizer/events/:id/analytics` |
| No overselling | ✅ | `SELECT FOR UPDATE` in Prisma transaction |
| Meaningful commit history | ✅ | 15 incremental commits preserved via git subtree |

---

## Troubleshooting

### "Failed to load events"

```bash
docker compose logs backend     # check for errors
curl http://localhost:5000/api/health
docker exec cloudzent-backend pnpm prisma migrate deploy
```

### "Table does not exist"

Migrations not applied:
```bash
docker exec cloudzent-backend pnpm prisma migrate deploy
```

### Prisma uses `localhost` instead of `postgres` inside Docker

A `.env.local` inside the container overrides the database host:
```bash
docker exec cloudzent-backend rm -f .env.local
docker compose restart backend
```

### Port already in use

```bash
docker compose down
netstat -ano | findstr :5000    # Windows
```

### Full reset

```bash
docker compose down -v
docker compose up --build -d
docker exec cloudzent-backend pnpm prisma migrate deploy
docker exec cloudzent-backend pnpm prisma db seed
```

---

## Future Improvements

| Feature | Notes |
|---|---|
| Waitlist | Queue users when sold out; promote on cancellation |
| Email notifications | Booking confirmation via Resend or SendGrid |
| Payment | Stripe Checkout for paid events |
| Rate limiting | Protect booking endpoint with `express-rate-limit` |
| Refresh tokens | Short-lived access tokens + secure refresh flow |
| Unit tests | Jest + Supertest (backend), Vitest (frontend) |
| Production build | Multi-stage Dockerfile, nginx static file serving |
| Redis queue | Replace row locking with Redis-backed queue for high throughput |
