import { createContext, useContext, useState, useCallback } from 'react';

const RoomContext = createContext();

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};

export const RoomProvider = ({ children }) => {
  const [roomId, setRoomId] = useState(null);
  const [username, setUsername] = useState('');
  const [participants, setParticipants] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [messages, setMessages] = useState([]);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateParticipants = useCallback((newParticipants) => {
    setParticipants(newParticipants);
  }, []);

  const updateVideoUrl = useCallback((url) => {
    setVideoUrl(url);
  }, []);

  const leaveRoom = useCallback(() => {
    setRoomId(null);
    setParticipants([]);
    setVideoUrl('');
    setMessages([]);
  }, []);

  const value = {
    roomId,
    setRoomId,
    username,
    setUsername,
    participants,
    setParticipants,
    updateParticipants,
    videoUrl,
    setVideoUrl,
    updateVideoUrl,
    messages,
    addMessage,
    leaveRoom
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
};
