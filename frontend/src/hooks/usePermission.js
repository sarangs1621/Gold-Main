import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to check if the current user has a specific permission
 * @param {string} permission - The permission to check (e.g., 'users.create')
 * @returns {boolean} - True if user has the permission
 */
export const usePermission = (permission) => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // Admin always has all permissions
  if (user.role === 'admin') return true;
  
  // Check if user has the specific permission
  const userPermissions = user.permissions || [];
  return userPermissions.includes(permission);
};

/**
 * Hook to check if the current user has ANY of the specified permissions
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - True if user has at least one permission
 */
export const useAnyPermission = (permissions) => {
  const { user } = useAuth();
  
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  const userPermissions = user.permissions || [];
  return permissions.some(perm => userPermissions.includes(perm));
};

/**
 * Hook to check if the current user has ALL of the specified permissions
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - True if user has all permissions
 */
export const useAllPermissions = (permissions) => {
  const { user } = useAuth();
  
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  const userPermissions = user.permissions || [];
  return permissions.every(perm => userPermissions.includes(perm));
};

/**
 * Hook to get all permissions for the current user
 * @returns {string[]} - Array of permission strings
 */
export const useUserPermissions = () => {
  const { user } = useAuth();
  
  if (!user) return [];
  
  return user.permissions || [];
};

/**
 * Hook to check if user has a specific role
 * @param {string} role - The role to check ('admin', 'manager', 'staff')
 * @returns {boolean} - True if user has the role
 */
export const useRole = (role) => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  return user.role === role;
};

/**
 * Hook to check if user has permission for a module's action
 * @param {string} module - Module name (e.g., 'users', 'parties')
 * @param {string} action - Action name (e.g., 'view', 'create', 'delete')
 * @returns {boolean} - True if user has the permission
 */
export const useModulePermission = (module, action) => {
  return usePermission(`${module}.${action}`);
};
