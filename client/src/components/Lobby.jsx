import { useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../hooks/useSocket';

const Lobby = ({ onEnterRoom }) => {
  const [mode, setMode] = useState('join'); // 'join' or 'create'
  const [roomIdInput, setRoomIdInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setRoomId, setUsername, setVideoUrl } = useRoom();
  const { createRoom, joinRoom } = useSocket();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    createRoom(
      { username: usernameInput.trim(), videoUrl: videoUrlInput.trim() },
      (response) => {
        setLoading(false);
        if (response.success) {
          setRoomId(response.roomId);
          setUsername(usernameInput.trim());
          setVideoUrl(videoUrlInput.trim());
          onEnterRoom();
        } else {
          setError(response.error || 'Failed to create room');
        }
      }
    );
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!roomIdInput.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setLoading(true);
    setError('');

    joinRoom(
      { roomId: roomIdInput.trim(), username: usernameInput.trim() },
      (response) => {
        setLoading(false);
        if (response.success) {
          setRoomId(roomIdInput.trim());
          setUsername(usernameInput.trim());
          setVideoUrl(response.room.videoUrl || '');
          onEnterRoom();
        } else {
          setError(response.error || 'Failed to join room');
        }
      }
    );
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1>Watchyyy</h1>
        <p className="subtitle">Watch videos together with friends</p>

        <div className="mode-toggle">
          <button
            className={mode === 'join' ? 'active' : ''}
            onClick={() => setMode('join')}
          >
            Join Room
          </button>
          <button
            className={mode === 'create' ? 'active' : ''}
            onClick={() => setMode('create')}
          >
            Create Room
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {mode === 'join' ? (
          <form onSubmit={handleJoinRoom}>
            <div className="form-group">
              <label htmlFor="username">Your Name</label>
              <input
                type="text"
                id="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label htmlFor="roomId">Room ID</label>
              <input
                type="text"
                id="roomId"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="Enter room ID"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label htmlFor="username">Your Name</label>
              <input
                type="text"
                id="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label htmlFor="videoUrl">
                Video URL (YouTube/Vimeo) - Optional
              </label>
              <input
                type="url"
                id="videoUrl"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        )}

        <div className="features">
          <div className="feature">
            <span>🎬</span>
            <p>Sync Video Playback</p>
          </div>
          <div className="feature">
            <span>💬</span>
            <p>Real-time Chat</p>
          </div>
          <div className="feature">
            <span>📹</span>
            <p>Video Calling</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
