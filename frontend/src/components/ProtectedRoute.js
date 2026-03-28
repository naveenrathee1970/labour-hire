import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B132B]" data-testid="loading-spinner">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#9BA3B5] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
