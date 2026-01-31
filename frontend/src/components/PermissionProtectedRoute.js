import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Component to protect routes based on permissions
 * Redirects to /dashboard if user doesn't have required permission
 */
export const PermissionProtectedRoute = ({ 
  children, 
  permission, 
  anyOf, 
  allOf,
  redirectTo = '/dashboard'
}) => {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  let isAuthorized = true;
  
  // Check single permission
  if (permission) {
    isAuthorized = hasPermission(permission);
  }
  // Check if user has ANY of the permissions
  else if (anyOf && anyOf.length > 0) {
    isAuthorized = hasAnyPermission(anyOf);
  }
  // Check if user has ALL of the permissions
  else if (allOf && allOf.length > 0) {
    isAuthorized = hasAllPermissions(allOf);
  }
  
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="mb-4">
            <svg 
              className="mx-auto h-16 w-16 text-red-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
            {user.role && (
              <span className="block mt-2 text-sm text-gray-500">
                Your role: <span className="font-semibold uppercase">{user.role}</span>
              </span>
            )}
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-hover transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return children;
};
