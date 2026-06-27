// src/pages/AnalyticsPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function AnalyticsPage() {
  const { id } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get(`/organizer/events/${id}/analytics`)
      .then((res) => setAnalytics(res.data.data.analytics))
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="page">
      <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
      <div className="page-header">
        <h1>Event Analytics</h1>
        <p>View → Booking conversion funnel</p>
      </div>

      {loading && <div className="loading">Loading analytics...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && analytics && (
        <>
          <div className="analytics-grid">
            <div className="analytics-card">
              <span className="analytics-icon">👁</span>
              <div className="analytics-value">{analytics.views}</div>
              <div className="analytics-label">Total Views</div>
            </div>
            <div className="analytics-card">
              <span className="analytics-icon">🛒</span>
              <div className="analytics-value">{analytics.bookingsStarted}</div>
              <div className="analytics-label">Bookings Started</div>
            </div>
            <div className="analytics-card">
              <span className="analytics-icon">✅</span>
              <div className="analytics-value">{analytics.bookingsConfirmed}</div>
              <div className="analytics-label">Bookings Confirmed</div>
            </div>
            <div className="analytics-card">
              <span className="analytics-icon">❌</span>
              <div className="analytics-value">{analytics.bookingsCancelled}</div>
              <div className="analytics-label">Bookings Cancelled</div>
            </div>
            <div className="analytics-card highlight">
              <span className="analytics-icon">📈</span>
              <div className="analytics-value">{analytics.conversionRate}</div>
              <div className="analytics-label">View → Booking Rate</div>
            </div>
          </div>

          <div className="funnel">
            <h2>Conversion Funnel</h2>
            <div className="funnel-bar">
              <div className="funnel-step">
                <span>Views</span>
                <div className="funnel-bar-fill" style={{ width: '100%' }}>{analytics.views}</div>
              </div>
              <div className="funnel-step">
                <span>Started</span>
                <div className="funnel-bar-fill started" style={{ width: analytics.views > 0 ? `${(analytics.bookingsStarted / analytics.views) * 100}%` : '0%' }}>
                  {analytics.bookingsStarted}
                </div>
              </div>
              <div className="funnel-step">
                <span>Confirmed</span>
                <div className="funnel-bar-fill confirmed" style={{ width: analytics.views > 0 ? `${(analytics.bookingsConfirmed / analytics.views) * 100}%` : '0%' }}>
                  {analytics.bookingsConfirmed}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
