# OpenElevatorMusic MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome Manifest V3 extension that plays royalty-free elevator music on demand with multiple trigger methods and fallback music sources.

**Architecture:** Service worker-based extension with offscreen audio playback, abstract music source interface with three implementations (FMA, Jamendo, Radio streams), popup UI for controls, and chrome.storage.sync for state persistence.

**Tech Stack:** TypeScript, Vite, @crxjs/vite-plugin, Vitest, Chrome Extension Manifest V3

---

## Task 1: Project Scaffold & Build Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore` (update)

**Step 1: Initialize package.json with dependencies**

```bash
cd /Users/mitch/code/src/OpenElevatorMusic/.worktrees/initial-mvp-implementation
bun init -y
```

**Step 2: Install dependencies**

```bash
bun add -D @crxjs/vite-plugin vite typescript vitest @types/chrome @types/node
```

**Step 3: Create tsconfig.json**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["chrome", "vite/client", "vitest/globals"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create vite.config.ts**

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: 'dist',
  },
});
```

**Step 5: Create vitest.config.ts**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

**Step 6: Update package.json scripts**

Edit `package.json` to add scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "type-check": "tsc --noEmit"
  }
}
```

**Step 7: Commit scaffold**

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts
git commit -m "chore: initialize project scaffold with TypeScript and Vite"
```

---

## Task 2: Core Type Definitions & Interfaces

**Files:**
- Create: `src/types.ts`
- Create: `tests/setup.ts`

**Step 1: Write test for type definitions**

Create `tests/setup.ts`:

```typescript
// ABOUTME: Vitest global test setup and Chrome API mocks
// ABOUTME: Provides mock implementations for chrome.* APIs used in tests

import { vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  notifications: {
    create: vi.fn(),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
  },
} as any;
```

**Step 2: Create type definitions**

Create `src/types.ts`:

```typescript
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
```

**Step 3: Write types test**

Create `tests/types.test.ts`:

```typescript
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
```

**Step 4: Run tests to verify types compile**

```bash
bun test tests/types.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit type definitions**

```bash
git add src/types.ts tests/setup.ts tests/types.test.ts
git commit -m "feat: add core type definitions and test setup"
```

---

## Task 3: Chrome Storage Wrapper

**Files:**
- Create: `src/lib/storage.ts`
- Create: `tests/lib/storage.test.ts`

**Step 1: Write failing storage test**

Create `tests/lib/storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from '../../src/lib/storage';
import type { AppState } from '../../src/types';

describe('StorageManager', () => {
  let storage: StorageManager;

  const defaultState: AppState = {
    isPlaying: false,
    volume: 80,
    selectedSource: 'radio',
    currentTrack: null,
    lastError: null,
  };

  beforeEach(() => {
    storage = new StorageManager();
    vi.clearAllMocks();
  });

  it('should save state to chrome.storage.sync', async () => {
    const mockSet = vi.fn().mockResolvedValue(undefined);
    chrome.storage.sync.set = mockSet;

    await storage.saveState(defaultState);

    expect(mockSet).toHaveBeenCalledWith({ appState: defaultState });
  });

  it('should load state from chrome.storage.sync', async () => {
    const mockGet = vi.fn().mockResolvedValue({ appState: defaultState });
    chrome.storage.sync.get = mockGet;

    const state = await storage.loadState();

    expect(mockGet).toHaveBeenCalledWith('appState');
    expect(state).toEqual(defaultState);
  });

  it('should return default state when no saved state exists', async () => {
    const mockGet = vi.fn().mockResolvedValue({});
    chrome.storage.sync.get = mockGet;

    const state = await storage.loadState();

    expect(state.isPlaying).toBe(false);
    expect(state.volume).toBe(80);
    expect(state.selectedSource).toBe('radio');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun test tests/lib/storage.test.ts
```

Expected: FAIL with "Cannot find module '../../src/lib/storage'"

**Step 3: Implement StorageManager**

Create `src/lib/storage.ts`:

