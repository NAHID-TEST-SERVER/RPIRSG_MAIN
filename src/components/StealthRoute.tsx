import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';

interface StealthRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const StealthRoute: React.FC<StealthRouteProps> = ({ children, allowedRoles }) => {
  const { stealthRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00ff00]"></div>
      </div>
    );
  }

  if (!stealthRole || !allowedRoles?.includes(stealthRole)) {
    return <Navigate to="/secure-access" replace />;
  }

  return <>{children}</>;
};

export default StealthRoute;
