import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ 
  sessions, 
  currentSession, 
  onSessionSelect, 
  onNewSession, 
  onDeleteSession,
  isLoading 
}) => {
  const { user, logout } = useAuth();
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Chat Sessions</h2>
        <button 
          className="new-chat-button"
          onClick={onNewSession}
        >
          New Chat
        </button>
      </div>
      
      <div className="sessions-list">
        {isLoading && !sessions.length ? (
          <div className="loading-sessions">
            <div className="loading-spinner"></div>
            <p>Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="no-sessions">
            <p>No chat sessions yet.</p>
            <p>Start a new chat to begin!</p>
          </div>
        ) : (
          sessions.map(session => (
            <div 
              key={session.id}
              className={`session-item ${currentSession && currentSession.id === session.id ? 'active' : ''}`}
              onClick={() => onSessionSelect(session)}
            >
              <div className="session-info">
                <div className="session-title">{session.title}</div>
                <div className="session-date">{formatDate(session.created_at)}</div>
              </div>
              <button 
                className="delete-session-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">👤</div>
          <div className="user-name">{user?.username || 'User'}</div>
        </div>
        <button 
          className="logout-button"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 