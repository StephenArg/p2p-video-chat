export const createRoomWithFiles = async (files, setRoomId, setCancelCode, setIsSender, username) => {
  const res = await fetch("https://sargentina.dev/filesharing/create",
    {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        files: files.map(e => ({ name: e.name, size: e.size, id: e.id })),
      })
    }
  );
  const data = await res.json();
  if (data.ok) {
    setCancelCode(data.cancelCode);
    setRoomId(data.roomId);
    setIsSender(true);
  } else console.error(data.error);
};


export const updateRoomWithFiles = async (roomId, cancelCode, files) => {
  const res = await fetch("https://sargentina.dev/filesharing/update",
    {
      method: "POST",
      headers: {
        'Content-Type': 'application/json', // Set the content type to JSON (if you're sending JSON data)
      },
      body: JSON.stringify({
        roomId,
        cancelCode,
        files: files.map(e => ({ name: e.name, size: e.size, id: e.id })),
      })
    }
  );
  const data = await res.json();
  if (data.ok) {
    console.log("Updated files in room");
    return data;
  } else console.error(data.error);
};

export const deleteRoom = async (roomId, cancelCode, setRoomId, setCancelCode, setIsSender) => {
  const res = await fetch("https://sargentina.dev/filesharing/delete",
    {
      method: "POST",
      headers: {
        'Content-Type': 'application/json', // Set the content type to JSON (if you're sending JSON data)
      },
      body: JSON.stringify({
        roomId,
        cancelCode,
      })
    }
  );
  const data = await res.json();
  if (data.ok) {
    setCancelCode(null)
    setRoomId(null);
    setIsSender(false);
  } else console.error(data.error);
};

export const changeUsername = async (username, setUsername, roomId, cancelCode) => {
  const res = await fetch("https://sargentina.dev/filesharing/username",
    {
      method: "POST",
      headers: {
        'Content-Type': 'application/json', // Set the content type to JSON (if you're sending JSON data)
      },
      body: JSON.stringify({
        roomId,
        cancelCode,
        username,
      })
    }
  );
  const data = await res.json();
  if (data.ok) {
    setUsername(username);
  } else console.error(data.error);
};

export const getCredentials = async (roomId, cancelCode) => {
  const res = await fetch("https://sargentina.dev/filesharing/credentials",
    {
      method: "POST",
      headers: {
        'Content-Type': 'application/json', // Set the content type to JSON (if you're sending JSON data)
      },
      body: JSON.stringify({
        roomId,
        cancelCode,
      })
    }
  );
  const data = await res.json();
  if (data) {
    console.log("Received credentials", data["date_created"]);
    return data;
  } else {
    console.error(data.error);
    return null;
  }
};

export const getFiles = async (sa, path) => {
  const res = await fetch("https://sargentina.dev/filesharing/files",
    {
      method: "POST",
      headers: {
        'Content-Type': 'application/json', // Set the content type to JSON (if you're sending JSON data)
      },
      body: JSON.stringify({ sa, path })
    }
  );
  const data = await res.json();
  if (data?.ok) {
    console.log("Received files", data.data);
    return data.data;
  } else {
    console.error(data.error);
    return null;
  }
};

export const downloadFile = async (sa, path) => {
  try {
    const res = await fetch("https://sargentina.dev/filesharing/download",
      {
        method: "POST",
        headers: {
          'Content-Type': 'application/json', // Set the content type to JSON (if you're sending JSON data)
        },
        body: JSON.stringify({ sa, path })
      }
    );
    if (!res.ok) {
      throw new Error('Network response was not ok');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split("/").at(-1);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url); // Free up memory
  } catch (e) {
    console.error(e);
    return null;
  }
};