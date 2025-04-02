import React from 'react';
import { FaRobot } from 'react-icons/fa';

const ChatHeader = ({ currentSession }) => {
  if (!currentSession) {
    return (
      <div className="chat-header">
        <h2>New Conversation</h2>
      </div>
    );
  }

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      
      // Format the date in IST timezone
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const formattedDate = currentSession.created_at 
    ? formatDate(currentSession.created_at)
    : '';

  return (
    <div className="chat-header">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <FaRobot style={{ marginRight: '10px', color: '#e53e3e' }} />
        <h2>{currentSession.title}</h2>
      </div>
      <div style={{ fontSize: '14px', color: '#a0a0a0' }}>
        {formattedDate}
      </div>
    </div>
  );
};

export default ChatHeader; 