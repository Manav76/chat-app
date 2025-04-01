import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaPlus, FaTrash, FaEdit, FaComments } from 'react-icons/fa';
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
  


  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <h2><FaComments style={{ marginRight: '8px', color: '#e53e3e' }} /> Conversations</h2>
        <button 
          className="new-chat-button" 
          onClick={onNewSession}
          disabled={isLoading}
        >
          <FaPlus style={{ marginRight: '6px' }} /> New
        </button>
      </div>
      
      <div className="sessions-list">
        {isLoading ? (
          <div className="loading-indicator">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#a0a0a0' }}>
            No conversations yet
          </div>
        ) : (
          sessions.map((session) => (
            <div 
              key={session.id} 
              className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
              onClick={() => onSessionSelect(session)}
            >
              <div className="session-title">{session.title}</div>
              <div className="session-actions">
                <button 
                  className="session-action-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Implement edit functionality
                    alert('Edit functionality to be implemented');
                  }}
                >
                  <FaEdit />
                </button>
                <button 
                  className="session-action-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                >
                  <FaTrash />
                </button>
              </div>
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