import { useState } from 'react';
import { RoomProvider } from './context/RoomContext';
import Lobby from './components/Lobby';
import Room from './components/Room';
import './App.css';

function App() {
  const [inRoom, setInRoom] = useState(false);

  const handleEnterRoom = () => {
    setInRoom(true);
  };

  const handleLeaveRoom = () => {
    setInRoom(false);
  };

  return (
    <RoomProvider>
      <div className="app">
        {inRoom ? (
          <Room onLeave={handleLeaveRoom} />
        ) : (
          <Lobby onEnterRoom={handleEnterRoom} />
        )}
      </div>
    </RoomProvider>
  );
}

export default App;
