// src/pages/EventsPage.jsx
// Browse + search + date filter + pagination

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const PAGE_SIZE = 20;

export default function EventsPage() {
  const [events, setEvents]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [date, setDate]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: PAGE_SIZE };
        if (search) params.search = search;
        if (date)   params.date   = date;

        const res = await api.get('/events', { params });
        if (!cancelled) {
          const { events, pagination } = res.data.data;
          setEvents(events);
          setTotal(pagination.total);
        }
      } catch {
        if (!cancelled) setError('Failed to load events. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [page, search, date]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // triggers useEffect via page change
  };

  const clearFilters = () => {
    setSearch('');
    setDate('');
    setPage(1);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Upcoming Events</h1>
        <p>Browse and book your next experience</p>
      </div>

      {/* Search & Filter */}
      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setPage(1); }}
        />
        <button type="submit" className="btn btn-primary">Search</button>
        {(search || date) && (
          <button type="button" className="btn btn-outline" onClick={clearFilters}>Clear</button>
        )}
      </form>

      {/* State: loading */}
      {loading && <div className="loading">Loading events...</div>}

      {/* State: error */}
      {!loading && error && <div className="alert alert-error">{error}</div>}

      {/* State: empty */}
      {!loading && !error && events.length === 0 && (
        <div className="empty-state">
          <p>No events found. Try a different search.</p>
        </div>
      )}

      {/* Events Grid */}
      {!loading && !error && events.length > 0 && (
        <>
          <div className="events-grid">
            {events.map((event) => (
              <Link to={`/events/${event.id}`} key={event.id} className="event-card">
                <div className="event-card-body">
                  <div className="event-card-top">
                    <span className="event-price">
                      {Number(event.price) === 0 ? 'Free' : `$${Number(event.price).toFixed(2)}`}
                    </span>
                    {event.soldOut && <span className="badge badge-sold-out">Sold Out</span>}
                  </div>
                  <h2 className="event-title">{event.title}</h2>
                  <p className="event-meta">📅 {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="event-meta">📍 {event.venue}</p>
                  <p className={`event-seats ${event.soldOut ? 'sold-out' : ''}`}>
                    {event.soldOut ? '⚠ Sold out' : `🎟 ${event.remainingSeats} seats left`}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span>Page {page} of {totalPages} ({total} events)</span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
