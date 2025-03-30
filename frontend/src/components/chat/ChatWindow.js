import React, { useRef, useEffect } from 'react';

const ChatWindow = ({ messages, currentSession }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!currentSession) {
    return (
      <div className="chat-window empty-chat">
        <div className="welcome-message">
          <h3>Welcome to the Chat App</h3>
          <p>Select an existing chat or start a new conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {messages.length === 0 ? (
        <div className="empty-chat">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">{message.content}</div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow; 