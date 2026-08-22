import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, isConfigured } = useAuth();

  // If Firebase is configured and user is not logged in, redirect to login page.
  if (isConfigured && !currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
