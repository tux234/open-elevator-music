// ABOUTME: Service worker managing music playback and state coordination
// ABOUTME: Handles source fallback, state persistence, and message routing

import { StorageManager } from '../lib/storage';
import { AudioPlayer } from './audio-player';
import { RadioSource } from '../sources/radio';
import { FMASource } from '../sources/fma';
import { JamendoSource } from '../sources/jamendo';
import type { AppState, MusicSource, SourceType, MessageAction } from '../types';

export class MusicController {
  private storage = new StorageManager();
  private player = new AudioPlayer();
  private state: AppState;

  private sources: Map<SourceType, MusicSource> = new Map<SourceType, MusicSource>([
    ['radio', new RadioSource()],
    ['fma', new FMASource()],
    ['jamendo', new JamendoSource()],
  ]);

  constructor() {
    this.state = {
      isPlaying: false,
      volume: 80,
      selectedSource: 'radio',
      currentTrack: null,
      lastError: null,
    };
    this.init();
  }

  private async init(): Promise<void> {
    this.state = await this.storage.loadState();
    this.player.setVolume(this.state.volume);
  }

  async getState(): Promise<AppState> {
    return { ...this.state };
  }

  async play(): Promise<void> {
    try {
      const track = await this.fetchTrackWithFallback();
      await this.player.play(track.streamUrl);

      this.state.isPlaying = true;
      this.state.currentTrack = track;
      this.state.lastError = null;

      await this.saveState();
      this.updateBadge();
    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error';
      await this.saveState();
    }
  }

  async pause(): Promise<void> {
    this.player.pause();
    this.state.isPlaying = false;
    await this.saveState();
    this.updateBadge();
  }

  async toggle(): Promise<void> {
    if (this.state.isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async setVolume(volume: number): Promise<void> {
    this.player.setVolume(volume);
    this.state.volume = volume;
    await this.saveState();
  }

  async setSource(source: SourceType): Promise<void> {
    this.state.selectedSource = source;
    await this.saveState();
  }

  private async fetchTrackWithFallback(): Promise<any> {
    const sourcePriority: SourceType[] = [
      this.state.selectedSource,
      'radio',
      ...Array.from(this.sources.keys()).filter(
        (s) => s !== this.state.selectedSource && s !== 'radio'
      ),
    ];

    for (const sourceType of sourcePriority) {
      try {
        const source = this.sources.get(sourceType);
        if (source) {
          const track = await source.fetchTrack();
          return track;
        }
      } catch (error) {
        console.error(`Source ${sourceType} failed:`, error);
        continue;
      }
    }

    throw new Error('All music sources failed');
  }

  private async saveState(): Promise<void> {
    await this.storage.saveState(this.state);
  }

  private updateBadge(): void {
    const badge = this.state.isPlaying ? '▶️' : '⏸';
    chrome.action?.setBadgeText({ text: badge });
  }
}

// Initialize controller only when running in extension context (not tests)
if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
  const controller = new MusicController();

  // Handle messages from popup and other contexts
  chrome.runtime.onMessage.addListener((message: MessageAction, sender, sendResponse) => {
    (async () => {
      switch (message.type) {
        case 'PLAY':
          await controller.play();
          break;
        case 'PAUSE':
          await controller.pause();
          break;
        case 'TOGGLE':
          await controller.toggle();
          break;
        case 'SET_VOLUME':
          await controller.setVolume(message.volume);
          break;
        case 'SET_SOURCE':
          await controller.setSource(message.source);
          break;
        case 'GET_STATE':
          const state = await controller.getState();
          sendResponse({ type: 'STATE_UPDATE', state });
          return;
      }
      const state = await controller.getState();
      sendResponse({ type: 'STATE_UPDATE', state });
    })();
    return true; // Keep channel open for async response
  });

  // Handle keyboard shortcut
  chrome.commands?.onCommand.addListener((command) => {
    if (command === 'toggle-music') {
      controller.toggle();
    }
  });

  // Handle context menu
  chrome.contextMenus?.create({
    id: 'toggle-elevator-music',
    title: '🎵 Toggle Elevator Music',
    contexts: ['all'],
  });

  chrome.contextMenus?.onClicked.addListener((info) => {
    if (info.menuItemId === 'toggle-elevator-music') {
      controller.toggle();
    }
  });
}