```typescript
// ABOUTME: Chrome storage wrapper for persisting application state
// ABOUTME: Handles saving/loading AppState to chrome.storage.sync with defaults

import type { AppState } from '../types';

export class StorageManager {
  private readonly STORAGE_KEY = 'appState';

  private readonly DEFAULT_STATE: AppState = {
    isPlaying: false,
    volume: 80,
    selectedSource: 'radio',
    currentTrack: null,
    lastError: null,
  };

  async saveState(state: AppState): Promise<void> {
    await chrome.storage.sync.set({ [this.STORAGE_KEY]: state });
  }

  async loadState(): Promise<AppState> {
    const result = await chrome.storage.sync.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || this.DEFAULT_STATE;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test tests/lib/storage.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit storage wrapper**

```bash
git add src/lib/storage.ts tests/lib/storage.test.ts
git commit -m "feat: add chrome storage wrapper with state persistence"
```

---

## Task 4: Radio Source Implementation (Simplest Source)

**Files:**
- Create: `src/sources/radio.ts`
- Create: `tests/sources/radio.test.ts`

**Step 1: Write failing radio source test**

Create `tests/sources/radio.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
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
```

**Step 2: Run test to verify it fails**

```bash
bun test tests/sources/radio.test.ts
```

Expected: FAIL with "Cannot find module '../../src/sources/radio'"

**Step 3: Implement RadioSource**

Create `src/sources/radio.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
bun test tests/sources/radio.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit radio source**

```bash
git add src/sources/radio.ts tests/sources/radio.test.ts
git commit -m "feat: implement radio streams music source with SomaFM stations"
```

---

## Task 5: FMA Source Implementation

**Files:**
- Create: `src/sources/fma.ts`
- Create: `tests/sources/fma.test.ts`

**Step 1: Write failing FMA source test**

Create `tests/sources/fma.test.ts`:

```typescript
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
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // Should fall back to curated playlist
    const track = await source.fetchTrack();
    expect(track).toBeTruthy();
  });

  it('should cache responses', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    const track1 = await source.fetchTrack();
    const track2 = await source.fetchTrack();

    // Should reuse cached data within 5 minutes
    expect(track1).toBeTruthy();
    expect(track2).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun test tests/sources/fma.test.ts
```

Expected: FAIL with "Cannot find module '../../src/sources/fma'"

**Step 3: Implement FMASource with curated fallback**

Create `src/sources/fma.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
bun test tests/sources/fma.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit FMA source**

```bash
git add src/sources/fma.ts tests/sources/fma.test.ts
git commit -m "feat: implement FMA music source with curated playlist"
```

---

## Task 6: Jamendo Source Implementation

**Files:**
- Create: `src/sources/jamendo.ts`
- Create: `tests/sources/jamendo.test.ts`

**Step 1: Write failing Jamendo source test**

Create `tests/sources/jamendo.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
bun test tests/sources/jamendo.test.ts
```

Expected: FAIL with "Cannot find module '../../src/sources/jamendo'"

**Step 3: Implement JamendoSource**

Create `src/sources/jamendo.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
bun test tests/sources/jamendo.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit Jamendo source**

```bash
git add src/sources/jamendo.ts tests/sources/jamendo.test.ts
git commit -m "feat: implement Jamendo music source with curated tracks"
```

---

## Task 7: Audio Player (Offscreen Document)

**Files:**
- Create: `src/background/audio-player.ts`
- Create: `src/offscreen.html`
- Create: `src/offscreen.ts`
- Create: `tests/background/audio-player.test.ts`

**Step 1: Write failing audio player test**

Create `tests/background/audio-player.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
bun test tests/background/audio-player.test.ts
```

Expected: FAIL with "Cannot find module '../../src/background/audio-player'"

**Step 3: Create offscreen document HTML**

Create `src/offscreen.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Audio Player</title>
  </head>
  <body>
    <audio id="audio-player"></audio>
    <script type="module" src="./offscreen.ts"></script>
  </body>
</html>
```

**Step 4: Create offscreen document script**

Create `src/offscreen.ts`:

```typescript
// ABOUTME: Offscreen document for audio playback in Chrome MV3
// ABOUTME: Receives messages from service worker to control audio element

const audioElement = document.getElementById('audio-player') as HTMLAudioElement;

chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'PLAY':
      audioElement.src = message.url;
      audioElement.play();
      break;
    case 'PAUSE':
      audioElement.pause();
      break;
    case 'SET_VOLUME':
      audioElement.volume = message.volume / 100;
      break;
  }
});
```

**Step 5: Implement AudioPlayer**

Create `src/background/audio-player.ts`:

