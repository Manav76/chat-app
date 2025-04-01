import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import './Chat.css';

const Chat = () => {
  const { getAuthHeader} = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:8000/chat/sessions', {
          headers: getAuthHeader()
        });
        
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
          
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

  
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentSession) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:8000/chat/sessions/${currentSession.id}/messages`, {
          headers: getAuthHeader()
        });
        
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
  }, [currentSession, getAuthHeader]);

  const handleSessionSelect = (session) => {
    setCurrentSession(session);
  };

  const handleNewSession = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ title: 'New Conversation' })
      });
      
      if (response.ok) {
        const newSession = await response.json();
        setSessions([newSession, ...sessions]);
        setCurrentSession(newSession);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating new session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:8000/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      
      if (response.ok) {
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(updatedSessions);
        if (currentSession && currentSession.id === sessionId) {
          setCurrentSession(updatedSessions.length > 0 ? updatedSessions[0] : null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content) => {
    if (!currentSession) {
      try {
        const response = await fetch('http://localhost:8000/chat/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({ title: content.substring(0, 30) + (content.length > 30 ? '...' : '') })
        });
        
        if (response.ok) {
          const newSession = await response.json();
          setSessions([newSession, ...sessions]);
          setCurrentSession(newSession);
        } else {
          throw new Error('Failed to create session');
        }
      } catch (error) {
        console.error('Error creating session:', error);
        return;
      }
    }

    const userMessage = {
      id: 'temp-' + Date.now(),
      content,
      role: 'user',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    setStreamingMessage({
      id: 'streaming-' + Date.now(),
      content: '',
      role: 'assistant'
    });
    
    let finalMessageContent = '';
    let finalMessageId = null;
    
    try {
      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          message: content,
          session_id: currentSession?.id
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error: ${response.status}`, errorText);
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'content') {
              finalMessageContent += data.content;
              setStreamingMessage(prev => {
                if (!prev) return { id: 'streaming-' + Date.now(), content: data.content, role: 'assistant' };
                return { ...prev, content: prev.content + data.content };
              });
            } else if (data.type === 'message_id') {
              finalMessageId = data.message_id;
              console.log("Received message ID:", finalMessageId);
            } else if (data.type === 'error') {
              console.error('Stream error:', data.error);
              setStreamingMessage(prev => {
                if (!prev) return { id: 'streaming-' + Date.now(), content: 'Error: ' + data.error, role: 'assistant' };
                return { ...prev, content: prev.content + '\n\nError: ' + data.error };
              });
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e, line);
          }
        }
      }
      
      console.log("Stream complete. Adding final message with ID:", finalMessageId);
      
      if (finalMessageId) {
        setTimeout(() => {
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === finalMessageId);
            if (messageExists) {
              console.log("Message already exists in state, not adding again");
              return prev;
            }
            
            console.log("Adding message to state:", finalMessageId);
            return [
              ...prev,
              {
                id: finalMessageId,
                content: finalMessageContent,
                role: 'assistant',
                created_at: new Date().toISOString()
              }
            ];
          });
          setStreamingMessage(null);
        }, 100);
      } else {
        console.error("Missing messageId after streaming completed");
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      setStreamingMessage(prev => ({
        ...prev,
        content: `Error: ${error.message || 'Failed to get response from server'}`
      }));
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: 'error-' + Date.now(),
            content: `Error: ${error.message || 'Failed to get response from server'}`,
            role: 'assistant',
            created_at: new Date().toISOString()
          }
        ]);
        setStreamingMessage(null);
      }, 2000);
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
        <ChatHeader currentSession={currentSession} />
        
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

export default Chat; 