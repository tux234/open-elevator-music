import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JamendoSource } from '../../src/sources/jamendo';

describe('JamendoSource', () => {
  let source: JamendoSource;

  beforeEach(() => {
    source = new JamendoSource();
    vi.clearAllMocks();
  });

  it('should have correct name and type', () => {
    expect(source.name).toBe('Jamendo');
    expect(source.type).toBe('jamendo');
  });

  it('should fetch track from curated list', async () => {
    const track = await source.fetchTrack();

    expect(track.title).toBeTruthy();
    expect(track.artist).toBeTruthy();
    expect(track.streamUrl).toMatch(/^https?:\/\//);
  });

  it('should handle errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const track = await source.fetchTrack();
    expect(track).toBeTruthy();
  });
});
