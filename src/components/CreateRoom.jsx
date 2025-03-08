import React, { useState } from 'react';
import { createRoom } from '../requests';

const CreateRoom = ({ setRoomId, isLoading, setIsLoading }) => {
  const [roomName, setRoomName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await createRoom(roomName, setRoomId);
    setIsLoading(false);
  };

  return (
    <article className="create-room-container">
      <div className="create-room-interface">
        <h2 id="create-room-h2" style={{ maxWidth: "375px" }}>
          Create Room
        </h2>
        <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name (optional)"
              style={{
                padding: "8px 12px",
                fontSize: "16px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                width: "270px",
                marginRight: "10px"
              }}
            />
            <button
              className="create-room-button"
              type="submit"
              disabled={isLoading}
              style={{
                padding: "8px 16px",
                fontSize: "16px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: "#fff",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? "Creating..." : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
};

export default CreateRoom;