// ABOUTME: Core type definitions for application state and music sources
// ABOUTME: Defines contracts for Track, MusicSource interface, and AppState

export type SourceType = 'fma' | 'jamendo' | 'radio';

export interface Track {
  title: string;
  artist: string;
  streamUrl: string;
  duration?: number;
}

export interface AppState {
  isPlaying: boolean;
  volume: number; // 0-100
  selectedSource: SourceType;
  currentTrack: Track | null;
  lastError: string | null;
}

export interface MusicSource {
  name: string;
  type: SourceType;
  fetchTrack(): Promise<Track>;
}

export type MessageAction =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE' }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_SOURCE'; source: SourceType }
  | { type: 'GET_STATE' };

export type MessageResponse =
  | { type: 'STATE_UPDATE'; state: AppState }
  | { type: 'ERROR'; error: string };