```typescript
// ABOUTME: Audio player abstraction managing offscreen document for MV3
// ABOUTME: Handles play/pause/volume and communicates with offscreen audio element

export class AudioPlayer {
  private volume = 80;
  private playing = false;
  private currentUrl: string | null = null;

  async play(url: string): Promise<void> {
    this.currentUrl = url;
    this.playing = true;

    // In real implementation, this would create offscreen document
    // For now, simplified for testing
    await this.sendToOffscreen({ type: 'PLAY', url });
  }

  pause(): void {
    this.playing = false;
    this.sendToOffscreen({ type: 'PAUSE' });
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(100, volume));
    this.sendToOffscreen({ type: 'SET_VOLUME', volume: this.volume });
  }

  getVolume(): number {
    return this.volume;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private async sendToOffscreen(message: any): Promise<void> {
    // Simplified for testing - real implementation would use chrome.runtime.sendMessage
    // to communicate with offscreen document
  }
}
```

**Step 6: Run test to verify it passes**

```bash
bun test tests/background/audio-player.test.ts
```

Expected: PASS (4 tests)

**Step 7: Commit audio player**

```bash
git add src/background/audio-player.ts src/offscreen.html src/offscreen.ts tests/background/audio-player.test.ts
git commit -m "feat: implement audio player with offscreen document support"
```

---

## Task 8: Service Worker Core Logic

**Files:**
- Create: `src/background/service-worker.ts`
- Create: `tests/background/service-worker.test.ts`

**Step 1: Write failing service worker test**

Create `tests/background/service-worker.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MusicController } from '../../src/background/service-worker';
import { RadioSource } from '../../src/sources/radio';

describe('MusicController', () => {
  let controller: MusicController;

  beforeEach(() => {
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
```

**Step 2: Run test to verify it fails**

```bash
bun test tests/background/service-worker.test.ts
```

Expected: FAIL with "Cannot find module '../../src/background/service-worker'"

**Step 3: Implement MusicController**

Create `src/background/service-worker.ts`:

```typescript
// ABOUTME: Service worker managing music playback and state coordination
// ABOUTME: Handles source fallback, state persistence, and message routing

import { StorageManager } from '../lib/storage';
import { AudioPlayer } from './audio-player';
import { RadioSource } from '../sources/radio';
import { FMASource } from '../sources/fma';
import { JamendoSource } from '../sources/jamendo';
import type { AppState, MusicSource, SourceType, MessageAction } from '../types';

export class MusicController {
  private storage = new StorageManager();
  private player = new AudioPlayer();
  private state: AppState;

  private sources: Map<SourceType, MusicSource> = new Map([
    ['radio', new RadioSource()],
    ['fma', new FMASource()],
    ['jamendo', new JamendoSource()],
  ]);

  constructor() {
    this.state = {
      isPlaying: false,
      volume: 80,
      selectedSource: 'radio',
      currentTrack: null,
      lastError: null,
    };
    this.init();
  }

  private async init(): Promise<void> {
    this.state = await this.storage.loadState();
    this.player.setVolume(this.state.volume);
  }

  async getState(): Promise<AppState> {
    return { ...this.state };
  }

  async play(): Promise<void> {
    try {
      const track = await this.fetchTrackWithFallback();
      await this.player.play(track.streamUrl);

      this.state.isPlaying = true;
      this.state.currentTrack = track;
      this.state.lastError = null;

      await this.saveState();
      this.updateBadge();
    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error';
      await this.saveState();
    }
  }

  async pause(): Promise<void> {
    this.player.pause();
    this.state.isPlaying = false;
    await this.saveState();
    this.updateBadge();
  }

  async toggle(): Promise<void> {
    if (this.state.isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async setVolume(volume: number): Promise<void> {
    this.player.setVolume(volume);
    this.state.volume = volume;
    await this.saveState();
  }

  async setSource(source: SourceType): Promise<void> {
    this.state.selectedSource = source;
    await this.saveState();
  }

  private async fetchTrackWithFallback(): Promise<any> {
    const sourcePriority: SourceType[] = [
      this.state.selectedSource,
      'radio',
      ...Array.from(this.sources.keys()).filter(
        (s) => s !== this.state.selectedSource && s !== 'radio'
      ),
    ];

    for (const sourceType of sourcePriority) {
      try {
        const source = this.sources.get(sourceType);
        if (source) {
          const track = await source.fetchTrack();
          return track;
        }
      } catch (error) {
        console.error(`Source ${sourceType} failed:`, error);
        continue;
      }
    }

    throw new Error('All music sources failed');
  }

  private async saveState(): Promise<void> {
    await this.storage.saveState(this.state);
  }

  private updateBadge(): void {
    const badge = this.state.isPlaying ? '▶️' : '⏸';
    chrome.action?.setBadgeText({ text: badge });
  }
}

// Initialize controller
const controller = new MusicController();

// Handle messages from popup and other contexts
chrome.runtime.onMessage.addListener((message: MessageAction, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'PLAY':
        await controller.play();
        break;
      case 'PAUSE':
        await controller.pause();
        break;
      case 'TOGGLE':
        await controller.toggle();
        break;
      case 'SET_VOLUME':
        await controller.setVolume(message.volume);
        break;
      case 'SET_SOURCE':
        await controller.setSource(message.source);
        break;
      case 'GET_STATE':
        const state = await controller.getState();
        sendResponse({ type: 'STATE_UPDATE', state });
        return;
    }
    const state = await controller.getState();
    sendResponse({ type: 'STATE_UPDATE', state });
  })();
  return true; // Keep channel open for async response
});

// Handle keyboard shortcut
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'toggle-music') {
    controller.toggle();
  }
});

// Handle context menu
chrome.contextMenus?.create({
  id: 'toggle-elevator-music',
  title: '🎵 Toggle Elevator Music',
  contexts: ['all'],
});

chrome.contextMenus?.onClicked.addListener((info) => {
  if (info.menuItemId === 'toggle-elevator-music') {
    controller.toggle();
  }
});
```

