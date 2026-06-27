// src/components/ProtectedRoute.jsx
// Redirects to /login if user is not authenticated.
// Optionally checks role — if role provided and doesn't match, redirect to /.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
