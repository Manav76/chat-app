import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(email, password);
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDirectLogin = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      // Create form data for direct login
      const formData = new FormData();
      formData.append('email', email);
      
      const response = await fetch('http://localhost:8000/auth/direct-login', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Direct login failed');
      }
      
      const data = await response.json();
      
      // Store the token
      localStorage.setItem('token', data.access_token);
      
      // Navigate to chat - use replace to prevent going back to login
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(err.message || 'Direct login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          
          {/* Direct login button for testing */}
          <button 
            type="button" 
            className="auth-button direct-login-button"
            onClick={handleDirectLogin}
            disabled={isLoading || !email}
          >
            Direct Login (Testing)
          </button>
        </form>
        
        <div className="auth-link">
          Don't have an account? <Link to="/auth/register">Register</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 