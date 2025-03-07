import { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Filename from './Filename';
import useOutsideClick from '../utils/useOutsideClick';
import createSocket from '../utils/socket';
import createPeerConnection from '../utils/rtcPeerConnection';
import { createRoomWithFiles, deleteRoom, updateRoomWithFiles } from '../requests';
import { onResize } from '../utils';
import { receiveFile, sendFile, sendFileToDisk, receiveFileToDisk } from '../utils/sendFile';

window.websocketState = "disconnected"; // disconnected || connecting || connected

const colors = {
  "connected": "green",
  "connected-relay": "green",
  "connecting": "yellow",
  "failed": "red",
  "disconnected": "red",
};

const FileSharing = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const inputRef = useRef();
  const urlInputRef = useRef();
  const statusbarRef = useRef();
  const editUsernameRef = useRef();
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [roomId, setRoomId] = useState(urlParams.get('id') || null);
  const [cancelCode, setCancelCode] = useState(null);
  const [username, setUsername] = useState(`User${Math.ceil(Math.random() * 99999)}`);
  const [isSender, setIsSender] = useState(false);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [isUsernameEditingMode, setIsUsernameEditingMode] = useState(false);
  const [usernameEdit, setUsernameEdit] = useState("");
  const [socket, setSocket] = useState(null);

  const roomUrl = `https://sargentina.dev/filesharing?id=${roomId}`;
  const isReceiver = !!roomId && !isSender;

  const processPeerConnectionMessage = (msg) => {
    // this function and processSocketMessage become stale after each new render (since they all only called once in the functions) loop and reapply to datachannels and sockets
    // console.log("process peerConnection msg", msg);
    try {
      msg = JSON.parse(msg);
    } catch (e) { console.error(e) }
    switch (msg.type) {
      case "requestFile":
        var { id, fromSocketId, toDisk } = msg;
        var file = files.find((data) => data.id === id);
        var peerConnectionAndDatachannel = window.peerConnections[fromSocketId];
        if (file && peerConnectionAndDatachannel) {
          if (toDisk && file.size > 2147483648) sendFileToDisk(file, peerConnectionAndDatachannel[1], false);
          else sendFile(file, peerConnectionAndDatachannel[1]);
        } else console.error("issue finding file or receiver details");
        break;
      case "requestFile-startChunks":
        var { id, fromSocketId } = msg;
        var file = files.find((data) => data.id === id);
        var peerConnectionAndDatachannel = window.peerConnections[fromSocketId];
        if (file && peerConnectionAndDatachannel) {
          sendFileToDisk(file, peerConnectionAndDatachannel[1], true);
        } else console.error("issue finding file or receiver details");
        break;
      case "metadata":
      case "file":
        receiveFile(msg);
        break;
      case "metadata-toDisk":
      case "file-toDisk":
        receiveFileToDisk(msg);
        break;
      case "message":
        if (msg.start) {
          setMessages((messages) => [...messages, msg.message, `Uploading ${msg.fileName} - <span id='msg-${msg.fileId}'>0.0</span>% completed`]);
        } else setMessages((messages) => [...messages, msg.message]);
        break;
    }
  };

  const processSocketMessage = (msg) => {
    // process messages from server here
    console.log("socket message", msg);
    switch (msg.type) {
      case "joined":
        if (isReceiver) setFiles(msg.roomDetails.files);
        break;
      case "user_connected":
        if (isSender) createPeerConnection(msg.roomDetails, processPeerConnectionMessage, setConnectionState);
        break;
      case "updated_files":
        if (isReceiver) setFiles(msg.files);
        break;
    }
  };

  if (window.peerConnections) Object.values(window.peerConnections).forEach(([_, dataChannel]) => {
    if (!dataChannel) return;
    dataChannel.onmessage = (event) => processPeerConnectionMessage(event.data)
  });
  // if (window.socket) window.socket.on('message', (msg) => {processSocketMessage(msg)});

  useEffect(() => {
    onResize();
  }, [])

  useEffect(() => {
    onResize();
  }, [files, messages])

  useEffect(() => {
    if (isUsernameEditingMode) editUsernameRef.current.focus();
  }, [isUsernameEditingMode])

  useEffect(() => {
    window.myUsername = username;
  }, [username])

  useEffect(() => {
    if (files.length && !roomId) { // add condition to not reconnect with room. maybe update files from here
      createRoomWithFiles(files, setRoomId, setCancelCode, setIsSender, username);
    }

    () => {
      if (roomId && isSender) {
        deleteRoom(roomId, cancelCode, setRoomId, setCancelCode, setIsSender);
      }
    }
  }, [files, roomId])

  useEffect(() => {
    //if (roomId && !window.socket && connectionState === "disconnected") { // you have a room id and haven't connected to websockets
    if (roomId && !socket && connectionState === "disconnected") {
      // connect to websocket
      createSocket(roomId, processSocketMessage, processPeerConnectionMessage, isSender, setConnectionState, setSocket);
    }
  }, [roomId, connectionState, socket]);

  // useEffect(() => {
  //   if (window.socket) {
  //     console.log('sending message');
  //     window.socket.emit('message', { roomId, msg: "hey" })
  //   }
  // }, [window.socket])

  const onFileChange = (e) => {
    const newFiles = [...e.target.files].map(file => {
      file.id = uuidv4();
      return file;
    });
    setFiles((prevFiles) => {
      const newFilesArr = [...prevFiles, ...newFiles];
      console.log(newFilesArr, prevFiles, newFiles);
      if (roomId) {
        updateRoomWithFiles(roomId, cancelCode, newFilesArr);
      }
      return newFilesArr;
    })
    e.target.value = "";
  }

  const handleDragOver = (event) => {
    event.preventDefault(); // Prevent default browser behavior
    event.stopPropagation();
    setDragging(true); // Add drag visual feedback
  };

  const handleDragLeave = () => {
    setDragging(false); // Remove drag visual feedback
  };

  const handleDropFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer && e.dataTransfer.files.length) {
      inputRef.current.files = e.dataTransfer.files;

      // Optionally, trigger a change event on the hidden input
      const changeEvent = new Event('change', { bubbles: true });
      inputRef.current.dispatchEvent(changeEvent);
    }
  };

  const handleDownloadAll = () => {
    if (!isReceiver) return;
    if (!window.senderSocketId || !window.socket) alert("Something went wrong. Try refreshing the page");
    // this is this structure of sending via the data channel
    const dc = window.peerConnections[window.senderSocketId][1];
    const hasFilePicker = !!window.showSaveFilePicker;
    let totalLargeFiles = 0;
    files.forEach((file) => {
      if (file.size > 2147483648 && !hasFilePicker) {
        alert("One of the files you selected might be too big to transfer using this browser. Please use Chrome, Edge, or Opera");
        return;
      }

      if (file.size > 2147483648 && hasFilePicker) totalLargeFiles++;

      const fileId = file.id;
      const pTag = document.getElementById(fileId);
      pTag.style.pointerEvents = "none";
      dc.send(JSON.stringify({
        type: "requestFile",
        id: fileId,
        fromSocketId: window.socket.id,
        toDisk: file.size > 2147483648 && hasFilePicker,
      }));
    })
    if (totalLargeFiles > 1) alert("It is recommended to manually click each file to transfer if you have many large files. This is due to the file picker api not working synchronously")
  };

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
    // if (usernameEdit.length > 0 && usernameEdit.length < 25 && (roomId && cancelCode && isSender)) {
    //   changeUsername(usernameEdit, setUsername, roomId, cancelCode);
    // } else if    // decided to leave off this feature since I don't display the sender username to receivers anyway. Maybe some other time
    if (usernameEdit.length > 0 && usernameEdit.length < 25) {
      setUsername(usernameEdit);
    }
    setUsernameEdit("");
    setIsUsernameEditingMode(false);
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') submitUserName() };

  useOutsideClick(statusbarRef, submitUserName);

  return (
    <>
      <article className="file-sharing-container">
        <div className="file-sharing-interface">
          <h2 id="file-sharing-h2" style={{ maxWidth: isReceiver ? "375px" : "", }}>
            {isReceiver ? "Click on File to Download" : "Drag and Drop or Browse for a File"}
          </h2>
          <input ref={inputRef} style={{ display: "none" }} type="file" onChange={onFileChange} multiple />
          <div style={{
            display: "flex",
            flexDirection: "column",
            width: "128px"
          }}>
            <button
              className="browse-button"
              onClick={() => inputRef.current.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDropFile}
              style={{
                display: (!isSender && !isReceiver) || isSender ? "" : "none",
                border: dragging ? '2px dashed #3f51b5' : '2px solid #ccc',
                backgroundColor: dragging ? '#079a8c' : '#1a1a1a',
                cursor: 'pointer',
                marginTop: "15px",
                marginBottom: "25px",
              }}
            >
              {dragging ? "Drop here" : "Browse"}
            </button>
            <button
              className="browse-button"
              onClick={handleDownloadAll}
              style={{
                display: isReceiver ? "" : "none",
                border: '2px solid #ccc',
                backgroundColor: '#1a1a1a',
                cursor: 'pointer',
                marginTop: "15px",
                marginBottom: "25px",
              }}
            >
              Download All
            </button>
            {roomId && isSender && (
              <>
                <h3 style={{ fontSize: "10px", width: "140px" }}>Click here to copy link</h3>
                <input ref={urlInputRef} onClick={handleCopyLink} className="share-link" type="text" readOnly value={roomUrl} />
              </>
            )}
          </div>
          {
            !!files.length && (
              <div
                className='filenames-container'
                style={{
                  borderTop: "1px dashed",
                  paddingTop: "15px",
                  borderRadius: "20px",
                  borderBottom: "1px dashed",
                  paddingLeft: "12px",
                  // width: isReceiver ? "455px" : "",
                }}
              >
                {files.map(data => <Filename key={data.id} data={data} isReceiver={isReceiver} />)}
              </div>
            )
          }
        </div>
        <div className='status-bar' style={{ left: !isReceiver ? "42%" : "" }} ref={statusbarRef}>
          {isReceiver && (
            <>
              <bold style={{ textWrap: "nowrap" }}>WebRTC status:
                <span style={{
                  color: colors[connectionState] || "red",
                }}> {connectionState}
                </span>
              </bold>
              <br style={{ width: "20px" }} />
              <bold> / </bold>
              <br style={{ width: "20px" }} />
            </>)}
          {isUsernameEditingMode ? (
            <>
              <input style={{ width: "100px" }} placeholder={username} onChange={handleUsernameEdit} value={usernameEdit} onKeyDown={handleKeyDown} ref={editUsernameRef}></input>
              <div onClick={() => submitUserName()} style={{ minWidth: "15px", cursor: "pointer", backgroundColor: 'green' }}>✓</div>
              <div onClick={() => setIsUsernameEditingMode(false)} style={{ minWidth: "15px", cursor: "pointer", backgroundColor: 'red' }}>x</div>
            </>)
            : (<bold style={{ cursor: "pointer", display: "block ruby" }} onClick={() => setIsUsernameEditingMode(true)}>{username}</bold>)
          }
          <br />
        </div>
      </article>
      {messages.length > 0 && (
        <article className="messages-container" style={{ marginTop: "35px" }}>
          <div className="messages-list" style={{ textAlign: "start" }}>
            {messages.map((m) => <p key={m} style={{ fontSize: "12px" }} dangerouslySetInnerHTML={{ __html: m }}></p>)}
          </div>
        </article>
      )}
    </>
  );
};

export default FileSharing;