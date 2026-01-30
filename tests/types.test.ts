import { describe, it, expect } from 'vitest';
import type { AppState, Track, MusicSource } from '../src/types';

describe('Type Definitions', () => {
  it('should create valid AppState', () => {
    const state: AppState = {
      isPlaying: false,
      volume: 80,
      selectedSource: 'radio',
      currentTrack: null,
      lastError: null,
    };

    expect(state.volume).toBe(80);
    expect(state.selectedSource).toBe('radio');
  });

  it('should create valid Track', () => {
    const track: Track = {
      title: 'Test Song',
      artist: 'Test Artist',
      streamUrl: 'https://example.com/stream.mp3',
    };

    expect(track.title).toBe('Test Song');
    expect(track.streamUrl).toContain('https://');
  });
});
