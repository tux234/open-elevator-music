import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from '../../src/lib/storage';
import type { AppState } from '../../src/types';

describe('StorageManager', () => {
  let storage: StorageManager;

  const defaultState: AppState = {
    isPlaying: false,
    volume: 80,
    selectedSource: 'radio',
    currentTrack: null,
    lastError: null,
  };

  beforeEach(() => {
    storage = new StorageManager();
    vi.clearAllMocks();
  });

  it('should save state to chrome.storage.sync', async () => {
    (chrome.storage.sync.set as any).mockResolvedValue(undefined);

    await storage.saveState(defaultState);

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ appState: defaultState });
  });

  it('should load state from chrome.storage.sync', async () => {
    (chrome.storage.sync.get as any).mockResolvedValue({ appState: defaultState });

    const state = await storage.loadState();

    expect(chrome.storage.sync.get).toHaveBeenCalledWith('appState');
    expect(state).toEqual(defaultState);
  });

  it('should return default state when no saved state exists', async () => {
    (chrome.storage.sync.get as any).mockResolvedValue({});

    const state = await storage.loadState();

    expect(state.isPlaying).toBe(false);
    expect(state.volume).toBe(80);
    expect(state.selectedSource).toBe('radio');
  });
});
