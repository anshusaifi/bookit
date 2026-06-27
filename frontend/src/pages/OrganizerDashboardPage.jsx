// src/pages/OrganizerDashboardPage.jsx
// Lists organizer's events. Links to attendees and analytics.
// Also has the Create / Edit event form.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const EMPTY_FORM = { title: '', description: '', venue: '', eventDate: '', capacity: '', price: '' };

export default function OrganizerDashboardPage() {
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving]       = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizer/events');
      setEvents(res.data.data.events);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (event) => {
    setEditingId(event.id);
    setForm({
      title:       event.title,
      description: event.description,
      venue:       event.venue,
      // Format for datetime-local input
      eventDate:   new Date(event.eventDate).toISOString().slice(0, 16),
      capacity:    event.capacity,
      price:       event.price,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        price:    Number(form.price),
      };

      if (editingId) {
        await api.patch(`/organizer/events/${editingId}`, payload);
      } else {
        await api.post('/organizer/events', payload);
      }

      setShowForm(false);
      fetchEvents();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header dashboard-header">
        <div>
          <h1>Organizer Dashboard</h1>
          <p>Manage your events</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Event</button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingId ? 'Edit Event' : 'Create New Event'}</h2>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input name="title" value={form.title} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} required />
              </div>
              <div className="form-group">
                <label>Venue</label>
                <input name="venue" value={form.venue} onChange={handleChange} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date & Time</label>
                  <input type="datetime-local" name="eventDate" value={form.eventDate} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Capacity</label>
                  <input type="number" name="capacity" value={form.capacity} onChange={handleChange} min={1} required />
                </div>
                <div className="form-group">
                  <label>Price ($)</label>
                  <input type="number" name="price" value={form.price} onChange={handleChange} min={0} step="0.01" required />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events Table */}
      {loading ? (
        <div className="loading">Loading your events...</div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <p>You haven't created any events yet.</p>
          <button className="btn btn-primary" onClick={openCreate}>Create your first event</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Capacity</th>
                <th>Sold</th>
                <th>Remaining</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td><strong>{event.title}</strong></td>
                  <td>{new Date(event.eventDate).toLocaleDateString()}</td>
                  <td>{event.capacity}</td>
                  <td>{event.bookingsSold}</td>
                  <td>
                    <span className={event.remainingSeats === 0 ? 'sold-out' : ''}>
                      {event.remainingSeats === 0 ? 'Sold Out' : event.remainingSeats}
                    </span>
                  </td>
                  <td>{Number(event.price) === 0 ? 'Free' : `$${Number(event.price).toFixed(2)}`}</td>
                  <td className="table-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(event)}>Edit</button>
                    <Link to={`/dashboard/events/${event.id}/attendees`} className="btn btn-outline btn-sm">Attendees</Link>
                    <Link to={`/dashboard/events/${event.id}/analytics`} className="btn btn-outline btn-sm">Analytics</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
