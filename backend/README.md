# BookIt — Backend

Node.js + Express + PostgreSQL + Prisma backend for the BookIt live event booking platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Modular Architecture](#modular-architecture)
3. [Folder Structure](#folder-structure)
4. [Layer Responsibilities](#layer-responsibilities)
5. [Database Schema](#database-schema)
6. [Authentication](#authentication)
7. [Authorization](#authorization)
8. [Modules](#modules)
9. [Concurrency Handling](#concurrency-handling)
10. [Validation](#validation)
11. [Error Handling](#error-handling)
12. [API Reference](#api-reference)
13. [Environment Variables](#environment-variables)
14. [Local Development](#local-development)
15. [Docker Development](#docker-development)
16. [Prisma Commands](#prisma-commands)
17. [Useful Commands](#useful-commands)
18. [Security Considerations](#security-considerations)
19. [Troubleshooting](#troubleshooting)

---

## Overview

The backend is a RESTful JSON API built with:
- **Express 5** — HTTP server and routing
- **Prisma 6** — type-safe ORM with PostgreSQL
- **JWT** — stateless authentication
- **bcrypt** — password hashing
- **express-validator** — request validation
- **PostgreSQL transactions + FOR UPDATE** — concurrency-safe bookings

All routes are mounted under `/api`. The entry point is `index.js` → `src/app.js`.

---

## Modular Architecture

Each feature (auth, events, bookings, organizer) is a self-contained module:

```
modules/
  auth/
    auth.routes.js       Route definitions
    auth.controller.js   HTTP layer: parse req, call service, return res
    auth.service.js      Business logic: hash passwords, sign tokens
    auth.repository.js   Prisma queries
    auth.validation.js   express-validator rules
```

No module imports from another module's internals. Shared code lives in `config/` and `utils/`.

---

## Folder Structure

```
backend/
├── index.js               Server entry point (loads .env, starts HTTP)
├── test-concurrency.js    Standalone concurrency test script
├── prisma.config.ts       Prisma CLI configuration (dotenvx)
├── prisma/
│   ├── schema.prisma      Data models and relations
│   ├── seed.js            Demo data seeder
│   └── migrations/
│       └── 20260626100336_init/
│           └── migration.sql
└── src/
    ├── app.js             Express factory (CORS, body parser, routes, error handler)
    ├── config/
    │   ├── constants.js   Frozen objects: ROLES, BOOKING_STATUS, HTTP_STATUS, etc.
    │   └── prisma.js      Singleton PrismaClient instance
    ├── middleware/
    │   ├── authenticate.js  JWT verification -> req.user
    │   ├── authorize.js     Role check (requires authenticate first)
    │   ├── errorHandler.js  Global error handler (last middleware)
    │   └── validate.js      express-validator result checker
    ├── modules/
    │   ├── auth/
    │   ├── events/
    │   ├── bookings/
    │   └── organizer/
    ├── routes/
    │   └── index.js       Central router (mounts all modules)
    └── utils/
        ├── jwt.js         signToken / verifyToken helpers
        └── response.js    sendSuccess / sendError helpers
```

---

## Layer Responsibilities

### Route (`*.routes.js`)
- Defines HTTP method + path
- Applies middleware in order: `validate → authenticate → authorize → controller`
- No business logic

### Controller (`*.controller.js`)
- Parses `req.body`, `req.params`, `req.query`
- Calls the service
- Returns a standardized HTTP response via `sendSuccess` / `sendError`
- No Prisma imports

### Service (`*.service.js`)
- Orchestrates business logic
- Performs ownership checks (e.g., "does this organizer own this event?")
- Calls repository functions
- No direct Prisma usage

### Repository (`*.repository.js`)
- Contains only Prisma queries
- No business logic
- Returns raw Prisma results to the service

### Response Helpers (`utils/response.js`)

```js
sendSuccess(res, data, statusCode = 200)
// { success: true, data: { ... } }

sendError(res, message, statusCode = 500)
// { success: false, message: "..." }
```

---

## Database Schema

### User

| Column | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `name` | String | Display name |
| `email` | String | Unique |
| `password` | String | bcrypt hash |
| `role` | Enum | `USER` or `ORGANIZER` |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

### Event

| Column | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `title` | String | Searchable (index) |
| `description` | String | — |
| `venue` | String | — |
| `eventDate` | DateTime | Indexed |
| `capacity` | Int | Maximum confirmed bookings |
| `price` | Decimal(10,2) | Supports free events (0) |
| `organizerId` | String | FK → User |

### Booking

| Column | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `status` | Enum | `CONFIRMED` or `CANCELLED` |
| `userId` | String | FK → User |
| `eventId` | String | FK → Event |
| `cancelledAt` | DateTime? | Set on cancellation |
| `createdAt` | DateTime | Auto |

Unique constraint: `@@unique([userId, eventId])` — one row per user/event pair.

### ActivityLog

| Column | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `activityType` | Enum | `EVENT_VIEWED`, `BOOKING_STARTED`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED` |
| `userId` | String? | Nullable (anonymous views allowed) |
| `eventId` | String | FK → Event |
| `createdAt` | DateTime | Auto |

The activity log is **append-only**. All analytics are computed from it at query time.

---

## Authentication

### Flow

```
POST /auth/signup
  -> validate (name, email, password, role)
  -> hash password with bcrypt (rounds: 10)
  -> create User in DB
  -> sign JWT { id, email, role } expires 7d
  -> return token

POST /auth/login
  -> validate email + password
  -> find user by email
  -> compare password with bcrypt.compare
  -> sign JWT
  -> return token
```

### JWT Payload

```json
{
  "id": "user-cuid",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1234567890,
  "exp": 1235172690
}
```

The JWT is stateless — no server-side session storage. Token revocation on logout is handled client-side (delete from localStorage).

### `authenticate` Middleware

```
Authorization: Bearer <token>

1. Extract token from header
2. verifyToken(token) -> decoded payload
3. Attach to req.user
4. next()

Errors:
  401 - Missing header
  401 - Token expired
  401 - Invalid token
```

---

## Authorization

```js
// middleware/authorize.js
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return sendError(res, 'You do not have permission...', 403);
  }
  next();
};

// Usage
router.use(authenticate, authorize(ROLES.ORGANIZER));
```

Must be used after `authenticate` (requires `req.user`).

---

## Modules

### Auth Module

| Route | Method | Auth | Description |
|---|---|---|---|
| `/auth/signup` | POST | None | Create account |
| `/auth/login` | POST | None | Login, returns JWT |
| `/auth/logout` | POST | Required | Client logout signal |
| `/auth/me` | GET | Required | Returns current user |

### Events Module

Both routes support optional auth — if a valid token is present, the user ID is recorded in the activity log.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/events` | GET | Optional | List events (search, date, pagination) |
| `/events/:id` | GET | Optional | Single event with seat availability |

**Query parameters for `GET /events`:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `search` | string | — | Filter by title (case-insensitive) |
| `date` | string | — | Filter by date (ISO format: `YYYY-MM-DD`) |

### Bookings Module

| Route | Method | Auth | Description |
|---|---|---|---|
| `/events/:id/book` | POST | Required | Book a seat |
| `/me/bookings` | GET | Required | My booking list |
| `/bookings/:id` | DELETE | Required | Cancel a booking |

### Organizer Module

All routes require authentication + `ORGANIZER` role.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/organizer/events` | GET | ORGANIZER | List organizer's own events |
| `/organizer/events` | POST | ORGANIZER | Create new event |
| `/organizer/events/:id` | PATCH | ORGANIZER | Edit event |
| `/organizer/events/:id/attendees` | GET | ORGANIZER | Attendee list |
| `/organizer/events/:id/analytics` | GET | ORGANIZER | Analytics data |

### Analytics Module (within Organizer)

Computed from `ActivityLog` using `groupBy`:

```json
{
  "views": 45,
  "bookingsStarted": 12,
  "bookingsConfirmed": 10,
  "bookingsCancelled": 2,
  "conversionRate": "22.2%"
}
```

---

## Concurrency Handling

### Problem

Without locking, two concurrent booking requests for the last seat can both pass the capacity check and both succeed — overselling the event.

### Solution — SELECT FOR UPDATE

```js
const createBooking = async ({ userId, eventId }) => {
  return prisma.$transaction(async (tx) => {
    // 1. Acquire an exclusive row lock on this event
    const event = await tx.$queryRaw`
      SELECT id, capacity FROM "Event"
      WHERE id = ${eventId} FOR UPDATE
    `;

    // 2. Count confirmed bookings (within the same tx)
    const confirmedCount = await tx.booking.count({
      where: { eventId, status: BOOKING_STATUS.CONFIRMED },
    });

    // 3. Reject if sold out
    if (confirmedCount >= event[0].capacity) {
      const err = new Error('Sorry, this event is sold out.');
      err.statusCode = 409;
      throw err;
    }

    // 4. Duplicate check
    // ...

    // 5. Create or re-confirm booking
    // ...

    // 6. Append to activity log
    await tx.activityLog.createMany({ ... });
  });
};
```

### Why This Works

`FOR UPDATE` in PostgreSQL acquires an exclusive lock on the selected row for the duration of the transaction. Any other transaction trying `FOR UPDATE` on the same row must wait until the first commits or rolls back. This serializes concurrent booking attempts at the database level, making overselling impossible.

The lock is row-level — not table-level — so booking different events in parallel is unaffected.

### Activity Log in Transaction

Both `BOOKING_STARTED` and `BOOKING_CONFIRMED` are written inside the same transaction. If the booking fails, neither log entry is created. This ensures the activity log is always consistent with actual bookings.

---

## Validation

Uses `express-validator`. Validation rules are defined in `*.validation.js` files and applied as route middleware:

```js
router.post('/signup', signupRules, validate, controller.signup);
```

`validate.js` checks `validationResult(req)` and calls `next(err)` if any rule fails (422 Unprocessable Entity).

### Signup Rules
- `name`: non-empty string
- `email`: valid email format
- `password`: minimum 8 characters
- `role`: must be `USER` or `ORGANIZER`

### Login Rules
- `email`: valid email
- `password`: non-empty

---

## Error Handling

### Global Error Handler (`middleware/errorHandler.js`)

Catches all errors passed via `next(err)`:

```
Prisma P2002 (unique violation)  ->  409
Prisma P2025 (record not found)  ->  404
err.statusCode                   ->  that code
Fallback                         ->  500
```

All errors return: `{ success: false, message: "..." }`

### Async Errors

Every controller wraps async code in try/catch and passes errors to `next(err)`:

```js
const listEvents = async (req, res, next) => {
  try {
    const result = await eventService.listEvents({ ... });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};
```

---

## API Reference

### Health Check

```
GET /api/health

Response 200:
{ "success": true, "data": { "status": "ok" } }
```

### Auth

**POST /api/auth/signup**
```json
// Request body
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "password123",
  "role": "USER"
}

// Response 201
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Alice", "email": "...", "role": "USER" },
    "token": "eyJ..."
  }
}
```

**POST /api/auth/login**
```json
// Request body
{ "email": "alice@example.com", "password": "password123" }

// Response 200
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Alice", "email": "...", "role": "USER" },
    "token": "eyJ..."
  }
}

// Error 401
{ "success": false, "message": "Invalid email or password." }
```

**POST /api/auth/logout**
```
Headers: Authorization: Bearer <token>
Response 200: { "success": true, "data": { "message": "Logged out successfully." } }
```

**GET /api/auth/me**
```
Headers: Authorization: Bearer <token>
Response 200: { "success": true, "data": { "user": { ... } } }
```

### Events

**GET /api/events**
```
Query: ?page=1&limit=20&search=React&date=2026-08-01

Response 200:
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "...",
        "title": "Advanced React Patterns",
        "venue": "Tech Hub",
        "eventDate": "2026-08-15T10:00:00Z",
        "price": "29.99",
        "capacity": 100,
        "organizerId": "...",
        "seatsAvailable": 87,
        "_count": { "bookings": 13 }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**GET /api/events/:id**
```
Response 200:
{
  "success": true,
  "data": {
    "event": {
      "id": "...",
      "title": "...",
      "description": "...",
      "venue": "...",
      "eventDate": "...",
      "price": "...",
      "capacity": 50,
      "seatsAvailable": 48,
      "organizer": { "id": "...", "name": "..." }
    }
  }
}
```

### Bookings

**POST /api/events/:id/book**
```
Headers: Authorization: Bearer <token>
Body: {} (no body required)

Response 201:
{ "success": true, "data": { "booking": { "id": "...", "status": "CONFIRMED", ... } } }

Error 409 (sold out):
{ "success": false, "message": "Sorry, this event is sold out." }

Error 409 (duplicate):
{ "success": false, "message": "You have already booked this event." }
```

**GET /api/me/bookings**
```
Headers: Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "...",
        "status": "CONFIRMED",
        "createdAt": "...",
        "event": { "id": "...", "title": "...", "venue": "...", "eventDate": "...", "price": "..." }
      }
    ]
  }
}
```

**DELETE /api/bookings/:id**
```
Headers: Authorization: Bearer <token>

Response 200:
{ "success": true, "data": { "message": "Booking cancelled." } }

Error 403: Booking belongs to a different user
Error 404: Booking not found
```

### Organizer

**GET /api/organizer/events**
```
Headers: Authorization: Bearer <ORGANIZER token>

Response 200:
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "...",
        "title": "...",
        "capacity": 100,
        "eventDate": "...",
        "_count": { "bookings": 42 }
      }
    ]
  }
}
```

**POST /api/organizer/events**
```json
// Headers: Authorization: Bearer <ORGANIZER token>
// Body:
{
  "title": "Workshop: Advanced React",
  "description": "An in-depth workshop on React patterns.",
  "venue": "Tech Hub, Room 4",
  "eventDate": "2026-09-15T10:00:00.000Z",
  "capacity": 30,
  "price": 49.99
}

// Response 201:
{ "success": true, "data": { "event": { "id": "...", ... } } }
```

**PATCH /api/organizer/events/:id**
```json
// Headers: Authorization: Bearer <ORGANIZER token>
// Body (all fields optional):
{
  "title": "Updated Title",
  "capacity": 50
}

// Error 400: New capacity < current confirmed bookings
// Error 403: Not your event
```

**GET /api/organizer/events/:id/attendees**
```
Response 200:
{
  "success": true,
  "data": {
    "attendees": [
      {
        "id": "booking-id",
        "createdAt": "...",
        "user": { "id": "...", "name": "Bob", "email": "bob@example.com" }
      }
    ]
  }
}
```

**GET /api/organizer/events/:id/analytics**
```
Response 200:
{
  "success": true,
  "data": {
    "analytics": {
      "views": 120,
      "bookingsStarted": 35,
      "bookingsConfirmed": 28,
      "bookingsCancelled": 7,
      "conversionRate": "23.3%"
    }
  }
}
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Express port (default: 5000) |
| `DATABASE_URL` | Yes | Full PostgreSQL connection string |
| `POSTGRES_USER` | Yes | Used by the postgres Docker container |
| `POSTGRES_PASSWORD` | Yes | Used by the postgres Docker container |
| `POSTGRES_DB` | Yes | Database name |
| `JWT_SECRET` | Yes | Secret key for JWT signing and verification |

---

## Local Development

```bash
cd backend

# Copy and edit .env
cp .env.example .env
# Set DATABASE_URL to: postgresql://postgres:postgres@localhost:5432/bookit

# Create .env.local for Prisma CLI
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bookit" > .env.local

# Install dependencies
pnpm install

# Generate Prisma Client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev --name init

# Seed database
pnpm prisma db seed

# Start server (nodemon — hot reload)
pnpm run dev
```

Server runs at `http://localhost:5000`

---

## Docker Development

```bash
# From the project root (bookit/)

# Build and start backend only
docker compose up --build -d backend

# Apply migrations
docker exec cloudzent-backend pnpm prisma migrate deploy

# Seed
docker exec cloudzent-backend pnpm prisma db seed

# View logs
docker compose logs -f backend

# Shell into container
docker exec -it cloudzent-backend sh

# Run concurrency test
docker exec cloudzent-backend node test-concurrency.js
```

---

## Prisma Commands

| Command | When to run |
|---|---|
| `pnpm prisma generate` | After any `schema.prisma` change |
| `pnpm prisma migrate dev` | Creating a new migration during local development |
| `pnpm prisma migrate deploy` | Applying migrations in Docker or production (no new files created) |
| `pnpm prisma db seed` | Populating with demo data after migration |
| `pnpm prisma migrate reset` | Full local reset (drops DB, re-migrates, re-seeds) |
| `pnpm prisma studio` | Opens visual DB browser at localhost:5555 |

---

## Useful Commands

```bash
# Check which events have bookings exceeding capacity (should never happen)
docker exec -it cloudzent-db psql -U postgres -d cloudzent -c "
  SELECT e.title, e.capacity, COUNT(b.id) AS confirmed
  FROM \"Event\" e
  LEFT JOIN \"Booking\" b ON b.\"eventId\" = e.id AND b.status = 'CONFIRMED'
  GROUP BY e.id, e.title, e.capacity
  HAVING COUNT(b.id) > e.capacity;
"

# View all users
docker exec -it cloudzent-db psql -U postgres -d cloudzent -c "SELECT id, name, email, role FROM \"User\";"

# View activity log breakdown
docker exec -it cloudzent-db psql -U postgres -d cloudzent -c "
  SELECT \"activityType\", COUNT(*) FROM \"ActivityLog\" GROUP BY \"activityType\";
"
```

---

## Security Considerations

| Concern | Implementation |
|---|---|
| Password storage | bcrypt with 10 rounds — never stored in plaintext |
| JWT secret | Read from environment variable — never hardcoded |
| Token expiry | 7 days — short enough to limit exposure |
| Role enforcement | `authorize()` middleware on every organizer route |
| Ownership checks | Service layer verifies `event.organizerId === req.user.id` before any mutation |
| SQL injection | All queries go through Prisma's parameterized API — `$queryRaw` uses tagged template literals |
| CORS | Enabled globally — restrict to your frontend origin in production |
| `.env` gitignored | Real credentials never committed |

---

## Troubleshooting

**Prisma uses `localhost` instead of `postgres`**

A `.env.local` inside the container overrides `DATABASE_URL`. Remove it:
```bash
docker exec cloudzent-backend rm -f .env.local
docker compose restart backend
```

**"Table does not exist"**
```bash
docker exec cloudzent-backend pnpm prisma migrate deploy
```

**"Cannot find module"**

Dependencies not installed in container. Rebuild:
```bash
docker compose up --build -d backend
```

**JWT "Invalid token"**

The `JWT_SECRET` in `.env` may differ from what was used to sign the token. Ensure it's consistent and restart the backend after any `.env` change.
