// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import Navbar           from './components/Navbar'
import ProtectedRoute   from './components/ProtectedRoute'
import EventsPage       from './pages/EventsPage'
import EventDetailPage  from './pages/EventDetailPage'
import LoginPage        from './pages/LoginPage'
import SignupPage       from './pages/SignupPage'
import MyBookingsPage   from './pages/MyBookingsPage'
import OrganizerDashboardPage from './pages/OrganizerDashboardPage'
import AttendeesPage    from './pages/AttendeesPage'
import AnalyticsPage    from './pages/AnalyticsPage'

export default function App() {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Public */}
          <Route path="/"           element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/signup"     element={<SignupPage />} />

          {/* User protected */}
          <Route path="/my-bookings" element={
            <ProtectedRoute><MyBookingsPage /></ProtectedRoute>
          } />

          {/* Organizer protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute role="ORGANIZER"><OrganizerDashboardPage /></ProtectedRoute>
          } />
          <Route path="/dashboard/events/:id/attendees" element={
            <ProtectedRoute role="ORGANIZER"><AttendeesPage /></ProtectedRoute>
          } />
          <Route path="/dashboard/events/:id/analytics" element={
            <ProtectedRoute role="ORGANIZER"><AnalyticsPage /></ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={
            <div className="page"><div className="empty-state"><h2>404 — Page not found</h2></div></div>
          } />
        </Routes>
      </main>
    </>
  )
}
