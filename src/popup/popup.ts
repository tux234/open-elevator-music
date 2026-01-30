// ABOUTME: Popup UI controller managing user interactions and state updates
// ABOUTME: Communicates with service worker via chrome.runtime.sendMessage

import type { AppState, MessageAction, MessageResponse } from '../types';

class PopupController {
  private playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
  private volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
  private volumeValue = document.getElementById('volume-value') as HTMLSpanElement;
  private sourceSelect = document.getElementById('source-select') as HTMLSelectElement;
  private trackTitle = document.getElementById('track-title') as HTMLDivElement;
  private trackArtist = document.getElementById('track-artist') as HTMLDivElement;

  constructor() {
    this.setupListeners();
    this.loadState();
  }

  private setupListeners(): void {
    this.playPauseBtn.addEventListener('click', () => this.togglePlayback());
    this.volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt((e.target as HTMLInputElement).value);
      this.setVolume(volume);
    });
    this.sourceSelect.addEventListener('change', (e) => {
      const source = (e.target as HTMLSelectElement).value as any;
      this.setSource(source);
    });
  }

  private async sendMessage(action: MessageAction): Promise<AppState> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(action, (response: MessageResponse) => {
        if (response.type === 'STATE_UPDATE') {
          resolve(response.state);
        }
      });
    });
  }

  private async loadState(): Promise<void> {
    const state = await this.sendMessage({ type: 'GET_STATE' });
    this.updateUI(state);
  }

  private async togglePlayback(): Promise<void> {
    const state = await this.sendMessage({ type: 'TOGGLE' });
    this.updateUI(state);
  }

  private async setVolume(volume: number): Promise<void> {
    this.volumeValue.textContent = `${volume}%`;
    const state = await this.sendMessage({ type: 'SET_VOLUME', volume });
    this.updateUI(state);
  }

  private async setSource(source: any): Promise<void> {
    const state = await this.sendMessage({ type: 'SET_SOURCE', source });
    this.updateUI(state);
  }

  private updateUI(state: AppState): void {
    // Update play/pause button
    this.playPauseBtn.textContent = state.isPlaying ? '⏸ Pause' : '▶️ Play';

    // Update track info
    if (state.currentTrack) {
      this.trackTitle.textContent = state.currentTrack.title;
      this.trackArtist.textContent = state.currentTrack.artist;
    } else {
      this.trackTitle.textContent = 'Not playing';
      this.trackArtist.textContent = '—';
    }

    // Update volume
    this.volumeSlider.value = state.volume.toString();
    this.volumeValue.textContent = `${state.volume}%`;

    // Update source
    this.sourceSelect.value = state.selectedSource;
  }
}

// Initialize popup
new PopupController();
