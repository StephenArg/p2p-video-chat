function arrayBufferToBase64(buffer) {
  const binary = String.fromCharCode.apply(null, new Uint8Array(buffer));
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64); // Decode Base64 string to a binary string
  const len = binaryString.length;
  const bytes = new Uint8Array(len); // Create a Uint8Array to hold the bytes

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i); // Convert binary string to bytes
  }

  return bytes.buffer; // Return the ArrayBuffer
}

export const sendFile = (file, dataChannel) => {
    const chunkSize = 16 * 1024; // 16 KB chunks
    let offset = 0;
    let receivedSize = 0;


    // Create a unique file ID (e.g., using timestamp and random string)
    const fileId = file.id;

    // Send file metadata first
    const metadata = JSON.stringify({type: "metadata", fileId, fileName: file.name, fileSize: file.size });
    dataChannel.send(metadata);

    const fileReader = new FileReader();

    let msgSpan;

    // Send the file in chunks
    fileReader.onload = (event) => {
        // Include fileId and offset with each chunk
        if (!msgSpan) msgSpan = document.getElementById(`msg-${fileId}`)
        const chunk = event.target.result;
        const payload = {
            type: "file",
            fileId: fileId,
            chunk: arrayBufferToBase64(chunk),
            offset: offset,
            chunkSize: chunkSize,
        };
        dataChannel.send(JSON.stringify(payload)); // Send chunk with metadata

        receivedSize += chunk.byteLength;

        const percentage = ((receivedSize / file.size) * 100).toFixed(1);
        if (msgSpan) msgSpan.innerText = percentage;
        offset += chunkSize;
        if (offset < file.size) {
          readSlice(offset); // Read the next slice of the file
        }
    };

    const readSlice = (o) => {
        const slice = file.slice(o, o + chunkSize);
        fileReader.readAsArrayBuffer(slice); // Read file chunk as ArrayBuffer
    };

    readSlice(0); // Start reading the file
};

export const sendFileToDisk = (file, dataChannel, sendChunks) => {
  const chunkSize = 16 * 1024; // 16 KB chunks
  let offset = 0;
  let receivedSize = 0;


  // Create a unique file ID (e.g., using timestamp and random string)
  const fileId = file.id;

  if (!sendChunks) {
    // Send file metadata first
    const metadata = JSON.stringify({type: "metadata-toDisk", fileId, fileName: file.name, fileSize: file.size });
    dataChannel.send(metadata);
    return;
  }

  const fileReader = new FileReader();

  let msgSpan;

  // Send the file in chunks
  fileReader.onload = (event) => {
      // Include fileId and offset with each chunk
      if (!msgSpan) msgSpan = document.getElementById(`msg-${fileId}`)
      const chunk = event.target.result;
      const payload = {
          type: "file-toDisk",
          fileId: fileId,
          chunk: arrayBufferToBase64(chunk),
          offset: offset,
          chunkSize: chunkSize,
      };
      dataChannel.send(JSON.stringify(payload)); // Send chunk with metadata

      receivedSize += chunk.byteLength;

      const percentage = ((receivedSize / file.size) * 100).toFixed(1);
      if (msgSpan) msgSpan.innerText = percentage;
      offset += chunkSize;
      if (offset < file.size) {
        readSlice(offset); // Read the next slice of the file
      }
  };

  const readSlice = (o) => {
      const slice = file.slice(o, o + chunkSize);
      fileReader.readAsArrayBuffer(slice); // Read file chunk as ArrayBuffer
  };

  readSlice(0); // Start reading the file
};

let filesInProgress = {};

