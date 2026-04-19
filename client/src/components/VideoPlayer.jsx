import { useEffect, useState, useRef } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../hooks/useSocket';

// Extract YouTube video ID
const getYouTubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Extract Vimeo video ID
const getVimeoId = (url) => {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
};

const VideoPlayer = () => {
  const { roomId, videoUrl, setVideoUrl, participants } = useRoom();
  const { updateVideo, videoStateChange, on, off } = useSocket();
  const [inputUrl, setInputUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const isSyncing = useRef(false);

  // Get video IDs
  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;
  const vimeoId = videoUrl ? getVimeoId(videoUrl) : null;

  // Generate embed URLs with sync parameters
  const getEmbedUrl = () => {
    if (youtubeId) {
      // YouTube embed with autoplay based on sync state
      const params = new URLSearchParams({
        autoplay: isPlaying ? '1' : '0',
        rel: '0',
        modestbranding: '1',
        playsinline: '1'
      });
      return `https://www.youtube.com/embed/${youtubeId}?${params}`;
    }
    if (vimeoId) {
      const params = new URLSearchParams({
        autoplay: isPlaying ? '1' : '0',
        playsinline: '1'
      });
      return `https://player.vimeo.com/video/${vimeoId}?${params}`;
    }
    return null;
  };

  // Handle video URL update
  const handleUpdateVideo = (e) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      updateVideo({ roomId, videoUrl: inputUrl.trim() });
      setVideoUrl(inputUrl.trim());
      setInputUrl('');
      setIsPlaying(false);
    }
  };

  // Manual play/pause handlers
  const handlePlay = () => {
    if (isSyncing.current) return;
    setIsPlaying(true);
    videoStateChange({
      roomId,
      state: { isPlaying: true, currentTime: 0 }
    });
  };

  const handlePause = () => {
    if (isSyncing.current) return;
    setIsPlaying(false);
    videoStateChange({
      roomId,
      state: { isPlaying: false, currentTime: 0 }
    });
  };

  // Listen for sync events
  useEffect(() => {
    const handleVideoStateSync = ({ isPlaying: shouldPlay }) => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      setIsPlaying(shouldPlay);
      setTimeout(() => {
        isSyncing.current = false;
      }, 300);
    };

    const handleVideoUpdated = ({ videoUrl: newUrl }) => {
      setVideoUrl(newUrl);
      setIsPlaying(false);
    };

    on('video-state-sync', handleVideoStateSync);
    on('video-updated', handleVideoUpdated);

    return () => {
      off('video-state-sync', handleVideoStateSync);
      off('video-updated', handleVideoUpdated);
    };
  }, [on, off, setVideoUrl]);

  const embedUrl = getEmbedUrl();

  return (
    <div className="video-player-container">
      <div className="video-header">
        <h3>Now Watching</h3>
        <div className="viewers">
          <span>👥 {participants.length} viewer{participants.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="player-wrapper">
        {embedUrl ? (
          <iframe
            key={embedUrl} // Force re-render when URL changes
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video Player"
          />
        ) : videoUrl ? (
          <div className="no-video">
            <div className="no-video-content">
              <span className="icon">⚠️</span>
              <p>Unsupported video URL</p>
              <p className="hint">Please use YouTube or Vimeo URLs</p>
            </div>
          </div>
        ) : (
          <div className="no-video">
            <div className="no-video-content">
              <span className="icon">🎬</span>
              <p>No video playing</p>
              <p className="hint">Enter a YouTube or Vimeo URL below</p>
            </div>
          </div>
        )}
      </div>

      {embedUrl && (
        <div className="video-controls">
          <button className="control-btn" onClick={handlePlay}>
            ▶️ Sync Play
          </button>
          <button className="control-btn" onClick={handlePause}>
            ⏸️ Sync Pause
          </button>
        </div>
      )}

      <form className="video-input-form" onSubmit={handleUpdateVideo}>
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Paste YouTube or Vimeo URL..."
        />
        <button type="submit" disabled={!inputUrl.trim()}>
          Load Video
        </button>
      </form>

      {videoUrl && (
        <div className="current-video">
          <span>Current: {videoUrl}</span>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
