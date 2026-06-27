// src/pages/EventDetailPage.jsx
// Event detail + Book button

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function EventDetailPage() {
  const { id }       = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();

  const [event, setEvent]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.data.event);
    } catch {
      setError('Event not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvent(); }, [id]);

  const handleBook = async () => {
    if (!user) { navigate('/login'); return; }

    setBooking(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/events/${id}/book`);
      setSuccess('🎉 Booking confirmed! Check My Bookings for details.');
      fetchEvent(); // refresh seat count
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="page"><div className="loading">Loading event...</div></div>;
  if (!event)  return <div className="page"><div className="alert alert-error">{error || 'Event not found.'}</div></div>;

  const isPast = new Date(event.eventDate) < new Date();

  return (
    <div className="page">
      <Link to="/" className="back-link">← Back to Events</Link>

      <div className="event-detail">
        <div className="event-detail-header">
          <div>
            <h1>{event.title}</h1>
            <p className="event-organizer">Hosted by {event.organizer?.name}</p>
          </div>
          <div className="event-price-tag">
            {Number(event.price) === 0 ? 'Free' : `$${Number(event.price).toFixed(2)}`}
          </div>
        </div>

        <div className="event-detail-meta">
          <div className="meta-item">
            <span className="meta-icon">📅</span>
            <span>{new Date(event.eventDate).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">📍</span>
            <span>{event.venue}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">🎟</span>
            <span className={event.soldOut ? 'sold-out' : ''}>
              {event.soldOut ? 'Sold Out' : `${event.remainingSeats} of ${event.capacity} seats remaining`}
            </span>
          </div>
        </div>

        <div className="event-description">
          <h2>About this event</h2>
          <p>{event.description}</p>
        </div>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!isPast && (
          <div className="event-actions">
            {!user ? (
              <Link to="/login" className="btn btn-primary">Login to Book</Link>
            ) : event.soldOut ? (
              <button className="btn btn-disabled" disabled>Sold Out</button>
            ) : (
              <button className="btn btn-primary" onClick={handleBook} disabled={booking}>
                {booking ? 'Booking...' : 'Book a Seat'}
              </button>
            )}
          </div>
        )}

        {isPast && <div className="alert alert-info">This event has already taken place.</div>}
      </div>
    </div>
  );
}
