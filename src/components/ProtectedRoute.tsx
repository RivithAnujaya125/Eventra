import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ 
  children, 
  adminOnly = false,
  allowedRoles
}: { 
  children: React.ReactNode; 
  adminOnly?: boolean;
  allowedRoles?: string[];
}) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        {/* Simple spinner instead of a component I haven't fetched yet */}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  
  if (adminOnly && role !== "admin") return <Navigate to="/" replace />;
  
  if (allowedRoles && !allowedRoles.includes(role || "")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
