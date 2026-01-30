// ABOUTME: Jamendo music source with curated easy-listening tracks
// ABOUTME: MVP uses hardcoded track list, API integration ready for future

import type { MusicSource, Track } from '../types';

export class JamendoSource implements MusicSource {
  readonly name = 'Jamendo';
  readonly type = 'jamendo' as const;

  private curatedTracks: Track[] = [
    {
      title: 'Easy Listening Instrumental',
      artist: 'Jamendo Artists',
      streamUrl: 'https://mp3d.jamendo.com/download/track/1524098/mp32',
    },
    {
      title: 'Smooth Background',
      artist: 'Jamendo Artists',
      streamUrl: 'https://mp3d.jamendo.com/download/track/1524099/mp32',
    },
    {
      title: 'Elevator Vibes',
      artist: 'Jamendo Artists',
      streamUrl: 'https://mp3d.jamendo.com/download/track/1524100/mp32',
    },
  ];

  private currentIndex = 0;

  async fetchTrack(): Promise<Track> {
    try {
      const track = this.curatedTracks[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.curatedTracks.length;
      return track;
    } catch (error) {
      return this.curatedTracks[0];
    }
  }
}
