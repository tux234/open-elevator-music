import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioPlayer } from '../../src/background/audio-player';

describe('AudioPlayer', () => {
  let player: AudioPlayer;

  beforeEach(() => {
    player = new AudioPlayer();
    vi.clearAllMocks();
  });

  it('should initialize with default volume', () => {
    expect(player.getVolume()).toBe(80);
  });

  it('should set volume', () => {
    player.setVolume(50);
    expect(player.getVolume()).toBe(50);
  });

  it('should clamp volume between 0 and 100', () => {
    player.setVolume(150);
    expect(player.getVolume()).toBe(100);

    player.setVolume(-10);
    expect(player.getVolume()).toBe(0);
  });

  it('should track playing state', async () => {
    expect(player.isPlaying()).toBe(false);

    await player.play('https://example.com/track.mp3');
    expect(player.isPlaying()).toBe(true);

    player.pause();
    expect(player.isPlaying()).toBe(false);
  });
});
