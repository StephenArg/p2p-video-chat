import React, { useState, useEffect } from 'react';
import './App.css';
import VideoChat from './components/VideoChat';
import CreateRoom from './components/CreateRoom';
import Header from './components/Header';
import { setRoomIdInUrl } from './utils';


function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const [roomId, setRoomId] = useState(urlParams.get('id') || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateRoom, setIsCreateRoom] = useState(false);

  const handleSetRoomId = (roomId) => {
    setIsCreateRoom(roomId === null);
    setRoomId(roomId);
    setRoomIdInUrl(roomId);
  };

  return (
    <section className="wrapper">
      <div className="content">
        <Header />
        {isCreateRoom ?
          <CreateRoom setRoomId={handleSetRoomId} isLoading={isLoading} setIsLoading={setIsLoading} />
          : <VideoChat roomId={roomId} setRoomId={handleSetRoomId} isLoading={isLoading} setIsLoading={setIsLoading} />}
      </div>
    </section>
  )
}

export default App;
