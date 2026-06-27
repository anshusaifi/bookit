// src/pages/MyBookingsPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/me/bookings');
      setBookings(res.data.data.bookings);
    } catch {
      setError('Failed to load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.delete(`/bookings/${bookingId}`);
      fetchBookings(); // refresh list
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  if (loading) return <div className="page"><div className="loading">Loading your bookings...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Bookings</h1>
        <p>Manage your event reservations</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!loading && bookings.length === 0 && (
        <div className="empty-state">
          <p>You haven't booked any events yet.</p>
          <Link to="/" className="btn btn-primary">Browse Events</Link>
        </div>
      )}

      <div className="bookings-list">
        {bookings.map((booking) => (
          <div key={booking.id} className={`booking-card ${booking.status === 'CANCELLED' ? 'cancelled' : ''}`}>
            <div className="booking-info">
              <h2>
                <Link to={`/events/${booking.event.id}`}>{booking.event.title}</Link>
              </h2>
              <p className="event-meta">📅 {new Date(booking.event.eventDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <p className="event-meta">📍 {booking.event.venue}</p>
              <p className="event-meta">💰 {Number(booking.event.price) === 0 ? 'Free' : `$${Number(booking.event.price).toFixed(2)}`}</p>
            </div>

            <div className="booking-status-col">
              <span className={`badge ${booking.status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-cancelled'}`}>
                {booking.status}
              </span>
              {booking.status === 'CONFIRMED' && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleCancel(booking.id)}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
