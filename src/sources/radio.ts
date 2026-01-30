// ABOUTME: Radio stream music source - most reliable fallback with hardcoded URLs
// ABOUTME: Uses SomaFM stations with direct streaming URLs, no API calls

import type { MusicSource, Track } from '../types';

interface RadioStation {
  title: string;
  artist: string;
  streamUrl: string;
}

export class RadioSource implements MusicSource {
  readonly name = 'Radio Streams';
  readonly type = 'radio' as const;

  private stations: RadioStation[] = [
    {
      title: 'Groove Salad',
      artist: 'SomaFM',
      streamUrl: 'https://somafm.com/groovesalad256.pls',
    },
    {
      title: 'Lush',
      artist: 'SomaFM',
      streamUrl: 'https://somafm.com/lush256.pls',
    },
    {
      title: 'Drone Zone',
      artist: 'SomaFM',
      streamUrl: 'https://somafm.com/dronezone256.pls',
    },
    {
      title: 'Deep Space One',
      artist: 'SomaFM',
      streamUrl: 'https://somafm.com/deepspaceone256.pls',
    },
  ];

  private currentIndex = 0;

  async fetchTrack(): Promise<Track> {
    const station = this.stations[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.stations.length;
    return station;
  }
}
