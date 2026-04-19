import { useState, useRef, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../hooks/useSocket';

const Chat = () => {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);
  const { roomId, username, messages, addMessage, participants } = useRoom();
  const { sendMessage, on, off } = useSocket();

  // Listen for incoming messages
  useEffect(() => {
    const handleMessage = (messageData) => {
      addMessage(messageData);
    };

    on('chat-message', handleMessage);

    return () => {
      off('chat-message', handleMessage);
    };
  }, [on, off, addMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    sendMessage({
      roomId,
      message: messageInput.trim(),
      username
    });

    setMessageInput('');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat</h3>
        <span className="participant-count">
          {participants.length} online
        </span>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet</p>
            <p className="hint">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.username === username ? 'own' : ''}`}
            >
              <div className="message-header">
                <span className="username">{msg.username}</span>
                <span className="timestamp">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="message-content">{msg.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
        />
        <button type="submit" disabled={!messageInput.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
