import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const createRoom = useCallback((data, callback) => {
    socketRef.current?.emit('create-room', data, callback);
  }, []);

  const joinRoom = useCallback((data, callback) => {
    socketRef.current?.emit('join-room', data, callback);
  }, []);

  const updateVideo = useCallback((data) => {
    socketRef.current?.emit('update-video', data);
  }, []);

  const videoStateChange = useCallback((data) => {
    socketRef.current?.emit('video-state-change', data);
  }, []);

  const sendMessage = useCallback((data) => {
    socketRef.current?.emit('chat-message', data);
  }, []);

  const sendWebRTCOffer = useCallback((data) => {
    socketRef.current?.emit('webrtc-offer', data);
  }, []);

  const sendWebRTCAnswer = useCallback((data) => {
    socketRef.current?.emit('webrtc-answer', data);
  }, []);

  const sendICECandidate = useCallback((data) => {
    socketRef.current?.emit('webrtc-ice-candidate', data);
  }, []);

  const joinVideoCall = useCallback((data) => {
    socketRef.current?.emit('join-video-call', data);
  }, []);

  const leaveVideoCall = useCallback((data) => {
    socketRef.current?.emit('leave-video-call', data);
  }, []);

  const on = useCallback((event, callback) => {
    socketRef.current?.on(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    socketRef.current?.off(event, callback);
  }, []);

  const getSocketId = useCallback(() => {
    return socketRef.current?.id;
  }, []);

  return {
    socket: socketRef.current,
    createRoom,
    joinRoom,
    updateVideo,
    videoStateChange,
    sendMessage,
    sendWebRTCOffer,
    sendWebRTCAnswer,
    sendICECandidate,
    joinVideoCall,
    leaveVideoCall,
    on,
    off,
    getSocketId
  };
};
