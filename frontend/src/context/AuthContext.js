import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Check if user is logged in on mount
    const checkLoggedIn = async () => {
      if (token) {
        try {
          // For now, we'll just set a dummy user
          // Later, we'll make an API call to /auth/me
          setCurrentUser({
            id: '123',
            email: 'user@example.com'
          });
        } catch (error) {
          console.error('Error verifying token:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, [token]);

  const login = async (email, password) => {
    // This will be replaced with actual API call
    try {
      // Simulate API call
      const response = { token: 'dummy-token-123' };
      
      localStorage.setItem('token', response.token);
      setToken(response.token);
      setCurrentUser({
        id: '123',
        email: email
      });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email, password) => {
    // This will be replaced with actual API call
    try {
      // Simulate API call
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 