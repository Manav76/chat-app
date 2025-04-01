import React, { useEffect, useRef } from 'react';
import Message from './Message';
import './ChatWindow.css';

const ChatWindow = ({ messages, streamingMessage, currentSession, isLoading }) => {
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  return (
    <div className="chat-window">
      {!currentSession && !isLoading && (
        <div className="empty-chat">
          <h2>Welcome to the Chat App</h2>
          <p>Select a chat from the sidebar or start a new conversation.</p>
        </div>
      )}
      
      {isLoading && !messages.length && (
        <div className="loading-messages">
          <div className="loading-spinner"></div>
          <p>Loading messages...</p>
        </div>
      )}
      
      {messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
      
      {streamingMessage && (
        <Message key={streamingMessage.id} message={streamingMessage} isStreaming={true} />
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow; 