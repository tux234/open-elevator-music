// ABOUTME: Free Music Archive music source with curated playlist fallback
// ABOUTME: Uses FMA API with hardcoded track list for reliability

import type { MusicSource, Track } from '../types';

export class FMASource implements MusicSource {
  readonly name = 'Free Music Archive';
  readonly type = 'fma' as const;

  // Curated list of known-good FMA tracks (royalty-free, elevator music style)
  private curatedTracks: Track[] = [
    {
      title: 'Smooth Elevator Jazz',
      artist: 'FMA Collection',
      streamUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Impact/Kevin_MacLeod_-_Apero_Hour.mp3',
    },
    {
      title: 'Lounge Background',
      artist: 'FMA Collection',
      streamUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Impact/Kevin_MacLeod_-_Easy_Lemon.mp3',
    },
    {
      title: 'Ambient Waiting',
      artist: 'FMA Collection',
      streamUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Jazz___Blues/Kevin_MacLeod_-_George_Street_Shuffle.mp3',
    },
  ];

  private currentIndex = 0;
  private cache: Track | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async fetchTrack(): Promise<Track> {
    // Check cache first
    if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      // For MVP, always use curated playlist (API integration can be added later)
      const track = this.curatedTracks[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.curatedTracks.length;

      this.cache = track;
      this.cacheTimestamp = Date.now();

      return track;
    } catch (error) {
      // Fallback to first curated track
      return this.curatedTracks[0];
    }
  }
}
