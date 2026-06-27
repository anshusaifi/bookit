// src/pages/AttendeesPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function AttendeesPage() {
  const { id } = useParams();
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get(`/organizer/events/${id}/attendees`)
      .then((res) => setAttendees(res.data.data.attendees))
      .catch(() => setError('Failed to load attendees.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="page">
      <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
      <div className="page-header">
        <h1>Attendees</h1>
        <p>{attendees.length} confirmed bookings</p>
      </div>

      {loading && <div className="loading">Loading attendees...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && attendees.length === 0 && (
        <div className="empty-state"><p>No confirmed bookings yet.</p></div>
      )}

      {!loading && attendees.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Booked At</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((booking, i) => (
                <tr key={booking.id}>
                  <td>{i + 1}</td>
                  <td>{booking.user.name}</td>
                  <td>{booking.user.email}</td>
                  <td>{new Date(booking.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
