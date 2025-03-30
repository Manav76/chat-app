import React from 'react';

const ChatHeader = ({ currentSession }) => {
  return (
    <div className="chat-header">
      <h2>{currentSession ? currentSession.title : 'Select or start a new chat'}</h2>
    </div>
  );
};

export default ChatHeader; 