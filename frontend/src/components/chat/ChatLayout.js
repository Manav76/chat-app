import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import ChatWindow from './ChatWindow';
import MessageInput from './MessageInput';
import './Chat.css';

const ChatLayout = () => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Fetch chat sessions (will be replaced with API call)
    const fetchSessions = async () => {
      const dummySessions = [
        { id: '1', title: 'Chat about React', created_at: '2023-05-15T10:30:00Z' },
        { id: '2', title: 'FastAPI Discussion', created_at: '2023-05-14T14:20:00Z' },
        { id: '3', title: 'Project Planning', created_at: '2023-05-13T09:15:00Z' }
      ];
      setSessions(dummySessions);
    };

    fetchSessions();
  }, []);

  useEffect(() => {
    // Fetch messages for current session (will be replaced with API call)
    const fetchMessages = async () => {
      if (!currentSession) return;
      const dummyMessages = [
        { id: '1', role: 'user', content: 'Hello, how can I learn React?', timestamp: '2023-05-15T10:30:00Z' },
        { id: '2', role: 'assistant', content: 'React is a JavaScript library for building user interfaces. To get started, I recommend the official React documentation and tutorials.', timestamp: '2023-05-15T10:30:30Z' },
        { id: '3', role: 'user', content: 'What about state management?', timestamp: '2023-05-15T10:31:00Z' },
        { id: '4', role: 'assistant', content: 'For state management in React, you can use the built-in useState and useContext hooks for simpler applications. For more complex state management, libraries like Redux or Zustand are popular options.', timestamp: '2023-05-15T10:31:30Z' }
      ];
      setMessages(dummyMessages);
    };

    fetchMessages();
  }, [currentSession]);

  const handleSessionSelect = (session) => {
    setCurrentSession(session);
  };

  const handleNewSession = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      created_at: new Date().toISOString()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSession(newSession);
    setMessages([]);
  };

  const handleDeleteSession = (sessionId) => {
    // Remove the session from the list
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    setSessions(updatedSessions);
    
    // If the current session is deleted, clear it
    if (currentSession && currentSession.id === sessionId) {
      setCurrentSession(null);
      setMessages([]);
    }
  };

  const handleSendMessage = (content) => {
    if (!currentSession) {
      handleNewSession();
    }
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    
    setMessages([...messages, userMessage]);
    
    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a simulated response. In the real app, this would come from your backend API.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <div className="chat-layout">
      <Sidebar 
        sessions={sessions} 
        currentSession={currentSession}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />
      <div className="chat-main">
        <ChatHeader 
          currentSession={currentSession} 
        />
        <ChatWindow 
          messages={messages} 
          currentSession={currentSession}
        />
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default ChatLayout; 