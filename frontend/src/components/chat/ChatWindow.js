import React, { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import {FaRobot } from 'react-icons/fa';
import './ChatWindow.css';

const ChatWindow = ({ messages, streamingMessage, currentSession, isLoading }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return '';
    }
  };

  if (!currentSession) {
    return (
      <div className="chat-window">
        <div className="empty-chat">
          <FaRobot size={48} color="#e53e3e" />
          <h3>Welcome to the AI Chat</h3>
          <p>
            Start a new conversation or select an existing one from the sidebar to begin chatting.
          </p>
        </div>
      </div>
    );
  }


  if (isLoading && messages.length === 0 && !streamingMessage) {
    return (
      <div className="chat-window">
        <div className="loading-indicator">
          Loading messages...
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {messages.map((message) => (
        <div 
          key={message.id} 
          className={`message-container ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
        >
          <div className="message-bubble">
            <div className="message-content">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
          <div className="message-meta">
            {message.role === 'user' ? 'You' : 'AI Assistant'}
            <span className="message-time">{formatTime(message.created_at)}</span>
          </div>
        </div>
      ))}
      
      {/* Streaming message */}
      {streamingMessage && (
        <div className="message-container assistant-message">
          <div className="message-bubble">
            <div className="message-content">
              <ReactMarkdown>{streamingMessage.content || ''}</ReactMarkdown>
            </div>
          </div>
          <div className="message-meta">
            AI Assistant
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow; 