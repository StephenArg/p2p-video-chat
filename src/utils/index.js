export const updateDarkmode = (darkmodeBool) => {
  const html = document.getElementsByTagName("html")[0];
  const body = document.getElementsByTagName("body")[0];
  const headerH2 = document.querySelector("header h2");
  const aTags = document.getElementsByClassName("link") || [];
  if (darkmodeBool) {
    // theme color to dark
    localStorage.setItem("darkmode-fileshare", true);
    if (html) html.style.border = "10px solid #151226";
    if (body)
      body.style.background = "#151226";
    body.style.color = "antiquewhite";
    if (headerH2) headerH2.style.color = "#079a8c";
    for (let i = 0; i < aTags.length; i++) if (aTags && aTags[i]) aTags[i].style.color = "aquamarine";
  } else {
    // theme color to light
    localStorage.removeItem("darkmode-fileshare");
    if (html) html.style.border = "10px solid #eee";
    if (body)
      body.style.background = "#fcfcfc";
    body.style.color = "#222";
    if (headerH2) headerH2.style.color = "rgb(112, 128, 216)";
    for (let i = 0; i < aTags.length; i++) if (aTags && aTags[i]) aTags[i].style.color = "#551a8b";
  }
};

export const onResize = () => {
  const width = window.innerWidth;
  const header = document.getElementsByTagName("header")[0];
  const h2 = document.getElementById("video-chat-h2");
  const articles = document.getElementsByTagName("article");
  const pTags = document.getElementsByClassName("filename-size");
  const shareLink = document.getElementsByClassName("share-link")[0];
  const statusBar = document.getElementsByClassName("status-bar")[0];

  if (!header || !articles.length) return;

  if (width > 1175) {
    header.classList.remove("small-header");
    h2.classList.remove("small-h2");
    shareLink?.classList.remove("small-link");
    statusBar?.classList.remove("small-status-bar");
    for (let i = 0; i < articles.length; i++) articles[i].classList.remove("small-article");
    for (let i = 0; i < pTags.length; i++) pTags[i].classList.remove("small-ptag");
  } else {
    header.classList.add("small-header");
    h2.classList.add("small-h2");
    shareLink?.classList.add("small-link");
    statusBar?.classList.add("small-status-bar");
    for (let i = 0; i < articles.length; i++) articles[i].classList.add("small-article");
    for (let i = 0; i < pTags.length; i++) pTags[i].classList.add("small-ptag");
  }
};

window.onresize = onResize;

export const isActiveIceCandidatePair = async (peerConnection) => {
  try {
    const stats = await peerConnection.getStats();
    let activeCandidatePair = null;
    let localCandidate = null;
    let remoteCandidate = null;

    // Loop through the stats reports to find the active candidate pair
    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        activeCandidatePair = report;
      }
    });

    if (activeCandidatePair) {
      // Find local and remote candidates using their IDs
      localCandidate = stats.get(activeCandidatePair.localCandidateId);
      remoteCandidate = stats.get(activeCandidatePair.remoteCandidateId);

      console.log('Active candidate pair found:');
      console.log('Local candidate:', localCandidate);
      console.log('Remote candidate:', remoteCandidate);

      // Extract the candidate types
      const localCandidateType = localCandidate ? localCandidate.candidateType : 'unknown';
      const remoteCandidateType = remoteCandidate ? remoteCandidate.candidateType : 'unknown';

      console.log('Local candidate type:', localCandidateType);
      console.log('Remote candidate type:', remoteCandidateType);

      // Determine if a TURN relay is being used - true if relay;
      return (localCandidateType === 'relay' || remoteCandidateType === 'relay');

    } else {
      console.log('No active candidate pair found.');
      return false;
    }
  } catch (error) {
    console.error('Error checking active ICE candidate pair:', error);
    return false;
  }
};

export const setRoomIdInUrl = (roomId) => {
  if (roomId) {
    window.history.replaceState({}, '', window.location.pathname + `?id=${roomId}`);
  } else {
    window.history.replaceState({}, '', window.location.pathname);
  }
};