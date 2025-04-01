import React, { useState } from 'react';
import './MessageInput.css';

const MessageInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await onSendMessage(message);
      setMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="message-input-container">
      <form onSubmit={handleSubmit} className="message-form">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          className="message-textarea"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={isSubmitting}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!message.trim() || isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default MessageInput; 