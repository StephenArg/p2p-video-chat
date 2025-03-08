window.userState = {
  userId: null,
  name: null,
  members: [],
}

export const createRoom = async (roomName, setRoomId) => {
  try {
    const response = await fetch('https://sargentina.dev/p2p-chat/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: roomName }),
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const { roomId, userId } = await response.json();
    window.userState.userId = userId;
    setRoomId(roomId);
  } catch (error) {
    console.error('Error creating room:', error);
    alert('Failed to create room. Please try again.');
  }
};

export const joinRoom = async (roomId) => {
  const res = await fetch(`https://sargentina.dev/p2p-chat/join`, {
    method: 'POST',
    body: JSON.stringify({ roomId }),
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json();
  return data;
}

export const deleteRoom = async (roomId, setRoomId) => {
  const res = await fetch("https://sargentina.dev/p2p-chat/delete",
    {
      method: "POST",
      headers: {
        'Content-Type': 'application/json', // Set the content type to JSON (if you're sending JSON data)
      },
      body: JSON.stringify({
        roomId,
      })
    }
  );
  const data = await res.json();
  if (data.ok) {
    setRoomId(null);

  } else console.error(data.error);
};

export const changeUsername = async (username, setUsername, roomId) => {
  const res = await fetch("https://sargentina.dev/p2p-chat/username",
    {
      method: "POST",
      headers: {
        'Content-Type': 'application/json', // Set the content type to JSON (if you're sending JSON data)
      },
      body: JSON.stringify({
        roomId,
        username,
      })
    }
  );
  const data = await res.json();
  if (data.ok) {
    setUsername(username);
  } else console.error(data.error);
};

export const getCredentials = async (roomId) => {
  const res = await fetch("https://sargentina.dev/p2p-chat/credentials",
    {
      method: "POST",
      headers: {
        'Content-Type': 'application/json', // Set the content type to JSON (if you're sending JSON data)
      },
      body: JSON.stringify({
        roomId,
      })
    }
  );
  const data = await res.json();
  if (data) {
    console.log("Received credentials", data);
    return data;
  } else {
    console.error(data.error);
    return null;
  }
};