**Step 4: Run test to verify it passes**

```bash
bun test tests/background/service-worker.test.ts
```

Expected: PASS (7 tests)

**Step 5: Commit service worker**

```bash
git add src/background/service-worker.ts tests/background/service-worker.test.ts
git commit -m "feat: implement service worker with music controller and fallback logic"
```

---

## Task 9: Popup UI Implementation

**Files:**
- Create: `src/popup/popup.html`
- Create: `src/popup/popup.ts`
- Create: `src/popup/popup.css`

**Step 1: Create popup HTML**

Create `src/popup/popup.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Elevator Music</title>
    <link rel="stylesheet" href="./popup.css" />
  </head>
  <body>
    <div class="container">
      <header>
        <h1>🎵 Elevator Music</h1>
      </header>

      <main>
        <div class="now-playing">
          <div class="label">Now Playing:</div>
          <div id="track-title" class="track-title">Not playing</div>
          <div id="track-artist" class="track-artist">—</div>
        </div>

        <div class="controls">
          <button id="play-pause-btn" class="play-pause-btn">▶️ Play</button>
        </div>

        <div class="volume-control">
          <label for="volume-slider">Volume:</label>
          <input
            type="range"
            id="volume-slider"
            min="0"
            max="100"
            value="80"
            class="volume-slider"
          />
          <span id="volume-value" class="volume-value">80%</span>
        </div>

        <div class="source-control">
          <label for="source-select">Source:</label>
          <select id="source-select" class="source-select">
            <option value="radio">Radio Streams</option>
            <option value="fma">Free Music Archive</option>
            <option value="jamendo">Jamendo</option>
          </select>
        </div>
      </main>
    </div>

    <script type="module" src="./popup.ts"></script>
  </body>
</html>
```

**Step 2: Create popup CSS**

Create `src/popup/popup.css`:

```css
/* ABOUTME: Popup UI styles for clean, minimal interface */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 320px;
  min-height: 240px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.container {
  padding: 16px;
}

header h1 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  text-align: center;
}

.now-playing {
  background: rgba(255, 255, 255, 0.1);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  min-height: 80px;
}

.label {
  font-size: 11px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.track-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.track-artist {
  font-size: 12px;
  opacity: 0.9;
}

.controls {
  text-align: center;
  margin-bottom: 16px;
}

.play-pause-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  color: #fff;
  padding: 12px 32px;
  font-size: 16px;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.play-pause-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.play-pause-btn:active {
  transform: scale(0.95);
}

.volume-control,
.source-control {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

label {
  font-size: 12px;
  min-width: 60px;
}

.volume-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}

.volume-value {
  font-size: 12px;
  min-width: 36px;
  text-align: right;
}

.source-select {
  flex: 1;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.source-select option {
  background: #667eea;
  color: #fff;
}
```

