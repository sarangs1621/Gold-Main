import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';


// Helper function to get CSRF token from cookies
const getCsrfToken = () => {
  const name = 'csrf_token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
};

// Create ONE axios instance with baseURL (WITHOUT /api suffix)
const API = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true
});

// Add request interceptor to attach JWT token and CSRF token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('🔍 API Request Interceptor - Token present:', !!token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header added');
    } else {
      console.warn('⚠️ No token found in localStorage');
    }
    
    // Add CSRF token for state-changing methods
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
        console.log('✅ CSRF token added');
      } else {
        console.warn('⚠️ No CSRF token found in cookies');
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to log errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API Error Response:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code
    });
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    try {
      // Check if token exists before calling /me
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping auth check');
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      console.log('Token found, fetching user data...');
      const response = await API.get('/api/auth/me', {
        timeout: 5000 // 5 second timeout
      });
      console.log('User data fetched successfully');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
    } finally {
      console.log('Auth check complete, setting loading to false');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Try to fetch user on mount if token exists
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (username, password) => {
    // Await POST /api/auth/login
    const response = await API.post('/api/auth/login', { username, password });
    const { access_token, user: userData } = response.data;
    
    // Store token FIRST using localStorage
    localStorage.setItem('token', access_token);
    
    // THEN set user and isAuthenticated
    setUser(userData);
    setIsAuthenticated(true);
    
    return userData;
  };

  const logout = async () => {
    try {
      // Call backend logout to clear cookies
      await API.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
    }
  };

  const register = async (userData) => {
    await API.post('/api/auth/register', userData);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const userPermissions = user.permissions || [];
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const userPermissions = user.permissions || [];
    return permissions.some(perm => userPermissions.includes(perm));
  };

  const hasAllPermissions = (permissions) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const userPermissions = user.permissions || [];
    return permissions.every(perm => userPermissions.includes(perm));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated,
      login, 
      logout, 
      register, 
      loading,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export { API };