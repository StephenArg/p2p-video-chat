import React, { useState, useEffect } from 'react';
import { downloadFile, getFiles } from '../requests';

const FileServer = () => {
  const [sa, setSA] = useState(localStorage.getItem("sa") || "");
  const [serverFoldersFiles, setServerFoldersFiles] = useState(null);
  const [path, setPath] = useState("");

  useEffect(() => {
    //if (sa) // try call to server, if false set pass to ""
    if (sa) {
      (async () => {
        const data = await getFiles(sa, path);
        setServerFoldersFiles(data);
      })();
    }
    // if true then return json list of public and private file folder or just public
    // if can maybe make a pass for me, and a shareable sa for others that lasts 1-7 days
    // and changes itself. I can make an option return to me the public sa when i'm logged out as private
  }, [path]);

  const handleSubmit = async () => {
    const data = await getFiles(sa, path);
    setServerFoldersFiles(data);
  }

  const handleKey = async (e) => {
    if (event.key === 'Enter') handleSubmit();
  };

  const handleDownload = async (pathname) => {
    // request file
    const res = await downloadFile(sa, pathname);
  };

  const handleChangeDir = (pathname) => {
    const newFullPath = path + pathname;
    setPath(newFullPath);
  };

  return (
    <>
      <article className="file-sharing-container">
        <div className="file-sharing-interface">
          <h2 id="file-sharing-h2" style={{ maxWidth: "375px" }}>
            File Server Mode
          </h2>
          {!serverFoldersFiles && (<>
            <input type="text" value={sa} onKeyDown={handleKey} onChange={(e) => setSA(e.target.value)} />
            <button onClick={handleSubmit}>Submit</button>
          </>)}
          {!!serverFoldersFiles && (
            <div
              className='filenames-container'
              style={{
                borderTop: "1px dashed",
                paddingTop: "15px",
                borderRadius: "20px",
                borderBottom: "1px dashed",
                paddingLeft: "30px",
                paddingRight: "30px",
                width: "auto",
              }}
            >
              {serverFoldersFiles.map((data) => {
                return (<p
                  className='filename-size'
                  id={data.name}
                  key={data.path}
                  onClick={data.type === "file" ? () => handleDownload(data.path) : () => handleChangeDir(`/${data.name}`)}
                  style={{
                    alignSelf: 'baseline',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: "flex",
                    flexDirection: "column",
                    color: data.type === "file" ? "" : "blue"
                  }}
                >
                  {data.name}
                </p>)
              })}
              {!serverFoldersFiles.length && "No files in this directory"}
            </div>
          )}
        </div>
      </article>
    </>
  );
};

export default FileServer;