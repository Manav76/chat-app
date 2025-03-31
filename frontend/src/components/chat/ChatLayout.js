import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import ChatWindow from './ChatWindow';
import MessageInput from './MessageInput';
import { useAuth } from '../../context/AuthContext';
import './Chat.css';

const ChatLayout = () => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState(null);
  
  const { getAuthHeader } = useAuth();
  const eventSourceRef = useRef(null);

  // Fetch chat sessions
  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:8000/chat/sessions', {
          headers: getAuthHeader()
        });
        
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
          
          // If there are sessions and no current session is selected, select the first one
          if (data.length > 0 && !currentSession) {
            setCurrentSession(data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [getAuthHeader, currentSession]);

  // Fetch messages for the current session
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentSession) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/chat/sessions/${currentSession.id}`, {
          headers: getAuthHeader()
        });
        
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [currentSession, getAuthHeader]);

  // Handle session selection
  const handleSessionSelect = (session) => {
    setCurrentSession(session);
  };

  // Handle new session creation
  const handleNewSession = async () => {
    try {
      const response = await fetch('http://localhost:8000/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          title: 'New Chat'
        })
      });
      
      if (response.ok) {
        const newSession = await response.json();
        setSessions([newSession, ...sessions]);
        setCurrentSession(newSession);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  // Handle session deletion
  const handleDeleteSession = async (sessionId) => {
    try {
      const response = await fetch(`http://localhost:8000/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      
      if (response.ok) {
        // Remove the session from the list
        const updatedSessions = sessions.filter(session => session.id !== sessionId);
        setSessions(updatedSessions);
        
        // If the current session was deleted, select another one or set to null
        if (currentSession && currentSession.id === sessionId) {
          setCurrentSession(updatedSessions.length > 0 ? updatedSessions[0] : null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (content) => {
    if (!content.trim()) return;
    
    // Add user message to the UI immediately
    const userMessage = {
      id: `temp-${Date.now()}`,
      content,
      role: 'user',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Initialize streaming message
    const streamingMessageId = `streaming-${Date.now()}`;
    setStreamingMessage({
      id: streamingMessageId,
      content: '',
      role: 'assistant',
      created_at: new Date().toISOString()
    });
    
    // Close any existing event source
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    try {
      console.log('Starting streaming request...');
      // Start streaming response
      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          message: content,
          session_id: currentSession ? currentSession.id : null
        })
      });
      
      if (!response.ok) {
        console.error('Stream response not OK:', response.status);
        throw new Error('Failed to send message');
      }
      
      console.log('Stream response OK, starting reader...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let sessionId = null;
      let messageId = null;
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          break;
        }
        
        const chunk = decoder.decode(value);
        console.log('Received chunk:', chunk);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            console.log('Parsed data:', data);
            
            if (data.type === 'session_id') {
              sessionId = data.session_id;
              console.log('Received session ID:', sessionId);
              
              // If this is a new session, update the current session
              if (!currentSession) {
                // Fetch the new session details
                console.log('Fetching new session details...');
                const sessionResponse = await fetch(`http://localhost:8000/chat/sessions/${sessionId}`, {
                  headers: getAuthHeader()
                });
                
                if (sessionResponse.ok) {
                  const sessionData = await sessionResponse.json();
                  console.log('Session data:', sessionData);
                  setCurrentSession(sessionData);
                  setSessions(prev => [sessionData, ...prev]);
                } else {
                  console.error('Failed to fetch session details:', sessionResponse.status);
                }
              }
            } else if (data.type === 'content') {
              // Update streaming message content
              setStreamingMessage(prev => ({
                ...prev,
                content: prev ? prev.content + data.content : data.content
              }));
            } else if (data.type === 'message_id') {
              messageId = data.message_id;
              console.log('Received message ID:', messageId);
            } else if (data.type === 'error') {
              console.error('Stream error:', data.error);
              throw new Error(data.error);
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e, line);
          }
        }
      }
      
      // When streaming is complete, replace the streaming message with the final message
      if (messageId) {
        console.log('Updating message with final ID:', messageId);
        setStreamingMessage(null);
        
        // Fetch the complete message to ensure we have the correct content
        const messageResponse = await fetch(`http://localhost:8000/chat/sessions/${sessionId}`, {
          headers: getAuthHeader()
        });
        
        if (messageResponse.ok) {
          const sessionData = await messageResponse.json();
          console.log('Final session data:', sessionData);
          setMessages(sessionData.messages || []);
        } else {
          console.error('Failed to fetch final messages:', messageResponse.status);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add an error message
      setStreamingMessage(null);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: `Error: ${error.message || 'Failed to get a response. Please try again.'}`,
          role: 'assistant',
          created_at: new Date().toISOString()
        }
      ]);
    }
  };

  return (
    <div className="chat-layout">
      <Sidebar 
        sessions={sessions}
        currentSession={currentSession}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        isLoading={isLoading}
      />
      <div className="chat-main">
        <ChatHeader 
          currentSession={currentSession} 
        />
        <ChatWindow 
          messages={messages} 
          streamingMessage={streamingMessage}
          currentSession={currentSession}
          isLoading={isLoading}
        />
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default ChatLayout; 