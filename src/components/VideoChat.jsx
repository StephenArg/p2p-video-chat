import { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useOutsideClick from '../utils/useOutsideClick';
import createSocket from '../utils/socket';
import createPeerConnection from '../utils/rtcPeerConnection';
import { joinRoom, deleteRoom } from '../requests';
//import { onResize } from '../utils';

window.websocketState = "disconnected"; // disconnected || connecting || connected

const colors = {
  "connected": "green",
  "connected-relay": "green",
  "connecting": "yellow",
  "failed": "red",
  "disconnected": "red",
};

const VideoChat = ({ roomId, setRoomId, isLoading, setIsLoading }) => {
  const inputRef = useRef();
  const urlInputRef = useRef();
  const statusbarRef = useRef();
  const editUsernameRef = useRef();
  const localVideoRef = useRef(null);
  const [roomName, setRoomName] = useState(null);
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState(`User${Math.ceil(Math.random() * 99999)}`);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [isUsernameEditingMode, setIsUsernameEditingMode] = useState(false);
  const [usernameEdit, setUsernameEdit] = useState("");
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const roomUrl = `https://sargentina.dev/p2p-chat?id=${roomId}`;

  useEffect(() => {
    const handleRemoteStream = (event) => {
      console.log("handleRemoteStream", event);
      const { stream, peerId } = event.detail;

      setRemoteStreams(prev => ({
        ...prev,
        [peerId]: stream
      }));
    };

    const handleRemoteDisconnection = (event) => {
      console.log("handleRemoteDisconnection", event);
      const { peerId } = event.detail;

      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[peerId];
        return newStreams;
      });
    };

    console.log("adding event listeners");
    window.addEventListener('remote-stream-received', handleRemoteStream);
    window.addEventListener('remote-stream-disconnected', handleRemoteDisconnection);

    return () => {
      window.removeEventListener('remote-stream-received', handleRemoteStream);
      window.removeEventListener('remote-stream-disconnected', handleRemoteDisconnection);
    };
  }, []);

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const processPeerConnectionMessage = (msg) => {
    // this function and processSocketMessage become stale after each new render (since they all only called once in the functions) loop and reapply to datachannels and sockets
    // console.log("process peerConnection msg", msg);
    try {
      msg = JSON.parse(msg);
    } catch (e) { console.error(e) }
    switch (msg.type) {
      case "message":
        if (msg.start) {
          setMessages((messages) => [...messages, msg.message, `Uploading ${msg.fileName} - <span id='msg-${msg.fileId}'>0.0</span>% completed`]);
        } else setMessages((messages) => [...messages, msg.message]);
        break;
    }
  };

  const processSocketMessage = async (msg) => {
    // process messages from server here
    console.log("socket message", msg);
    switch (msg.type) {
      case "joined":
        if (msg.roomDetails.members.length > 1) createPeerConnection(msg.roomDetails, processPeerConnectionMessage, setConnectionState);
        break;
      case "user_connected":
        break;
    }
  };

  if (window.peerConnections) Object.values(window.peerConnections).forEach(([_, dataChannel]) => {
    if (!dataChannel) return;
    dataChannel.onmessage = (event) => processPeerConnectionMessage(event.data)
  });
  // if (window.socket) window.socket.on('message', (msg) => {processSocketMessage(msg)});

  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      setRoomId(null);
      return;
    };

    if (isLoading || roomName) return;

    console.log("Joining room:", roomId);
    setIsLoading(true);

    joinRoom(roomId).then((data) => {
      console.log("Room join response:", data);
      if (!data.ok && !data.present) {
        setRoomId(null);
        setIsLoading(false);
        return;
      }
      const initLocalStream = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
          });

          setLocalStream(stream);
          window.localStream = stream;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

        } catch (error) {
          console.error('Error accessing media devices:', error);
        }
      };

      initLocalStream().then(() => {
        if (!socket && !window.socket) {
          console.log("Initializing socket connection");
          createSocket(roomId, processSocketMessage, processPeerConnectionMessage, setConnectionState, setSocket);
        }
      });
      setRoomName(data.name);
      setIsLoading(false);
    }).catch(err => {
      console.error("Error joining room:", err);
      setIsLoading(false);
    });

    return () => {
      if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, isLoading, roomName]);

  // useEffect(() => {
  //   if (isUsernameEditingMode) editUsernameRef.current.focus();
  // }, [isUsernameEditingMode])

  // useEffect(() => {
  //   window.myUsername = username;
  // }, [username])

  useEffect(() => {
    () => {
      if (roomId && window.userState.members.length < 1) {
        deleteRoom(roomId, setRoomId);
      }
    }
  }, [roomId])

  const handleCopyLink = () => {
    urlInputRef.current.select();
    document.execCommand('copy')
    urlInputRef.current.value = "Copied link!";
    urlInputRef.current.style.borderColor = "teal";
    urlInputRef.current.style.pointerEvents = "none";
    urlInputRef.current.style.userSelect = "none";
    setTimeout(() => {
      urlInputRef.current.value = roomUrl;
      urlInputRef.current.style.borderColor = "";
      urlInputRef.current.style.pointerEvents = "";
      urlInputRef.current.style.userSelect = "";
    }, 5000);
  };

  const handleUsernameEdit = (e) => {
    setUsernameEdit(e.target.value);
  }

  const submitUserName = () => {
    if (!isUsernameEditingMode) return;
    if (usernameEdit.length > 0 && usernameEdit.length < 25) {
      setUsername(usernameEdit);
    }
    setUsernameEdit("");
    setIsUsernameEditingMode(false);
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') submitUserName() };

  useOutsideClick(statusbarRef, submitUserName);

  // const sendMessage = (text) => {
  //   if (!text.trim()) return;
  //   const messageObj = {
  //     type: "message",
  //     message: `${username}: ${text}`
  //   };
  //   Object.values(window.peerConnections).forEach(([_, dataChannel]) => {
  //     if (dataChannel && dataChannel.readyState === 'open') {
  //       dataChannel.send(JSON.stringify(messageObj));
  //     }
  //   });
  //   setMessages(prev => [...prev, `You: ${text}`]);
  // };

  if (isLoading) {
    return <article className="video-chat-container">
      <h2 className="video-chat-h2">Loading...</h2>
    </article>
  }

  console.log("remoteStreams", remoteStreams);

  return (
    <article className="video-chat-container">
      <div className="video-chat-interface">
        <h2 id="video-chat-h2">
          Chat Room: {roomName}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '50%', alignItems: 'center' }}>
          <div className="connection-status" style={{ color: colors[connectionState] || 'yellow' }}>
            Connection: {connectionState || 'connecting...'}
          </div>
          <div>
            <h3 style={{ fontSize: "10px", width: "140px" }}>Click here to copy link</h3>
            <input ref={urlInputRef} onClick={handleCopyLink} className="share-link" type="text" readOnly value={roomUrl} />
          </div>
        </div>
        <div className="video-chat-grid">
          <div className="video-container local-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={isVideoOff ? 'video-off' : ''}
            />
            <div className="video-controls">
              <button onClick={toggleAudio} className={isMuted ? 'control-btn muted' : 'control-btn'}>
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button onClick={toggleVideo} className={isVideoOff ? 'control-btn video-disabled' : 'control-btn'}>
                {isVideoOff ? '📵' : '🎥'}
              </button>
            </div>
            <div className="video-label">{username} (You)</div>
          </div>

          {Object.entries(remoteStreams).map(([peerId, stream]) => (
            <div key={peerId} className="video-container remote-video">
              <video
                autoPlay
                playsInline
                ref={el => {
                  if (el) el.srcObject = stream;
                }}
              />
              <div className="video-label">Peer {peerId.substring(0, 5)}...</div>
            </div>
          ))}
        </div>
        {/* <div className="chat-container" style={{ marginTop: '30px', width: '100%', maxWidth: '800px' }}>
          <div className="messages" style={{
            height: '200px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            borderRadius: '5px',
            padding: '10px',
            marginBottom: '10px',
            textAlign: 'left'
          }}>
            {messages.map((msg, index) => (
              <div key={index} className="message"
                dangerouslySetInnerHTML={{ __html: msg }}
                style={{ marginBottom: '5px' }}></div>
            ))}
          </div>
          <div className="message-input" style={{ display: 'flex' }}>
            <input
              type="text"
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                marginRight: '10px'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  sendMessage(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.previousSibling;
                sendMessage(input.value);
                input.value = '';
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              Send
            </button>
          </div>
        </div> */}
      </div>
    </article>
  );
};

export default VideoChat;