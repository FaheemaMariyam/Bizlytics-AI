import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, BarChart2, X, Bot, User } from 'lucide-react';
import api from '../../utils/api';
import analyticsService from '../../services/analyticsService';
import './AIChat.css';

const AIChat = () => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: 'Hello! I am your Bizlytics AI Assistant. How can I help you with your HR data today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedFile) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText,
      file: selectedFile ? selectedFile.name : null
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSelectedFile(null);
    setIsLoading(true);

    try {
      // If there's a file, upload it using the existing service
      if (selectedFile) {
        await analyticsService.uploadFile(selectedFile);
      }

      const response = await api.post('/ai/chat', { message: userMessage.text || `Uploaded file: ${selectedFile?.name}` });
      
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        text: response.data.reply
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: "I'm sorry, I encountered an error. Please try again later.",
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const toggleChat = () => setIsOpen(!isOpen);

  if (!isOpen) {
    return (
      <button className="ai-chat-launcher" onClick={toggleChat}>
        <Bot size={28} />
      </button>
    );
  }

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <h3><Bot size={20} /> AI Insights</h3>
        <button className="ai-action-btn" onClick={toggleChat}>
          <X size={20} />
        </button>
      </div>

      <div className="ai-chat-history" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-message ${msg.type}`}>
            <div className="ai-message-content">
              {msg.text}
              {msg.file && (
                <div className="ai-attachment-preview">
                  <Paperclip size={14} /> {msg.file}
                </div>
              )}
              {msg.type === 'ai' && msg.text.includes('```chart') && (
                <button 
                    className="ai-chart-placeholder-btn"
                    onClick={() => alert("Chart rendering will be enabled once backend verification is complete!")}
                >
                  <BarChart2 size={16} /> View Visualization
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-message ai">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      <div className="ai-chat-input-area">
        {selectedFile && (
          <div className="ai-attachment-preview">
            <Paperclip size={14} /> {selectedFile.name}
            <button onClick={() => setSelectedFile(null)} style={{background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto'}}>
              <X size={14} />
            </button>
          </div>
        )}
        <div className="ai-input-wrapper">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{display: 'none'}} 
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls,.json"
          />
          <button className="ai-action-btn" onClick={() => fileInputRef.current.click()}>
            <Paperclip size={20} />
          </button>
          <input 
            type="text" 
            placeholder="Ask anything about your data..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button className="ai-action-btn ai-send-btn" onClick={handleSendMessage}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
