# BookIt — Frontend

React 19 + Vite SPA for the BookIt live event booking platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Folder Structure](#folder-structure)
3. [Routing](#routing)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [Component Organization](#component-organization)
7. [Pages](#pages)
8. [Environment Variables](#environment-variables)
9. [Running Locally](#running-locally)
10. [Running with Docker](#running-with-docker)
11. [Build Commands](#build-commands)
12. [Troubleshooting](#troubleshooting)
13. [Future Improvements](#future-improvements)

---

## Overview

The frontend is a single-page application (SPA) built with:

- **React 19** — UI library
- **Vite 8** — build tool and dev server
- **React Router DOM 7** — client-side routing
- **Axios** — HTTP client
- **Vanilla CSS** — global styles with CSS variables

The Vite dev server proxies all `/api` requests to the backend (`http://localhost:5000` locally, `http://backend:5000` in Docker), so no CORS configuration is needed in development.

---

## Folder Structure

```
frontend/
├── .env               (gitignored)
├── .dockerignore
├── Dockerfile
├── package.json
├── pnpm-lock.yaml
├── vite.config.js     Vite config with /api proxy
└── src/
    ├── main.jsx       App entry point — sets up BrowserRouter + AuthProvider
    ├── App.jsx        Route definitions
    ├── api.js         Axios instance — baseURL = /api
    ├── index.css      Global styles and CSS custom properties
    ├── App.css        App-level styles
    ├── context/
    │   └── AuthContext.jsx   Authentication state and helpers
    ├── components/
    │   ├── Navbar.jsx         Top navigation bar
    │   └── ProtectedRoute.jsx Role-aware route guard
    └── pages/
        ├── EventsPage.jsx              / — browse all events
        ├── EventDetailPage.jsx         /events/:id — single event
        ├── LoginPage.jsx               /login
        ├── SignupPage.jsx              /signup
        ├── MyBookingsPage.jsx          /my-bookings (auth required)
        ├── OrganizerDashboardPage.jsx  /dashboard (ORGANIZER)
        ├── AttendeesPage.jsx           /dashboard/events/:id/attendees
        └── AnalyticsPage.jsx           /dashboard/events/:id/analytics
```

---

## Routing

Defined in `App.jsx` using React Router DOM v7:

| Path | Component | Access |
|---|---|---|
| `/` | `EventsPage` | Public |
| `/events/:id` | `EventDetailPage` | Public |
| `/login` | `LoginPage` | Public |
| `/signup` | `SignupPage` | Public |
| `/my-bookings` | `MyBookingsPage` | Authenticated |
| `/dashboard` | `OrganizerDashboardPage` | `ORGANIZER` role |
| `/dashboard/events/:id/attendees` | `AttendeesPage` | `ORGANIZER` role |
| `/dashboard/events/:id/analytics` | `AnalyticsPage` | `ORGANIZER` role |
| `*` | 404 page | Public |

### ProtectedRoute

Wraps private pages. Reads auth state from `AuthContext`:

```jsx
// Usage
<Route path="/my-bookings" element={
  <ProtectedRoute><MyBookingsPage /></ProtectedRoute>
} />

// With role requirement
<Route path="/dashboard" element={
  <ProtectedRoute role="ORGANIZER"><OrganizerDashboardPage /></ProtectedRoute>
} />
```

- If unauthenticated → redirects to `/login`
- If wrong role → redirects to `/`

---

## State Management

Auth state is managed via **React Context** (`AuthContext.jsx`).

There is no external state management library (no Redux, Zustand, etc.). All other data (events, bookings) is fetched locally in each page component using `useEffect` + `useState`.

### AuthContext

```jsx
// Provided values
const { user, token, login, logout, loading } = useAuth();

// user: { id, name, email, role } | null
// token: JWT string | null
// login(data): stores user + token in state and localStorage
// logout(): clears state and localStorage
// loading: true while checking localStorage on mount
```

State is persisted to `localStorage` so the user stays logged in after a page refresh.

### Auth Flow

```
User submits login form
    -> POST /api/auth/login
    -> response: { user, token }
    -> AuthContext.login({ user, token })
    -> stored in localStorage + state
    -> Navbar re-renders with user name
    -> ProtectedRoute allows access
```

---

## API Integration

### Axios Instance (`src/api.js`)

```js
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export default api;
```

All API calls use the relative path `/api/*`. In development, Vite proxies this to the backend.

### Attaching the JWT

Each page that calls a protected endpoint manually adds the Authorization header:

```js
const { token } = useAuth();

const response = await api.get('/me/bookings', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Vite Proxy Configuration (`vite.config.js`)

```js
export default defineConfig({
  server: {
    host: '0.0.0.0',    // required for Docker port exposure
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

| Environment | `VITE_PROXY_TARGET` | Resolved target |
|---|---|---|
| Local dev (Windows) | not set | `http://localhost:5000` |
| Docker container | `http://backend:5000` | `http://backend:5000` |

`VITE_PROXY_TARGET` is injected by `docker-compose.yml`:
```yaml
environment:
  - VITE_PROXY_TARGET=http://backend:5000
```

---

## Component Organization

### Navbar (`components/Navbar.jsx`)

Renders navigation links based on auth state and role:
- Not logged in: **Events** · **Login** · **Sign Up**
- Logged in (USER): **Events** · **My Bookings** · username · **Logout**
- Logged in (ORGANIZER): **Events** · **Dashboard** · username · **Logout**

### ProtectedRoute (`components/ProtectedRoute.jsx`)

```jsx
<ProtectedRoute>               // requires authentication
<ProtectedRoute role="ORGANIZER">  // requires authentication + role
```

---

## Pages

### EventsPage (`/`)

- Fetches paginated events from `GET /api/events`
- Debounced search by title
- Date filter
- Displays event cards with title, venue, date, price, available seats
- Sold-out badge when `seatsAvailable <= 0`

### EventDetailPage (`/events/:id`)

- Fetches single event from `GET /api/events/:id`
- Shows full description, organizer, capacity, seats available
- **Book a Seat** button → `POST /api/events/:id/book`
- Shows **Sold Out** when capacity is full
- Shows **Already Booked** when user has a confirmed booking

### LoginPage (`/login`)

- Email + password form
- On success: calls `AuthContext.login`, redirects to `/`

### SignupPage (`/signup`)

- Name, email, password, role selector
- On success: calls `AuthContext.login`, redirects to `/`

### MyBookingsPage (`/my-bookings`)

- Fetches `GET /api/me/bookings`
- Lists all bookings with event details and status badges
- **Cancel** button → `DELETE /api/bookings/:id`
- Empty state when no bookings

### OrganizerDashboardPage (`/dashboard`)

- Fetches `GET /api/organizer/events`
- Shows event table: title, date, capacity, bookings count, seats remaining
- **+ Create Event** form (inline or modal): title, description, venue, date, capacity, price
- **Edit** → inline edit form
- Links to **Attendees** and **Analytics** per event

### AttendeesPage (`/dashboard/events/:id/attendees`)

- Fetches `GET /api/organizer/events/:id/attendees`
- Table: name, email, booking date

### AnalyticsPage (`/dashboard/events/:id/analytics`)

- Fetches `GET /api/organizer/events/:id/analytics`
- Displays: views, bookings started, bookings confirmed, bookings cancelled, conversion rate

---

## Environment Variables

### `frontend/.env` (gitignored)

```env
VITE_API_URL=http://localhost:5000/api
```

> Note: This variable is defined but not used in the current implementation. API calls use the Vite proxy (`/api`), not a hardcoded URL. It is kept as a reference for future use (e.g., production builds pointing to a deployed backend).

### Docker-injected (not in .env file)

| Variable | Value in Docker | Set by |
|---|---|---|
| `VITE_PROXY_TARGET` | `http://backend:5000` | `docker-compose.yml` |

This is a **Node.js** environment variable (read by `vite.config.js` via `process.env`), not a `VITE_` browser variable.

---

## Running Locally

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

Frontend runs at `http://localhost:5174`

> **Note:** The backend must be running at `http://localhost:5000` for API calls to work. The Vite proxy handles the forwarding — no CORS configuration needed.

---

## Running with Docker

From the project root (`bookit/`):

```bash
# Build and start frontend container
docker compose up --build -d frontend

# View logs
docker compose logs -f frontend

# Rebuild after code changes
docker compose up --build -d frontend
```

Frontend accessible at `http://localhost:5173`

The Docker container:
1. Builds a `node:22-alpine` image with pnpm installed
2. Installs dependencies via `RUN pnpm install`
3. Copies source files
4. Starts the Vite dev server with `pnpm run dev`
5. The `VITE_PROXY_TARGET=http://backend:5000` env var ensures API calls reach the backend container

---

## Build Commands

| Command | Purpose |
|---|---|
| `pnpm run dev` | Start development server with hot reload |
| `pnpm run build` | Build optimized production bundle to `dist/` |
| `pnpm run preview` | Preview the production build locally |
| `pnpm run lint` | Run ESLint |

> The production build is not used in Docker (dev server runs instead). For a production deployment, use `pnpm run build` and serve `dist/` with nginx.

---

## Troubleshooting

### "Failed to load events" / API calls return network errors

The Vite proxy is not reaching the backend.

**If running locally:**
```bash
# Ensure backend is running
curl http://localhost:5000/api/health
```

**If running in Docker:**
```bash
# Ensure backend container is healthy
docker compose ps
docker compose logs backend

# Ensure VITE_PROXY_TARGET is set
docker exec cloudzent-frontend env | grep VITE
```

### Page stays on login after refreshing

AuthContext reads from `localStorage` on mount. If the JWT has expired or was cleared, you'll be redirected to `/login`. This is expected behavior.

### Vite port conflict

```bash
# If :5174 is in use, Vite auto-increments to :5175, etc.
# Check the actual URL in the terminal output after pnpm run dev
```

### "Cannot GET /dashboard" after page refresh

React Router handles routing client-side. If you deploy to a static server, configure it to serve `index.html` for all routes. In the current Vite dev server setup, this works automatically.

---

## Future Improvements

| Feature | Notes |
|---|---|
| Axios interceptors | Auto-attach `Authorization` header globally instead of per-request |
| Global error handling | Axios response interceptor for 401 → auto-logout |
| Loading skeletons | Skeleton screens instead of plain "Loading..." text |
| Toast notifications | Replace `alert()` calls with a toast library |
| Form library | React Hook Form or Formik for complex organizer forms |
| Pagination UI | Next/Prev buttons on the events listing page |
| Testing | Vitest + React Testing Library for component tests |
| Production Dockerfile | Multi-stage build: `vite build` then nginx serving `dist/` |
