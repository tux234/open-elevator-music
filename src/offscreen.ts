// ABOUTME: Offscreen document for audio playback in Chrome MV3
// ABOUTME: Receives messages from service worker to control audio element

const audioElement = document.getElementById('audio-player') as HTMLAudioElement;

if (!audioElement) {
  console.error('Audio element not found in offscreen document');
}

// Add error handling for audio playback
audioElement.addEventListener('error', (e) => {
  console.error('Audio playback error:', e);
});

audioElement.addEventListener('canplay', () => {
  console.log('Audio ready to play');
});

chrome.runtime.onMessage.addListener((message) => {
  console.log('Offscreen received message:', message.type);

  switch (message.type) {
    case 'PLAY':
      audioElement.src = message.url;
      audioElement.play().catch((error) => {
        console.error('Failed to play audio:', error);
      });
      break;
    case 'PAUSE':
      audioElement.pause();
      break;
    case 'SET_VOLUME':
      audioElement.volume = message.volume / 100;
      break;
  }
});
