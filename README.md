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
bun run test

# Run tests in watch mode
bun run test --watch

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
