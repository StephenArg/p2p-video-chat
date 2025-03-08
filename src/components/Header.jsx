import React, { useState, useEffect } from 'react';
import { updateDarkmode } from '../utils';

const Header = () => {
  const [darkmode, setDarkmode] = useState(!!localStorage.getItem("darkmode-fileshare") || !!localStorage.getItem("darkmode"));
  useEffect(() => {
    updateDarkmode(darkmode);
  }, [darkmode]);

  return (
    <header>
      <div className="about">
        <h2>Peer to Peer Video Chat</h2>
        <h1>ARGENTINA</h1>
        <p>Have video chats directly, peer to peer</p>
        <p style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "15px" }}>Unlimited video calling on non-relayed connections!</span>
          <p style={{ fontSize: "x-small", width: "187px" }}>Just a heads up though, I'm not paying for a <a className="link" href="https://medium.com/@jamesbordane57/what-is-a-turn-server-7e19631031db">TURN server</a> so if you have a funky firewall setup you're on your own. I recommend refreshing a few times if it isn't connecting though</p>
        </p>
        <p><a className="link" href="mailto:vero@sargentina.dev">Email</a> me if you have any issues, with the tool or in life. I'll try to hear you out</p>
        <p className="dark-mode">
          <b>Dark Mode:</b> <input onChange={() => setDarkmode(s => !s)} type="checkbox" checked={darkmode} />
        </p>
        <p>Click <a className="link" href="/">here</a> to go back to my main site or <a className="link" href="/p2p-chat">here</a> to send make a new room</p>
      </div>
    </header>
  )
};

export default Header;