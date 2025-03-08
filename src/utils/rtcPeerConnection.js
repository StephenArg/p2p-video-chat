import { getCredentials } from "../requests";
import { isActiveIceCandidatePair } from ".";

window.peerConnections = {};

// ICE server configuration
let configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // Google's public STUN server
    ],
};

const createPeerConnection = async (roomDetails, handleMessage, setConnectionState) => {
    const { members: socketIds, roomId } = roomDetails || {};
    const token = await getCredentials(roomId);
    if (token) {
        configuration = token;
        window.configuration = token; // Make it available globally for socket.js
    }

    // Clean up disconnected peers
    if (window.peerConnections) {
        Object.keys(window.peerConnections).forEach(key => {
            if (!socketIds.includes(key)) {
                // Close and cleanup connection before deleting
                const [peerConnection, dataChannel] = window.peerConnections[key];
                if (dataChannel) dataChannel.close();
                if (peerConnection) peerConnection.close();
                delete window.peerConnections[key];
            }
        });
    }

    // Only initiate connections to new peers that don't have a connection yet
    // This prevents duplicate connections and allows socket.js to handle incoming offers
    for (let i = 0; i < socketIds.length; i++) {
        let remotePeerId = socketIds[i];
        console.log("Checking connection to remotePeerId", remotePeerId);

        // Skip if remotePeerId is the same as the local peer id
        if (remotePeerId === window.socket.id) {
            console.log(`Skipping connection to self (${remotePeerId})`);
            continue;
        }

        // Skip if connection already exists
        if (window.peerConnections[remotePeerId]) {
            console.log(`Connection to ${remotePeerId} already exists, skipping`);
            continue;
        }

        console.log(`Initiating connection to ${remotePeerId}`);
        let peerConnection = new RTCPeerConnection(configuration);

        // Add local media tracks to the connection if available
        if (window.localStream) {
            window.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, window.localStream);
            });
        }

        peerConnection.ontrack = (event) => {
            console.log("ontrack from rtcPeerConnection.js", event);
            const customEvent = new CustomEvent('remote-stream-received', {
                detail: {
                    stream: event.streams[0],
                    peerId: remotePeerId
                }
            });
            window.dispatchEvent(customEvent);
        };

        // Create data channel
        let dataChannel = peerConnection.createDataChannel('send-message', { reliable: true });
        dataChannel.onmessage = (event) => {
            handleMessage(event.data);
            // this function becomes stale after each new render (since they all only called once here in the function) must be reapplied
        };

        // Keep track of connection state
        peerConnection.onconnectionstatechange = async () => {
            console.log(`Connection state for ${remotePeerId}:`, peerConnection.connectionState);
            let connectionStateStr = "";

            if (peerConnection.connectionState === 'connected') {
                console.log('Peers connected successfully');
                if (await isActiveIceCandidatePair(peerConnection)) {
                    connectionStateStr = "connected-relay";
                }
            }
            else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
                console.log(`Peer ${remotePeerId} disconnected`);
                // Dispatch a custom event to notify the VideoChat component to remove this stream
                const disconnectEvent = new CustomEvent('remote-stream-disconnected', {
                    detail: {
                        peerId: remotePeerId
                    }
                });
                window.dispatchEvent(disconnectEvent);
            }

            setConnectionState(connectionStateStr || peerConnection.connectionState);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                window.socket.emit('ice-candidate', { to: remotePeerId, candidate: event.candidate });
            }
        };

        // Store the connection
        window.peerConnections[remotePeerId] = [peerConnection, dataChannel];

        // Create an offer
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            console.log(`Sending offer to ${remotePeerId}`);
            window.socket.emit('offer', { to: remotePeerId, offer: peerConnection.localDescription, roomId });
        } catch (error) {
            console.error("Error creating offer:", error);
        }
    }
};

export default createPeerConnection;
