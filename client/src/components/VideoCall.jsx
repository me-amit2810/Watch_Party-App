import { useEffect, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';

const VideoCall = () => {
  const { roomId, username, participants } = useRoom();
  const socket = useSocket();
  const {
    localStream,
    remoteStreams,
    isInCall,
    joinCall,
    leaveCall,
    toggleAudio,
    toggleVideo
  } = useWebRTC(socket, roomId);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const handleJoinCall = () => {
    joinCall();
  };

  const handleLeaveCall = () => {
    leaveCall();
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const handleToggleAudio = () => {
    const enabled = toggleAudio();
    setIsMuted(!enabled);
  };

  const handleToggleVideo = () => {
    const enabled = toggleVideo();
    setIsVideoOff(!enabled);
  };

  return (
    <div className="video-call-container">
      <div className="video-call-header">
        <h3>Video Call</h3>
        {!isInCall ? (
          <button className="btn-join" onClick={handleJoinCall}>
            📹 Join Call
          </button>
        ) : (
          <button className="btn-leave" onClick={handleLeaveCall}>
            📞 Leave
          </button>
        )}
      </div>

      {isInCall && (
        <div className="video-grid">
          {/* Local video */}
          <div className="video-item local">
            <video
              ref={(ref) => {
                if (ref && localStream) {
                  ref.srcObject = localStream;
                }
              }}
              autoPlay
              muted
              playsInline
              className={isVideoOff ? 'video-off' : ''}
            />
            <div className="video-label">
              {username} (You)
              {isMuted && <span className="muted-indicator">🔇</span>}
            </div>
            {isVideoOff && (
              <div className="video-off-overlay">
                <span>📷</span>
              </div>
            )}
          </div>

          {/* Remote videos */}
          {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
            const participant = participants.find(p => p.socketId === peerId);
            const peerName = participant?.username || 'Unknown';
            
            return (
              <div key={peerId} className="video-item remote">
                <video
                  ref={(ref) => {
                    if (ref) {
                      ref.srcObject = stream;
                    }
                  }}
                  autoPlay
                  playsInline
                />
                <div className="video-label">{peerName}</div>
              </div>
            );
          })}
        </div>
      )}

      {isInCall && (
        <div className="call-controls">
          <button
            className={`control-btn ${isMuted ? 'active' : ''}`}
            onClick={handleToggleAudio}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button
            className={`control-btn ${isVideoOff ? 'active' : ''}`}
            onClick={handleToggleVideo}
            title={isVideoOff ? 'Turn on video' : 'Turn off video'}
          >
            {isVideoOff ? '📷' : '📹'}
          </button>
        </div>
      )}

      {!isInCall && participants.length > 1 && (
        <div className="call-invite">
          <p>Join the video call to see {participants.length - 1} other participant(s)</p>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
