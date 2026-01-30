// ABOUTME: Offscreen document for audio playback in Chrome MV3
// ABOUTME: Receives messages from service worker to control audio element

const audioElement = document.getElementById('audio-player') as HTMLAudioElement;

chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'PLAY':
      audioElement.src = message.url;
      audioElement.play();
      break;
    case 'PAUSE':
      audioElement.pause();
      break;
    case 'SET_VOLUME':
      audioElement.volume = message.volume / 100;
      break;
  }
});
