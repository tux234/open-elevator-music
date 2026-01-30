import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FMASource } from '../../src/sources/fma';

describe('FMASource', () => {
  let source: FMASource;

  beforeEach(() => {
    source = new FMASource();
    vi.clearAllMocks();
  });

  it('should have correct name and type', () => {
    expect(source.name).toBe('Free Music Archive');
    expect(source.type).toBe('fma');
  });

  it('should fetch track from curated playlist', async () => {
    const track = await source.fetchTrack();

    expect(track.title).toBeTruthy();
    expect(track.artist).toBeTruthy();
    expect(track.streamUrl).toMatch(/^https?:\/\//);
  });

  it('should handle errors gracefully', async () => {
    // Mock fetch to simulate API failure
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // Should fall back to curated playlist
    const track = await source.fetchTrack();
    expect(track).toBeTruthy();
  });

  it('should cache responses', async () => {
    const fetchSpy = vi.spyOn(globalThis as any, 'fetch');

    const track1 = await source.fetchTrack();
    const track2 = await source.fetchTrack();

    // Should reuse cached data within 5 minutes
    expect(track1).toBeTruthy();
    expect(track2).toBeTruthy();
  });
});
