import { useEffect, useRef, useState, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export const useWebRTC = (socket, roomId) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isInCall, setIsInCall] = useState(false);
  const peerConnections = useRef(new Map());
  const localStreamRef = useRef(null);

  // Get local media stream
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Create peer connection for a specific peer
  const createPeerConnection = useCallback((peerId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(peerId, remoteStream)));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.sendICECandidate({
          roomId,
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
        });
        peerConnections.current.delete(peerId);
      }
    };

    peerConnections.current.set(peerId, pc);
    return pc;
  }, [socket, roomId]);

  // Initiate call to a peer
  const callPeer = useCallback(async (peerId) => {
    const pc = createPeerConnection(peerId);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.sendWebRTCOffer({
        roomId,
        targetId: peerId,
        offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [createPeerConnection, socket, roomId]);

  // Join video call
  const joinCall = useCallback(async () => {
    try {
      await getLocalStream();
      setIsInCall(true);
      socket.joinVideoCall({ roomId });
    } catch (error) {
      console.error('Error joining call:', error);
    }
  }, [getLocalStream, socket, roomId]);

  // Leave video call
  const leaveCall = useCallback(() => {
    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsInCall(false);
    
    socket.leaveVideoCall({ roomId });
  }, [socket, roomId]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }, []);

  // Handle incoming WebRTC offer
  const handleOffer = useCallback(async ({ senderId, offer }) => {
    let pc = peerConnections.current.get(senderId);
    if (!pc) {
      pc = createPeerConnection(senderId);
    }

    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.sendWebRTCAnswer({
        roomId,
        targetId: senderId,
        answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createPeerConnection, socket, roomId]);

  // Handle incoming WebRTC answer
  const handleAnswer = useCallback(async ({ senderId, answer }) => {
    const pc = peerConnections.current.get(senderId);
    if (pc) {
      try {
        await pc.setRemoteDescription(answer);
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }, []);

  // Handle incoming ICE candidate
  const handleICECandidate = useCallback(async ({ senderId, candidate }) => {
    const pc = peerConnections.current.get(senderId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }, []);

  // Handle new user joining video call
  const handleUserJoinedVideo = useCallback((peerId) => {
    if (isInCall && peerId !== socket.getSocketId()) {
      callPeer(peerId);
    }
  }, [isInCall, socket, callPeer]);

  // Handle user leaving video call
  const handleUserLeftVideo = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
  }, []);

  // Set up socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleICECandidate);
    socket.on('user-joined-video', ({ socketId }) => handleUserJoinedVideo(socketId));
    socket.on('user-left-video', ({ socketId }) => handleUserLeftVideo(socketId));

    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleICECandidate);
      socket.off('user-joined-video');
      socket.off('user-left-video');
    };
  }, [socket, handleOffer, handleAnswer, handleICECandidate, handleUserJoinedVideo, handleUserLeftVideo]);

  return {
    localStream,
    remoteStreams,
    isInCall,
    joinCall,
    leaveCall,
    toggleAudio,
    toggleVideo
  };
};
