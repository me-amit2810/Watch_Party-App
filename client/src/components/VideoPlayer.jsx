import { useRef, useEffect, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../hooks/useSocket';

// Load YouTube IFrame API
const loadYouTubeAPI = () => {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    document.body.appendChild(tag);
  });
};

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
  const playerContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const { roomId, videoUrl, setVideoUrl, participants } = useRoom();
  const { updateVideo, videoStateChange, on, off } = useSocket();
  
  const [inputUrl, setInputUrl] = useState('');
  const [isReady, setIsReady] = useState(false);
  const isSyncing = useRef(false);

  // Determine video type and ID
  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;
  const vimeoId = videoUrl ? getVimeoId(videoUrl) : null;
  const isYouTube = !!youtubeId;
  const isVimeo = !!vimeoId;

  // Initialize YouTube player
  useEffect(() => {
    if (!isYouTube || !youtubeId) return;

    let player = null;

    const initPlayer = async () => {
      const YT = await loadYouTubeAPI();
      
      player = new YT.Player(playerContainerRef.current, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            ytPlayerRef.current = event.target;
            setIsReady(true);
          },
          onStateChange: (event) => {
            if (isSyncing.current) return;
            
            // event.data: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=video cued
            if (event.data === 1) { // Playing
              videoStateChange({
                roomId,
                state: { isPlaying: true, currentTime: event.target.getCurrentTime() }
              });
            } else if (event.data === 2) { // Paused
              videoStateChange({
                roomId,
                state: { isPlaying: false, currentTime: event.target.getCurrentTime() }
              });
            }
          }
        }
      });
    };

    initPlayer();

    return () => {
      if (player && player.destroy) {
        player.destroy();
      }
      ytPlayerRef.current = null;
      setIsReady(false);
    };
  }, [isYouTube, youtubeId, roomId, videoStateChange]);

  // Listen for video state sync from server
  useEffect(() => {
    const handleVideoStateSync = ({ isPlaying: shouldPlay, currentTime }) => {
      if (!ytPlayerRef.current || isSyncing.current) return;
      
      isSyncing.current = true;
      
      const player = ytPlayerRef.current;
      const currentPlayerTime = player.getCurrentTime();
      
      // Sync time if difference is more than 2 seconds
      if (Math.abs(currentPlayerTime - currentTime) > 2) {
        player.seekTo(currentTime, true);
      }
      
      // Sync play/pause
      if (shouldPlay) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
      
      setTimeout(() => {
        isSyncing.current = false;
      }, 500);
    };

    const handleVideoUpdated = ({ videoUrl: newUrl }) => {
      setVideoUrl(newUrl);
      setIsReady(false);
    };

    on('video-state-sync', handleVideoStateSync);
    on('video-updated', handleVideoUpdated);

    return () => {
      off('video-state-sync', handleVideoStateSync);
      off('video-updated', handleVideoUpdated);
    };
  }, [on, off, setVideoUrl]);

  // Handle video URL update
  const handleUpdateVideo = (e) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      updateVideo({ roomId, videoUrl: inputUrl.trim() });
      setVideoUrl(inputUrl.trim());
      setInputUrl('');
      setIsReady(false);
    }
  };

  // Generate Vimeo embed URL
  const getVimeoEmbedUrl = () => {
    if (isVimeo) {
      return `https://player.vimeo.com/video/${vimeoId}`;
    }
    return null;
  };

  return (
    <div className="video-player-container">
      <div className="video-header">
        <h3>Now Watching</h3>
        <div className="viewers">
          <span>👥 {participants.length} viewer{participants.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="player-wrapper">
        {isYouTube ? (
          <div ref={playerContainerRef} style={{ width: '100%', height: '100%' }} />
        ) : isVimeo ? (
          <iframe
            src={getVimeoEmbedUrl()}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
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

      <form className="video-input-form" onSubmit={handleUpdateVideo}>
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Paste YouTube or Vimeo URL..."
        />
        <button 
          type="submit" 
          disabled={!inputUrl.trim()}
        >
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
