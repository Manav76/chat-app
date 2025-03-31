import React from 'react';
import ReactMarkdown from 'react-markdown';
import './Message.css';

const Message = ({ message, isStreaming = false }) => {
  const { role, content } = message;
  
  return (
    <div className={`message ${role === 'user' ? 'user-message' : 'assistant-message'}`}>
      <div className="message-avatar">
        {role === 'user' ? '👤' : '🤖'}
      </div>
      <div className="message-content">
        <ReactMarkdown>{content}</ReactMarkdown>
        {isStreaming && <span className="cursor"></span>}
      </div>
    </div>
  );
};

export default Message; 