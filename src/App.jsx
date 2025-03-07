import React, { useState } from 'react';
import './App.css';
import FileSharing from './components/FileSharing';
import FileServer from './components/FileServer';
import Header from './components/Header';


function App() {
  const p2pModeState = useState(true);
  const [p2pMode] = p2pModeState;

  return (
    <section className="wrapper">
      <div className="content">
        <Header p2pModeState={p2pModeState} />
        {p2pMode ? <FileSharing /> : <FileServer />}
      </div>
    </section>
  )
}

export default App;
