import { getCredentials } from "../requests";
import { isActiveIceCandidatePair } from ".";

let configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }, // Google's public STUN server
  ],
};

const createSocket = (roomId, processSocketMessage, processPeerConnectionMessage, isSender, setConnectionState, setSocket) => {
  // Connect to the Socket.IO server
  const socket = io('wss://sargentina.dev');

  // Listen for messages from the server
  socket.on('message', (msg) => {
    processSocketMessage(msg);
    // this function becomes stale after each new render (since they all only called once here in the function) must be reapplied
  });

  // // Send a message when the button is clicked
  // document.getElementById('sendMessage').addEventListener('click', () => {
  //   socket.send('Hello from the client!');
  // });

  // Log connection status
  socket.on('connect', () => {
    console.log('Connected to the Socket.IO server');
    socket.emit('joinRoom', roomId, isSender);
    // window.websocketState = "connected";
    window.socket = socket;
    setSocket(socket);
  });


  // Handle incoming offers
  socket.on('offer', async (data) => {
    const token = await getCredentials(data.roomId, data.cancelCode);
    if (token) configuration = token;
    let peerConnection = new RTCPeerConnection(configuration);
    let dataChannel;

    // Receive the data channel
    peerConnection.ondatachannel = (event) => {
      dataChannel = event.channel;
      dataChannel.onmessage = (event) => {
        processPeerConnectionMessage(event.data);
        // this function becomes stale after each new render (since they all only called once here in the function) must be reapplied
      };
      window.peerConnections[window.senderSocketId][1] = dataChannel;
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: data.from, candidate: event.candidate });
      }
    };

    peerConnection.onconnectionstatechange = async () => {
      console.log("connectionState", peerConnection.connectionState);
      let connectionStateStr = "";
      if (peerConnection.connectionState === 'connected') {
        console.log('Peers connected successfully');
        if (await isActiveIceCandidatePair(peerConnection)) {
          connectionStateStr = "connected-relay";
        }
      }
      setConnectionState(connectionStateStr || peerConnection.connectionState);
    };

    peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
      .then(() => peerConnection.createAnswer())
      .then((answer) => {
        return peerConnection.setLocalDescription(answer);
      })
      .then(() => {
        window.senderSocketId = data.from;
        window.peerConnections[data.from] = [peerConnection, dataChannel];
        socket.emit('answer', { to: data.from, answer: peerConnection.localDescription });
      })
      .catch(console.error);
  });

  // Handle incoming answers
  socket.on('answer', (data) => {
    window.peerConnections[data.from][0].setRemoteDescription(new RTCSessionDescription(data.answer))
      .catch(console.error);
  });

  // Handle incoming ICE candidates
  socket.on('ice-candidate', (data) => {
    window.peerConnections[data.from][0].addIceCandidate(new RTCIceCandidate(data.candidate))
      .catch(console.error);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from the Socket.IO server');
    // might need to delete window.peerConnections here. Not sure
    // window.websocketState = "disconnected";
    window.socket = null;
    setSocket(null);
  });

}

export default createSocket;
