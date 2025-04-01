import React from 'react';
import { format } from 'date-fns';
import { FaRobot } from 'react-icons/fa';

const ChatHeader = ({ currentSession }) => {
  if (!currentSession) {
    return (
      <div className="chat-header">
        <h2>New Conversation</h2>
      </div>
    );
  }

  const formattedDate = currentSession.created_at 
    ? format(new Date(currentSession.created_at), 'MMM d, yyyy')
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