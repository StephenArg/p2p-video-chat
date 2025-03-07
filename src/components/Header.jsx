import React, { useState, useEffect } from 'react';
import { updateDarkmode } from '../utils';

const Header = ({ darkmodeState, p2pModeState }) => {
  const [darkmode, setDarkmode] = useState(!!localStorage.getItem("darkmode-fileshare") || !!localStorage.getItem("darkmode"));
  const [p2pMode, setP2pMode] = p2pModeState;

  useEffect(() => {
    updateDarkmode(darkmode);
  }, [darkmode]);

  return (
    <header>
      <div className="about">
        <h2>P2P file sharing</h2>
        <h1>ARGENTINA</h1>
        <p>Send files over directly to someone peer to peer</p>
        <p style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "15px" }}>No size limits!</span>
          <span style={{ fontSize: "9px" }} >**If you use the latest versions of Chrome, Edge, or Opera**</span>
          <span style={{ fontSize: "9px" }} >***Don't blame me, other browsers don't provide the API needed to write straight to disk***</span>
          <span style={{ fontSize: "9px" }} >****less than 2gb shouldn't be an issue anyway****</span>
        </p>
        <p style={{ fontSize: "x-small", width: "187px" }}>Just a heads up though, I'm not paying for a <a className="link" href="https://medium.com/@jamesbordane57/what-is-a-turn-server-7e19631031db">TURN server</a> so if you have a funky firewall setup you're on your own. I recommend refreshing a few times if it isn't connecting though</p>
        <p><a className="link" href="mailto:vero@sargentina.dev">Email</a> me if you have any issues, with the tool or in life. I'll try to hear you out</p>
        <p className="dark-mode">
          <b>Dark Mode:</b> <input onChange={() => setDarkmode(s => !s)} type="checkbox" checked={darkmode} />
          <br></br>
          <b>P2P Mode:</b> <input onChange={() => setP2pMode(s => !s)} type="checkbox" checked={p2pMode} />
        </p>
        <p>Click <a className="link" href="/">here</a> to go back to my main site or <a className="link" href="/filesharing">here</a> to send files</p>
      </div>
    </header>
  )
};

export default Header;