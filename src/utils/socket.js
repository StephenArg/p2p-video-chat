import { getCredentials } from "../requests";
import { isActiveIceCandidatePair } from ".";

window.configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }, // Google's public STUN server
  ],
};

const createSocket = (roomId, processSocketMessage, processPeerConnectionMessage, setConnectionState, setSocket) => {
  // Connect to the Socket.IO server
  const socket = io('wss://sargentina.dev', {
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  });

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
    socket.emit('joinRoom', roomId);
    window.socket = socket;
    setSocket(socket);
  });

  // Handle incoming offers
  socket.on('offer', async (data) => {
    console.log("offer1", data);
    const token = await getCredentials(data.roomId);
    if (token) window.configuration = token;

    // Check if peer connection already exists
    if (window.peerConnections && window.peerConnections[data.from] && window.peerConnections[data.from][0]) {
      console.log(`Using existing peer connection for ${data.from}`);
      // Use existing connection instead of creating a new one
      var peerConnection = window.peerConnections[data.from][0];
    } else {
      // Create new connection
      var peerConnection = new RTCPeerConnection(window.configuration);
      let dataChannel;

      // Add local media tracks to the connection if available
      if (window.localStream) {
        window.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, window.localStream);
        });
      }

      // Handle remote tracks
      peerConnection.ontrack = (event) => {
        console.log("ontrack2", event);
        const customEvent = new CustomEvent('remote-stream-received', {
          detail: {
            stream: event.streams[0],
            peerId: data.from
          }
        });
        window.dispatchEvent(customEvent);
      };

      // Receive the data channel
      peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        dataChannel.onmessage = (event) => {
          processPeerConnectionMessage(event.data);
        };
        if (!window.peerConnections) window.peerConnections = {};
        if (!window.peerConnections[data.from]) window.peerConnections[data.from] = [peerConnection, null];
        window.peerConnections[data.from][1] = dataChannel;
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
        else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
          console.log(`Peer ${data.from} disconnected`);
          // Dispatch event to remove the stream
          const disconnectEvent = new CustomEvent('remote-stream-disconnected', {
            detail: {
              peerId: data.from
            }
          });
          window.dispatchEvent(disconnectEvent);
        }

        setConnectionState(connectionStateStr || peerConnection.connectionState);
      };

      // Initialize peerConnections if not exists
      if (!window.peerConnections) window.peerConnections = {};
      window.peerConnections[data.from] = [peerConnection, dataChannel];
    }

    // Now set remote description for the offer
    peerConnection = window.peerConnections[data.from][0];

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('answer', { to: data.from, answer: peerConnection.localDescription });

      // Apply any pending ICE candidates
      if (window.pendingIceCandidates && window.pendingIceCandidates[data.from]) {
        console.log(`Applying ${window.pendingIceCandidates[data.from].length} pending ICE candidates for ${data.from}`);
        for (const candidate of window.pendingIceCandidates[data.from]) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Added stored ICE candidate successfully");
          } catch (error) {
            console.error("Error adding stored ICE candidate:", error);
          }
        }
        // Clean up after applying
        delete window.pendingIceCandidates[data.from];
      }
    } catch (error) {
      console.error("Error during offer/answer process:", error);
    }
  });

  // Handle incoming answers
  socket.on('answer', async (data) => {
    console.log("answer1", data);

    if (!window.peerConnections || !window.peerConnections[data.from] || !window.peerConnections[data.from][0]) {
      console.error(`No peer connection found for ${data.from} to set answer`);
      return;
    }

    try {
      const peerConnection = window.peerConnections[data.from][0];
      // Check connection state before setting remote description
      if (peerConnection.signalingState !== 'have-local-offer') {
        console.warn(`Peer connection for ${data.from} is in ${peerConnection.signalingState} state, not setting answer`);
        return;
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log(`Successfully set remote description (answer) for ${data.from}`);
    } catch (error) {
      console.error("Error setting remote description (answer):", error);
    }
  });

  // Handle incoming ICE candidates
  socket.on('ice-candidate', async (data) => {
    console.log("Received ICE candidate from:", data.from);

    // Check if the peer connection exists and is in correct state
    if (!window.peerConnections || !window.peerConnections[data.from] ||
      !window.peerConnections[data.from][0]) {
      console.warn(`Peer connection for ${data.from} not found, storing ICE candidate for later`);

      // Store the candidate for later use
      if (!window.pendingIceCandidates) window.pendingIceCandidates = {};
      if (!window.pendingIceCandidates[data.from]) window.pendingIceCandidates[data.from] = [];
      window.pendingIceCandidates[data.from].push(data.candidate);
      return;
    }

    const peerConnection = window.peerConnections[data.from][0];

    // Only add candidates if we have a remote description
    if (!peerConnection.remoteDescription) {
      console.warn(`No remote description set for ${data.from}, storing ICE candidate for later`);
      if (!window.pendingIceCandidates) window.pendingIceCandidates = {};
      if (!window.pendingIceCandidates[data.from]) window.pendingIceCandidates[data.from] = [];
      window.pendingIceCandidates[data.from].push(data.candidate);
      return;
    }

    // Add the candidate to the existing connection
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log("Added ICE candidate successfully");
    } catch (error) {
      console.error("Error adding ICE candidate:", error, data.candidate);
    }
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
