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
    const { receivers: socketIds, roomId, cancelCode } = roomDetails || {};
    const token = await getCredentials(roomId, cancelCode);
    if (token) configuration = token;
    Object.keys(window.peerConnections).forEach(key => {
        if (!socketIds.includes(key)) delete window.peerConnections[key];
    });
    for (let i = 0; i < socketIds.length; i++) {
        let remotePeerId = socketIds[i];
        if (!!window.peerConnections[remotePeerId]) continue;

        let peerConnection = new RTCPeerConnection(configuration);

        // Create data channel
        let dataChannel = peerConnection.createDataChannel('send-file', { reliable: true });
        dataChannel.onmessage = (event) => {
            handleMessage(event.data);
            // this function becomes stale after each new render (since they all only called once here in the function) must be reapplied
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                window.socket.emit('ice-candidate', { to: remotePeerId, candidate: event.candidate });
            }
        };

        // Create an offer to connect to the remote peer
        peerConnection.createOffer()
            .then((offer) => {
                return peerConnection.setLocalDescription(offer);
            })
            .then(() => {
                window.socket.emit('offer', { to: remotePeerId, offer: peerConnection.localDescription, roomId, cancelCode });
            })
            .catch(console.error);

        peerConnection.onconnectionstatechange = async () => {
            console.log("connectionState", peerConnection.connectionState)
            let connectionStateStr = "";
            if (peerConnection.connectionState === 'connected') {
                console.log('Peers connected successfully');
                if (await isActiveIceCandidatePair(peerConnection)) {
                    connectionStateStr = "connected-relay";
                }
            }
            setConnectionState(connectionStateStr || peerConnection.connectionState);
        };

        window.peerConnections[remotePeerId] = [peerConnection, dataChannel];
    }
}

export default createPeerConnection;