export const receiveFile = (data) => {
  // setup the chrome/edge/opera exclusive version after the simple RAM approach
  if (data.type === "metadata") {
    console.log("metadata", data);
    const dc = window.peerConnections[window.senderSocketId][1];
    dc.send(JSON.stringify({
      type: "message",
      start: true,
      fileName: data.fileName,
      fileId: data.fileId,
      message: `${window.myUsername}: download started - ${data.fileName}`
    }));
    let fileData = filesInProgress[data.fileId];
    if (!fileData) {
      const pTag = document.getElementById(data.fileId);
      const smallTag = document.createElement('small');
      smallTag.classList.add('download-percentage');
      pTag.appendChild(smallTag);
      fileData = {
        fileName: data.fileName,
        fileSize: data.fileSize,
        receivedBuffers: [],
        receivedSize: 0,
        smallTag: smallTag,
      };
      filesInProgress[data.fileId] = fileData;
      console.log(`Receiving file: ${data.fileName} (${data.fileSize} bytes)`);
      return;
    }
  }

  const file = filesInProgress[data.fileId];
  if (!file) {
    const pTag = document.getElementById(data.fileId);
    pTag.style.pointerEvents = "";
    console.error("there was some issue collecting previous file buffer data");
    return;
  }
  const chunk = base64ToArrayBuffer(data.chunk);
  file.receivedBuffers.push(chunk); // Store the chunk
  file.receivedSize += chunk.byteLength;

  const percentage = ((file.receivedSize / file.fileSize) * 100).toFixed(1);
  file.smallTag.innerText = ` ~ downloading ~ ${percentage}%`;

  // Check if we have received the full file
  if (file.receivedSize >= file.fileSize) {
    const blob = new Blob(file.receivedBuffers);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file.fileName;
    // link.textContent = `Download ${file.fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    const pTag = document.getElementById(data.fileId);
    pTag.removeChild(file.smallTag);
    pTag.style.pointerEvents = "";
    const dc = window.peerConnections[window.senderSocketId][1];
    dc.send(JSON.stringify({type: "message", message: `${window.myUsername}: download finished - ${file.fileName}`}));

    console.log(`File ${file.fileName} received and ready for download.`);
    delete filesInProgress[data.fileId]; // Clean up the buffer
  }

};

export const receiveFileToDisk = async (data) => {
  // setup the chrome/edge/opera exclusive version after the simple RAM approach
  if (data.type === "metadata-toDisk") {
    console.log("metadata", data);

    // Ask the user where to save the file
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: data.fileName,
      types: [{
        description: 'Any File',
        accept: { '*/*': ['.txt', '.jpg', '.pdf', '.png'] } // Accept all file types
      }],
    });

    // Create a writable stream for the file
    const writableStream = await fileHandle.createWritable();

    const dc = window.peerConnections[window.senderSocketId][1];
    dc.send(JSON.stringify({
      type: "message",
      start: true,
      fileName: data.fileName,
      fileId: data.fileId,
      message: `${window.myUsername}: download started - ${data.fileName}`
    }));
    
    let fileData = filesInProgress[data.fileId];
    if (!fileData) {
      const pTag = document.getElementById(data.fileId);
      const smallTag = document.createElement('small');
      smallTag.classList.add('download-percentage');
      pTag.appendChild(smallTag);
      fileData = {
        fileName: data.fileName,
        fileSize: data.fileSize,
        writableStream: writableStream,
        receivedSize: 0,
        smallTag,
      };
      filesInProgress[data.fileId] = fileData;
      dc.send(JSON.stringify({
        type: "requestFile-startChunks",
        id: data.fileId,
        fromSocketId: window.socket.id,
      }));
      console.log(`Receiving file: ${data.fileName} (${data.fileSize} bytes)`);
      return;
    }
  }
  
  const file = filesInProgress[data.fileId];
  if (!file) {
    const pTag = document.getElementById(data.fileId);
    pTag.style.pointerEvents = "";
    console.error("there was some issue collecting previous file buffer data");
    return;
  }
  const chunk = base64ToArrayBuffer(data.chunk);
  await file.writableStream.write(new Uint8Array(chunk)); // Store the chunk
  file.receivedSize += chunk.byteLength;

  const percentage = ((file.receivedSize / file.fileSize) * 100).toFixed(1);
  file.smallTag.innerText = ` ~ downloading ~ ${percentage}%`;

  // Check if we have received the full file
  if (file.receivedSize >= file.fileSize) {
    await file.writableStream.close();
    const pTag = document.getElementById(data.fileId);
    pTag.removeChild(file.smallTag);
    pTag.style.pointerEvents = "";
    const dc = window.peerConnections[window.senderSocketId][1];
    dc.send(JSON.stringify({type: "message", message: `${window.myUsername}: download finished - ${file.fileName}`}));

    console.log(`File ${file.fileName} received and ready for download.`);
    delete filesInProgress[data.fileId]; // Clean up the buffer
  }

};