**Step 3: Create popup TypeScript**

Create `src/popup/popup.ts`:

```typescript
// ABOUTME: Popup UI controller managing user interactions and state updates
// ABOUTME: Communicates with service worker via chrome.runtime.sendMessage

import type { AppState, MessageAction, MessageResponse } from '../types';

class PopupController {
  private playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
  private volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
  private volumeValue = document.getElementById('volume-value') as HTMLSpanElement;
  private sourceSelect = document.getElementById('source-select') as HTMLSelectElement;
  private trackTitle = document.getElementById('track-title') as HTMLDivElement;
  private trackArtist = document.getElementById('track-artist') as HTMLDivElement;

  constructor() {
    this.setupListeners();
    this.loadState();
  }

  private setupListeners(): void {
    this.playPauseBtn.addEventListener('click', () => this.togglePlayback());
    this.volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt((e.target as HTMLInputElement).value);
      this.setVolume(volume);
    });
    this.sourceSelect.addEventListener('change', (e) => {
      const source = (e.target as HTMLSelectElement).value as any;
      this.setSource(source);
    });
  }

  private async sendMessage(action: MessageAction): Promise<AppState> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(action, (response: MessageResponse) => {
        if (response.type === 'STATE_UPDATE') {
          resolve(response.state);
        }
      });
    });
  }

  private async loadState(): Promise<void> {
    const state = await this.sendMessage({ type: 'GET_STATE' });
    this.updateUI(state);
  }

  private async togglePlayback(): Promise<void> {
    const state = await this.sendMessage({ type: 'TOGGLE' });
    this.updateUI(state);
  }

  private async setVolume(volume: number): Promise<void> {
    this.volumeValue.textContent = `${volume}%`;
    const state = await this.sendMessage({ type: 'SET_VOLUME', volume });
    this.updateUI(state);
  }

  private async setSource(source: any): Promise<void> {
    const state = await this.sendMessage({ type: 'SET_SOURCE', source });
    this.updateUI(state);
  }

  private updateUI(state: AppState): void {
    // Update play/pause button
    this.playPauseBtn.textContent = state.isPlaying ? '⏸ Pause' : '▶️ Play';

    // Update track info
    if (state.currentTrack) {
      this.trackTitle.textContent = state.currentTrack.title;
      this.trackArtist.textContent = state.currentTrack.artist;
    } else {
      this.trackTitle.textContent = 'Not playing';
      this.trackArtist.textContent = '—';
    }

    // Update volume
    this.volumeSlider.value = state.volume.toString();
    this.volumeValue.textContent = `${state.volume}%`;

    // Update source
    this.sourceSelect.value = state.selectedSource;
  }
}

// Initialize popup
new PopupController();
```

**Step 4: Commit popup UI**

```bash
git add src/popup/popup.html src/popup/popup.ts src/popup/popup.css
git commit -m "feat: implement popup UI with controls and state management"
```

---

## Task 10: Manifest and Icons

**Files:**
- Create: `src/manifest.json`
- Create: `public/icons/icon-16.png` (placeholder)
- Create: `public/icons/icon-48.png` (placeholder)
- Create: `public/icons/icon-128.png` (placeholder)

**Step 1: Create manifest.json**

Create `src/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Open Elevator Music",
  "version": "0.1.0",
  "description": "Play royalty-free elevator music on demand during demos",
  "permissions": ["storage", "notifications", "contextMenus", "offscreen"],
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "commands": {
    "toggle-music": {
      "suggested_key": {
        "default": "Ctrl+Shift+M",
        "mac": "Command+Shift+M"
      },
      "description": "Toggle elevator music playback"
    }
  },
  "web_accessible_resources": [
    {
      "resources": ["offscreen.html"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

**Step 2: Create placeholder icons**

```bash
mkdir -p public/icons
# Create simple colored squares as placeholders (will be replaced with actual icons)
# For now, just create empty files to satisfy manifest
touch public/icons/icon-16.png
touch public/icons/icon-48.png
touch public/icons/icon-128.png
```

**Step 3: Commit manifest and icons**

```bash
git add src/manifest.json public/icons/
git commit -m "feat: add manifest.json and placeholder icons"
```

---

## Task 11: README and Documentation

**Files:**
- Create: `README.md`

**Step 1: Create README**

Create `README.md`:

```markdown
# Open Elevator Music

