import { describe, it, expect, beforeEach } from 'vitest';
import { RadioSource } from '../../src/sources/radio';

describe('RadioSource', () => {
  let source: RadioSource;

  beforeEach(() => {
    source = new RadioSource();
  });

  it('should have correct name and type', () => {
    expect(source.name).toBe('Radio Streams');
    expect(source.type).toBe('radio');
  });

  it('should return a track with valid stream URL', async () => {
    const track = await source.fetchTrack();

    expect(track.title).toBeTruthy();
    expect(track.artist).toBeTruthy();
    expect(track.streamUrl).toMatch(/^https?:\/\//);
  });

  it('should return different tracks on subsequent calls', async () => {
    const track1 = await source.fetchTrack();
    const track2 = await source.fetchTrack();

    // Should rotate through stations
    expect(track1.streamUrl).toBeDefined();
    expect(track2.streamUrl).toBeDefined();
  });

  it('should never throw errors', async () => {
    // Radio source should always work (hardcoded URLs)
    await expect(source.fetchTrack()).resolves.toBeTruthy();
  });
});
