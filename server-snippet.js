// Here's some relevent code from my server

const client = twilio(accountSid, authToken);

const routes = (io) => {
  router.get('/', (req, res) => {
    const filePath = path.join(__dirname, '..', 'views', 'p2pFileSharing.html');
    res.sendFile(filePath);
  });

  router.post('/create', (req, res) => {
    const username = req.body.username;
    const files = req.body.files || [];
    const roomId = uuidv4();
    const cancelCode = uuidv4(); // the purpose of this code is to have a weak authentication so that people can't just delete the room with the url query param roomId
    rooms[roomId] = {
      sender: username,
      senderId: null,
      receivers: [],
      files: files,
      cancelCode,
      roomId,
    };
    res.json({ roomId, cancelCode, ok: true });
  });

  router.post('/update', (req, res) => {
    const roomId = req.body.roomId;
    const cancelCode = req.body.cancelCode;
    const files = req.body.files || [];
    if (rooms[roomId]?.cancelCode === cancelCode) {
      rooms[roomId].files = files;
      io.to(roomId).emit('message', { type: "updated_files", files: files });
      res.json({ ok: true });
    } else {
      res.json({ ok: false, error: "No room with that id or wrong cancel code" });
    }
  });

  router.post('/delete', (req, res) => {
    const roomId = req.body.roomId;
    const cancelCode = req.body.cancelCode;
    if (rooms[roomId]?.cancelCode === cancelCode) {
      delete rooms[roomId];
      res.json({ ok: true });
    } else {
      res.json({ ok: false, error: "No room with that id or wrong cancel code" });
    }
  });

  router.post('/credentials', async (req, res) => {
    const roomId = req.body.roomId;
    const cancelCode = req.body.cancelCode;
    if (rooms[roomId]?.cancelCode === cancelCode) {
      const token = await client.tokens.create({ ttl: 12000 });
      delete token.password;
      res.json(token);
    } else {
      res.json({ ok: false, error: "No room with that id or wrong cancel code" });
    }
  });

  io.on('connection', (socket) => {
    socket.on('joinRoom', (roomId, isSender) => {
      socket.join(roomId);

      // Optionally track room membership
      // rooms[roomId] = rooms[roomId] || {};
      if (!rooms[roomId]) return socket.emit('message', { type: "error", error: `No room present with id: ${roomId}` });

      const room = rooms[roomId];
      if (!!isSender) {
        room.senderId = socket.id;
      } else room.receivers.push(socket.id);

      roomIdBySocketId[socket.id] = new Array(roomId, !!isSender);

      console.log("room", room, isSender);

      socket.emit('message', { type: "joined", msg: `You joined room: ${roomId}`, roomDetails: rooms[roomId] });
      socket.to(roomId).emit('message', { type: "user_connected", roomDetails: room });
    });

    // Handle messages sent to the room
    socket.on('message', ({ roomId, msg }) => {
      // io.to(roomId).emit('message', msg); // Broadcast message to the room including original sender
      socket.to(roomId).emit('message', msg); // Broadcast message to the room except original sender
    });

    // Handle user disconnecting
    socket.on('disconnect', () => {
      console.log('A user disconnected');
      const roomIdAndIsSender = roomIdBySocketId[socket.id];
      if (roomIdAndIsSender) {
        var [roomId, isSender] = roomIdAndIsSender;
      }
      if (rooms[roomId]) {
        if (isSender) {
          rooms[roomId].senderId = null;
        } else {
          rooms[roomId].receivers = rooms[roomId]?.receivers.filter(id => id !== socket.id) || [];
        }
      }
      delete roomIdBySocketId[socket.id];
    });

    // Relay offer from one peer to another
    socket.on('offer', (data) => {
      console.log(`Offer from ${socket.id} to ${data.to}`);
      io.to(data.to).emit('offer', { offer: data.offer, from: socket.id, roomId: data.roomId, cancelCode: data.cancelCode });
    });

    // Relay answer from one peer to another
    socket.on('answer', (data) => {
      console.log(`Answer from ${socket.id} to ${data.to}`);
      io.to(data.to).emit('answer', { answer: data.answer, from: socket.id });
    });

    // Relay ICE candidates
    socket.on('ice-candidate', (data) => {
      console.log(`ICE candidate from ${socket.id} to ${data.to}`);
      io.to(data.to).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
    });
  });

  return router;
}