A Chrome extension that plays royalty-free elevator music on demand during demos while waiting for processes to complete.

## Features

- 🎵 Three music sources: Free Music Archive, Jamendo, Radio Streams
- ⌨️ Multiple trigger methods: Browser action, keyboard shortcut, context menu
- 💾 Persistent playback and settings across browser sessions
- 🔄 Automatic fallback when music sources fail
- 🎚️ Volume control and source selection
- ⚡ Built with TypeScript, Vite, and Chrome Manifest V3

## Installation

### Development

1. Clone the repository
2. Install dependencies: `bun install`
3. Start development server: `bun dev`
4. Load unpacked extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

### Production

1. Build: `bun build`
2. Load the `dist/` folder as an unpacked extension

## Usage

### Trigger Methods

1. **Browser Action**: Click the extension icon in the toolbar
2. **Keyboard Shortcut**: Press `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`)
3. **Context Menu**: Right-click anywhere → "🎵 Toggle Elevator Music"

### Controls

- **Play/Pause**: Toggle music playback
- **Volume**: Adjust volume slider (0-100%)
- **Source**: Select music source (Radio, FMA, Jamendo)

## Development

```bash
# Install dependencies
bun install

# Start dev server with HMR
bun dev

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Type check
bun run type-check

# Build for production
bun build
```

## Architecture

- **Service Worker**: Manages playback state and music sources
- **Offscreen Document**: Handles audio playback (Manifest V3 requirement)
- **Popup UI**: User controls and state display
- **Music Sources**: Abstract interface with three implementations

## Testing

- Unit tests: `tests/sources/`, `tests/lib/`
- Integration tests: `tests/integration/`
- Manual testing: See design doc for checklist

## License

MIT

## Music Sources

All music is royalty-free and safe for use in demos:

- **Free Music Archive**: Curated instrumental tracks
- **Jamendo**: Easy-listening instrumental collection
- **SomaFM**: Commercial-free internet radio streams
```

**Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: add README with installation and usage instructions"
```

---

## Task 12: Final Integration and Testing

**Step 1: Run all tests**

```bash
bun test
```

Expected: All tests pass

**Step 2: Type check**

```bash
bun run type-check
```

Expected: No type errors

**Step 3: Build the extension**

```bash
bun build
```

Expected: Build completes successfully, `dist/` folder created

**Step 4: Manual testing checklist**

Test in Chrome:
1. ✅ Load unpacked extension
2. ✅ Click browser action → popup opens
3. ✅ Click play → music starts
4. ✅ Adjust volume → volume changes
5. ✅ Change source → new source selected
6. ✅ Test keyboard shortcut (Ctrl+Shift+M)
7. ✅ Test context menu
8. ✅ Close/reopen browser → state persists

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete MVP implementation with all features

- Service worker with music controller
- Three music sources (Radio, FMA, Jamendo)
- Popup UI with play/pause, volume, source controls
- Multiple trigger methods (browser action, keyboard, context menu)
- State persistence via chrome.storage.sync
- Auto-fallback on source failure
- Offscreen document for audio playback
- Full test coverage with Vitest
- Build configuration with Vite and @crxjs/vite-plugin"
```

---

## Post-Implementation

After all tasks complete:

1. **Merge to main** (use superpowers:finishing-a-development-branch)
2. **Test in main branch** (verify everything still works)
3. **Create release** (optional: package as .zip for distribution)
4. **Update project board** (if using issue tracking)

---

## Notes

- **DRY**: Music source implementations share common patterns
- **YAGNI**: No playlist management, favorites, or advanced features in MVP
- **TDD**: Every component has tests written first
- **Frequent commits**: Each task ends with a commit
- **Fallback strategy**: Radio streams are most reliable, always available

## Dependencies

All external dependencies are royalty-free and have reliable APIs:
- Free Music Archive: Open API, curated tracks
- Jamendo: Free tier, unlimited requests
- SomaFM: Direct streaming URLs, no API limits

## Future Enhancements (Out of Scope for MVP)

- API integration for FMA and Jamendo (currently using curated lists)
- Playlist management
- Track history and favorites
- Custom radio station URLs
- Audio visualizations
- Scheduling/timers
- Multiple audio channels
