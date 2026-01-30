// ABOUTME: Chrome storage wrapper for persisting application state
// ABOUTME: Handles saving/loading AppState to chrome.storage.sync with defaults

import type { AppState } from '../types';

export class StorageManager {
  private readonly STORAGE_KEY = 'appState';

  private readonly DEFAULT_STATE: AppState = {
    isPlaying: false,
    volume: 80,
    selectedSource: 'radio',
    currentTrack: null,
    lastError: null,
  };

  async saveState(state: AppState): Promise<void> {
    await chrome.storage.sync.set({ [this.STORAGE_KEY]: state });
  }

  async loadState(): Promise<AppState> {
    const result = await chrome.storage.sync.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || this.DEFAULT_STATE;
  }
}
