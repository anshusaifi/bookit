// src/components/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">🎟 BookIt</Link>

      <div className="navbar-links">
        <Link to="/">Events</Link>

        {user ? (
          <>
            {user.role === 'USER' && <Link to="/my-bookings">My Bookings</Link>}
            {user.role === 'ORGANIZER' && <Link to="/dashboard">Dashboard</Link>}
            <span className="navbar-user">👤 {user.name}</span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
