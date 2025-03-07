import React from 'react';

const convertBytesToFilesize = (bytes) => {
  const kb = bytes / 1000;
  if (kb < 1000) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1000;
  if (mb < 1000) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1000;
  if (gb < 1000) return `${gb.toFixed(1)} GB`;
  const tb = gb / 1000;
  return `${tb.toFixed(1)} TB`;
};

const constructFilenameSizeString = (name, sizeStr) => {
  let nameSenzaExt = name.split(".");
  const ext = nameSenzaExt.pop();
  nameSenzaExt = nameSenzaExt.join(".");
  const postString = `.${ext} - ${sizeStr}`;

  const remainingChars = 57 - postString.length;
  if (nameSenzaExt.length > remainingChars) {
    nameSenzaExt = nameSenzaExt.substring(0, 37) + "..";
  }

  return nameSenzaExt + postString;
};

const Filename = ({ data, isReceiver }) => {
  const size = convertBytesToFilesize(data.size);

  const handleDownload = async () => {
    const fileId = data.id;
    if (!isReceiver) return;
    if (!window.senderSocketId || !window.socket) alert("Something went wrong. Try refreshing the page");
      // this is this structure of sending via the data channel
      const pTag = document.getElementById(fileId);
      pTag.style.pointerEvents = "none";
      window.peerConnections[window.senderSocketId][1].send(JSON.stringify({
        type: "requestFile",
        id: fileId,
        fromSocketId: window.socket.id,
        toDisk: !!window.showSaveFilePicker,
      }));
  }

  return (
    <p
      className='filename-size'
      id={data.id}
      onClick={handleDownload}
      style={{
        alignSelf: 'baseline',
        textAlign: 'left',
        cursor: isReceiver ? 'pointer' : "",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {constructFilenameSizeString(data.name, size)}
    </p>
  )
};

export default Filename;