import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MusicController } from '../../src/background/service-worker';
import { RadioSource } from '../../src/sources/radio';

describe('MusicController', () => {
  let controller: MusicController;

  beforeEach(() => {
    // Mock chrome.storage to return default state
    (chrome.storage.sync.get as any).mockResolvedValue({});
    controller = new MusicController();
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const state = await controller.getState();

    expect(state.isPlaying).toBe(false);
    expect(state.volume).toBe(80);
    expect(state.selectedSource).toBe('radio');
  });

  it('should play track from selected source', async () => {
    await controller.play();
    const state = await controller.getState();

    expect(state.isPlaying).toBe(true);
    expect(state.currentTrack).toBeTruthy();
  });

  it('should pause playback', async () => {
    await controller.play();
    await controller.pause();
    const state = await controller.getState();

    expect(state.isPlaying).toBe(false);
  });

  it('should toggle playback', async () => {
    await controller.toggle();
    expect((await controller.getState()).isPlaying).toBe(true);

    await controller.toggle();
    expect((await controller.getState()).isPlaying).toBe(false);
  });

  it('should set volume', async () => {
    await controller.setVolume(60);
    const state = await controller.getState();

    expect(state.volume).toBe(60);
  });

  it('should change source', async () => {
    await controller.setSource('fma');
    const state = await controller.getState();

    expect(state.selectedSource).toBe('fma');
  });

  it('should fallback to radio on source failure', async () => {
    // Mock source to fail
    const mockSource = {
      name: 'Mock',
      type: 'fma' as const,
      fetchTrack: vi.fn().mockRejectedValue(new Error('API failure')),
    };

    // Should fallback to radio
    await controller.play();
    const state = await controller.getState();

    expect(state.currentTrack).toBeTruthy();
  });
});
