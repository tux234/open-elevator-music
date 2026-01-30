# OpenElevatorMusic Chrome Extension - Design Specification

**Date:** 2026-01-30
**Version:** 0.1.0 (MVP)
**Status:** Approved

## Overview

A Chrome extension that plays royalty-free elevator music on demand during demos while waiting for processes to complete. Multiple trigger methods, multiple music sources, persistent playback with saved preferences.

---

## Architecture Overview

### Core Components

1. **Background Service Worker** (`background.ts`)
   - Manages audio playback state
   - Handles music source API calls
   - Persists settings to `chrome.storage.sync`
   - Coordinates between popup, shortcuts, and context menu

2. **Popup UI** (`popup.html` + `popup.ts`)
   - Simple interface: play/pause button, volume slider, source dropdown
   - Communicates with service worker via `chrome.runtime.sendMessage()`
   - Updates in real-time to reflect current playback state

3. **Music Source Abstraction** (`sources/`)
   - Abstract `MusicSource` interface
   - Concrete implementations: `FMASource`, `JamendoSource`, `RadioSource`
   - Each source handles its own API authentication and streaming URL retrieval

4. **Audio Player** (`player.ts`)
   - HTML5 Audio API wrapper
   - Runs in service worker context (offscreen document for audio in MV3)
   - Handles volume, play/pause, track switching

### Tech Stack

- **TypeScript + Vite + @crxjs/vite-plugin**
- **Manifest V3**
- **No external UI frameworks** (vanilla TS for MVP speed)
- **Vitest** for testing

---

## State Management & Data Flow

### Application State

```typescript
interface AppState {
  isPlaying: boolean;
  volume: number;           // 0-100
  selectedSource: 'fma' | 'jamendo' | 'radio';
  currentTrack: Track | null;
  lastError: string | null;
}
```

### Persistence

- State syncs to `chrome.storage.sync` on every change
- On startup, service worker restores last state
- Music resumes automatically if `isPlaying: true` was saved

### Message Flow

1. **User clicks popup play button:**
   - Popup → `{action: 'play'}` → Service Worker
   - Service Worker → fetches track from selected source
   - Service Worker → starts audio playback
   - Service Worker → broadcasts state update → Popup UI refreshes

2. **Keyboard shortcut (Ctrl+Shift+M):**
   - Chrome triggers `chrome.commands.onCommand`
   - Service Worker toggles play/pause
   - If popup is open, it receives state update

3. **Source fails:**
   - Service Worker catches error
   - Shows `chrome.notifications` (brief toast)
   - Automatically tries next source in priority order
   - Updates popup if open

### Browser Session Handling

- Audio survives tab closes (runs in service worker)
- Extension icon badge shows ▶️ or ⏸ status
- Clicking any tab's context menu controls the same global playback

---

## Music Source Implementation

### Abstract Source Interface

```typescript
interface MusicSource {
  name: string;
  fetchTrack(): Promise<Track>;
  // For future: fetchPlaylist(), search(), etc.
}

interface Track {
  title: string;
  artist: string;
  streamUrl: string;
  duration?: number;
}
```

### Source Implementations (MVP)

#### 1. Free Music Archive (FMA) - *Default source*

- Uses FMA API v1: `https://freemusicarchive.org/api/`
- Filter by genre tags: `elevator`, `jazz`, `lounge`, `ambient`
- Returns direct MP3 stream URLs
- Fallback: curated playlist of known-good FMA track IDs

#### 2. Jamendo

- Uses Jamendo API v3.0 (free tier, no auth required)
- Query: `?fuzzytags=easy-listening+instrumental`
- Returns streaming URLs with built-in CDN

#### 3. Radio Streams - *Simplest fallback*

- Hardcoded list of royalty-free internet radio streams
- SomaFM Groove Salad, Lush, Drone Zone channels
- Direct streaming URLs, no API calls needed

### Source Priority for Auto-Fallback

1. User's selected source (try 3 times with exponential backoff)
2. Radio streams (most reliable, no API)
3. Other API sources in order

### Rate Limiting

- Cache API responses for 5 minutes
- Respect API rate limits (FMA: 120/hour, Jamendo: unlimited on free tier)

---

## UI Components & Interactions

### Popup UI (320px × 240px)

```
┌─────────────────────────────────┐
│  🎵 Elevator Music              │
├─────────────────────────────────┤
│                                 │
│   Now Playing:                  │
│   "Smooth Jazz Elevator Mix"   │
│   SomaFM Groove Salad          │
│                                 │
│   [  ▶️  ]   or   [  ⏸  ]      │
│                                 │
│   Volume: ████████░░  80%       │
│                                 │
│   Source: [Jamendo ▼]          │
│                                 │
└─────────────────────────────────┘
```

### Interactions

- **Play/Pause button**: Large, center-aligned, toggles immediately
- **Volume slider**: HTML5 range input, updates in real-time (no "apply" needed)
- **Source dropdown**: Changes take effect on next track (or immediate retry if currently errored)

### Browser Action Icon

