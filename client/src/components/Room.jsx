import { useEffect, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../hooks/useSocket';
import VideoPlayer from './VideoPlayer';
import Chat from './Chat';
import VideoCall from './VideoCall';

const Room = ({ onLeave }) => {
  const { roomId, username, participants, updateParticipants, leaveRoom } = useRoom();
  const { on, off } = useSocket();
  const [showCopied, setShowCopied] = useState(false);

  // Listen for participant updates
  useEffect(() => {
    const handleUserJoined = ({ username: joinedUser, participants: updatedParticipants }) => {
      updateParticipants(updatedParticipants);
    };

    const handleUserLeft = ({ participants: updatedParticipants }) => {
      updateParticipants(updatedParticipants);
    };

    on('user-joined', handleUserJoined);
    on('user-left', handleUserLeft);

    return () => {
      off('user-joined', handleUserJoined);
      off('user-left', handleUserLeft);
    };
  }, [on, off, updateParticipants]);

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <div className="room-container">
      <header className="room-header">
        <div className="room-info">
          <h2>Watchyyy</h2>
          <div className="room-id-container">
            <span className="room-label">Room:</span>
            <code className="room-id" onClick={copyRoomId} title="Click to copy">
              {roomId}
            </code>
            {showCopied && <span className="copied-tooltip">Copied!</span>}
          </div>
        </div>
        <div className="room-actions">
          <div className="participants-list">
            <span className="participants-icon">👥</span>
            <span className="participants-count">{participants.length}</span>
            <div className="participants-dropdown">
              {participants.map((p) => (
                <div key={p.socketId} className="participant-item">
                  {p.username} {p.username === username ? '(You)' : ''}
                </div>
              ))}
            </div>
          </div>
          <button className="btn-leave-room" onClick={handleLeave}>
            Leave Room
          </button>
        </div>
      </header>

      <main className="room-main">
        <div className="video-section">
          <VideoPlayer />
          <VideoCall />
        </div>
        <div className="chat-section">
          <Chat />
        </div>
      </main>
    </div>
  );
};

export default Room;
