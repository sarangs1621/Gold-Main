import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermission, useAnyPermission, useAllPermissions } from '../hooks/usePermission';

/**
 * Component to conditionally render children based on user permissions
 * @param {Object} props
 * @param {string} props.permission - Single permission to check
 * @param {string[]} props.anyOf - Array of permissions (user needs at least one)
 * @param {string[]} props.allOf - Array of permissions (user needs all)
 * @param {React.ReactNode} props.children - Content to render if permission check passes
 * @param {React.ReactNode} props.fallback - Content to render if permission check fails
 * @returns {React.ReactNode}
 */
export const PermissionGuard = ({ 
  permission, 
  anyOf, 
  allOf, 
  children, 
  fallback = null 
}) => {
  const { user } = useAuth();
  
  // If no user, don't render
  if (!user) return fallback;
  
  let hasPermission = false;
  
  // Check single permission
  if (permission) {
    hasPermission = usePermission(permission);
  }
  // Check if user has ANY of the permissions
  else if (anyOf && anyOf.length > 0) {
    hasPermission = useAnyPermission(anyOf);
  }
  // Check if user has ALL of the permissions
  else if (allOf && allOf.length > 0) {
    hasPermission = useAllPermissions(allOf);
  }
  
  return hasPermission ? children : fallback;
};

/**
 * HOC to wrap a component with permission check
 * @param {React.Component} Component - Component to wrap
 * @param {string} permission - Permission required to render
 * @param {React.ReactNode} fallback - Component to show if no permission
 * @returns {React.Component}
 */
export const withPermission = (Component, permission, fallback = null) => {
  return (props) => (
    <PermissionGuard permission={permission} fallback={fallback}>
      <Component {...props} />
    </PermissionGuard>
  );
};