- Default: `🎵` (gray when stopped)
- Playing: `🎵` (blue) with badge "▶️"
- Paused: `🎵` (orange) with badge "⏸"
- Error: `🎵` (red) with badge "!"

### Keyboard Shortcut

- Default: `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`)
- User configurable via `chrome://extensions/shortcuts`
- Action: Toggle play/pause globally

### Context Menu

- Right-click anywhere → "🎵 Toggle Elevator Music"
- Appears on all pages
- Same global toggle behavior

### Notifications

- Error toast: "Music source failed, trying Radio..." (3 sec auto-dismiss)
- Only shows on errors, not on normal playback

---

## Error Handling & Testing Strategy

### Error Handling

#### API Failures

```typescript
async playTrack() {
  const sources = [selectedSource, ...fallbackSources];

  for (const source of sources) {
    try {
      const track = await source.fetchTrack();
      await this.player.load(track.streamUrl);
      return; // Success!
    } catch (error) {
      this.showNotification(`${source.name} failed, trying next...`);
      await sleep(1000); // Brief pause between attempts
    }
  }

  // All sources failed
  this.showNotification('All music sources unavailable');
  this.setState({ isPlaying: false });
}
```

#### Network Issues

- 5-second timeout per API call
- Exponential backoff on retries (1s, 2s, 4s)
- Cache last successful track for offline playback

#### Audio Playback Errors

- Stream fails mid-playback → auto-skip to next track
- No user intervention required during demos

### Testing Strategy (TDD with Vitest)

#### Unit Tests

- Each `MusicSource` implementation (mock API responses)
- State management logic (play/pause/volume changes)
- Error fallback sequences

#### Integration Tests

- Popup ↔ Service Worker messaging
- Chrome storage persistence
- Audio player lifecycle

#### Manual Testing Checklist

- Install unpacked extension
- Test all three trigger methods
- Verify persistence across browser restart
- Test with network throttling (simulate API failures)

**No E2E tests for MVP** - manual testing sufficient for Chrome extension with limited surface area.

---

## Project Structure

```
OpenElevatorMusic/
├── src/
│   ├── background/
│   │   ├── service-worker.ts       # Main background script
│   │   └── audio-player.ts         # Audio playback manager
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── sources/
│   │   ├── base.ts                 # MusicSource interface
│   │   ├── fma.ts                  # Free Music Archive
│   │   ├── jamendo.ts              # Jamendo API
│   │   └── radio.ts                # Radio streams
│   ├── lib/
│   │   ├── storage.ts              # Chrome storage wrapper
│   │   └── messaging.ts            # Message passing helpers
│   └── manifest.json               # Chrome extension manifest
├── tests/
│   ├── sources/                    # Unit tests for each source
│   └── integration/                # Message flow tests
├── public/
│   └── icons/                      # Extension icons (16, 48, 128px)
├── docs/
│   └── plans/                      # Design documents
├── vite.config.ts                  # Vite + @crxjs/vite-plugin
├── tsconfig.json
├── package.json
└── README.md
```

---

## Build Configuration

### Key Dependencies

```json
{
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "@types/chrome": "^0.0.260"
  }
}
```

### Build Commands

- `bun dev` - Development mode with HMR (loads unpacked extension)
- `bun test` - Run Vitest unit tests
- `bun build` - Production build → `dist/` folder
- `bun package` - Create `.zip` for Chrome Web Store

### Manifest V3 Setup

```json
{
  "manifest_version": 3,
  "name": "Open Elevator Music",
  "version": "0.1.0",
  "permissions": ["storage", "notifications"],
  "background": {
    "service_worker": "src/background/service-worker.ts"
  },
  "action": {
    "default_popup": "src/popup/popup.html"
  },
  "commands": {
    "toggle-music": {
      "suggested_key": { "default": "Ctrl+Shift+M" }
    }
  }
}
```

---

## Development Workflow

1. `bun dev` - Start Vite dev server
2. Load `dist/` as unpacked extension in Chrome
3. Make changes → HMR auto-reloads extension
4. Test → commit → repeat

---

## MVP Scope

### In Scope

- ✅ Play/pause/volume controls
- ✅ Three trigger methods (browser action, keyboard, context menu)
- ✅ Three music sources (FMA, Jamendo, Radio)
- ✅ Persistent playback and settings
- ✅ Auto-fallback on source failure
- ✅ Error notifications

### Out of Scope (Future)

- ❌ Playlist management
- ❌ Track history
- ❌ Favorites/bookmarks
- ❌ Custom radio station URLs
- ❌ Visualizations
- ❌ Scheduling/timers
- ❌ Multiple audio channels

---

## Success Criteria

1. Extension loads without errors in Chrome
2. All three trigger methods successfully toggle playback
3. Music plays continuously across tab switches
4. Settings persist across browser restarts
5. Graceful fallback when music sources fail
6. Clean, minimal UI that doesn't distract from demos

---

## Next Steps

1. Initialize git repository
2. Create git worktree for initial implementation
3. Write detailed implementation plan
4. Set up project scaffold (TDD)
5. Implement music sources (TDD)
6. Implement UI components (TDD)
7. Integration testing
8. Manual testing checklist
9. Package for distribution
