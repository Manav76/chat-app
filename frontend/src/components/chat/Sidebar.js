import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const Sidebar = ({ sessions, currentSession, onSessionSelect, onNewSession, onDeleteSession }) => {
  const { logout } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleDeleteClick = (e, session) => {
    e.stopPropagation(); // Prevent triggering the session selection
    setSessionToDelete(session);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete.id);
      setShowDeleteModal(false);
      setSessionToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSessionToDelete(null);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Chat Sessions</h2>
        <button className="new-chat-btn" onClick={onNewSession}>
          New Chat
        </button>
      </div>
      
      <div className="sessions-list">
        {sessions.length === 0 ? (
          <div className="no-sessions">No chat sessions yet</div>
        ) : (
          sessions.map(session => (
            <div 
              key={session.id}
              className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
              onClick={() => onSessionSelect(session)}
            >
              <div className="session-content">
                <div className="session-title">{session.title}</div>
                <div className="session-date">{formatDate(session.created_at)}</div>
              </div>
              <button 
                className="delete-session-btn"
                onClick={(e) => handleDeleteClick(e, session)}
                aria-label="Delete session"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
      
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>

      {showDeleteModal && (
        <DeleteConfirmationModal 
          session={sessionToDelete}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
};

export default Sidebar; 