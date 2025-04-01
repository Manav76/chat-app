import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from './NotificationContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showWarning, showError } = useNotifications();
  
  // Reference to the session expiration timer
  const sessionTimerRef = useRef(null);
  // Reference to the warning timer
  const warningTimerRef = useRef(null);
  
  const SESSION_DURATION = 30 * 60 * 1000;
  const WARNING_BEFORE_EXPIRATION = 5 * 60 * 1000;

  // Define logout function first to avoid circular dependencies
  const logout = useCallback(() => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    
    localStorage.removeItem('token');
    setUser(null);
    navigate('/auth/login');
  }, [navigate]);

  // Function to start session timer - using useCallback to memoize
  const startSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      showWarning('Your session will expire soon. Please save your work.', {
        title: 'Session Expiring',
        duration: 10000, // Show for 10 seconds
      });
    }, SESSION_DURATION - WARNING_BEFORE_EXPIRATION);
    sessionTimerRef.current = setTimeout(() => {
      showError('Your session has expired. Please log in again.', {
        title: 'Session Expired',
        persistent: true, 
      });
      logout();
    }, SESSION_DURATION);
  }, [showWarning, showError, logout, SESSION_DURATION, WARNING_BEFORE_EXPIRATION]);


  const resetSessionTimer = useCallback(() => {
    if (user) {
      startSessionTimer();
    }
  }, [user, startSessionTimer]); 


  useEffect(() => {
    if (user) {
      const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart'];
      
      const handleUserActivity = () => {
        resetSessionTimer();
      };
      
      activityEvents.forEach(event => {
        window.addEventListener(event, handleUserActivity);
      });
      
      startSessionTimer();
      
      return () => {
        activityEvents.forEach(event => {
          window.removeEventListener(event, handleUserActivity);
        });
        
        if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      };
    }
  }, [user, resetSessionTimer, startSessionTimer]); 

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('http://localhost:8000/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);

            startSessionTimer();
          } else {
            localStorage.removeItem('token');
            showError('Your session has expired. Please log in again.', {
              title: 'Session Expired',
            });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, [startSessionTimer, showError]); 
  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }
      
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('expires_at', data.expires_at);
      setUser(data.user);
      const expiresAt = new Date(data.expires_at).getTime();
      const now = new Date().getTime();
      const timeUntilExpiration = Math.max(0, expiresAt - now);
      const warningTime = Math.max(0, timeUntilExpiration - WARNING_BEFORE_EXPIRATION);
      
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      
      if (warningTime > 0) {
        warningTimerRef.current = setTimeout(() => {
          showWarning('Your session will expire soon. Please save your work.', {
            title: 'Session Expiring',
            duration: 10000,
          });
        }, warningTime);
      }
      
      if (timeUntilExpiration > 0) {
        sessionTimerRef.current = setTimeout(() => {
          showError('Your session has expired. Please log in again.', {
            title: 'Session Expired',
            persistent: true,
          });
          logout();
        }, timeUntilExpiration);
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }
      
      const data = await response.json();
      
      // Save token and user data
      localStorage.setItem('token', data.access_token);
      setUser(data.user);
      
      // Start session timer
      startSessionTimer();
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout,
      getAuthHeader,
      isAuthenticated: !!user,
      resetSessionTimer
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider; 