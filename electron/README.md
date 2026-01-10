# Electron Dual-Monitor POS Setup

Automatic secondary monitor detection and fullscreen customer display using Electron.

## Features

✅ **Automatic Secondary Monitor Detection** - Customer display opens automatically on second screen
✅ **Kiosk Mode** - Customer display runs fullscreen with no browser chrome
✅ **Persistent Display** - Customer window can't be accidentally closed
✅ **Hot-Reload** - Connects to Next.js dev server for development
✅ **Production Ready** - Can be packaged as standalone application

## Prerequisites

1. **Next.js dev server must be running:**
   ```bash
   npm run dev
   ```
   Server must be accessible at `http://localhost:8080`

2. **Second monitor connected** (for customer display)

## Installation

```bash
cd electron
npm install
```

## Usage

### Development Mode

**Option 1: Auto-detect POS type**
```bash
npm start
```
Opens the default POS (restaurant) on primary monitor and customer display on secondary.

**Option 2: Specify POS type**
```bash
# Restaurant POS
npm run start:restaurant

# Grocery POS
npm run start:grocery

# Hardware POS
npm run start:hardware

# Clothing POS
npm run start:clothing
```

**Option 3: With DevTools**
```bash
npm run dev
```
Opens with Chrome DevTools enabled for debugging.

### Environment Variables

Create a `.env` file in the `electron/` directory:

```env
# POS type (restaurant, grocery, hardware, clothing)
POS_TYPE=restaurant

# Business ID (optional, defaults to 'default-business')
BUSINESS_ID=biz_123abc

# Terminal ID (optional, auto-generated if not provided)
TERMINAL_ID=terminal-001

# Development mode (opens DevTools)
NODE_ENV=development
```

### Configuration

Edit `main.js` to customize:

- **Window sizes** (lines 28-31, 47-50)
- **POS URL** (line 40)
- **Customer display URL** (line 66)
- **Kiosk mode behavior** (line 48)

## How It Works

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   Primary Monitor       │         │  Secondary Monitor      │
│                         │         │                         │
│  ┌──────────────────┐   │         │  ┌──────────────────┐   │
│  │   POS Window     │   │         │  │ Customer Display │   │
│  │   (Windowed)     │   │         │  │  (Kiosk Mode)    │   │
│  │                  │   │         │  │                  │   │
│  │  - Add items     │   │         │  │  - Cart view     │   │
│  │  - Checkout      │◄──┼─────────┼─►│  - Ads/marketing │   │
│  │  - Settings      │   │  Sync   │  │  - Fullscreen    │   │
│  └──────────────────┘   │         │  └──────────────────┘   │
└─────────────────────────┘         └─────────────────────────┘
```

1. **App starts** → Detects all monitors
2. **Primary window** → Opens POS on main display (windowed)
3. **Secondary window** → Opens customer display on second monitor (fullscreen kiosk)
4. **Sync** → BroadcastChannel for instant communication (same device)

## Production Build

### Windows
```bash
npm run build:win
```
Creates installer in `dist/` folder.

### macOS
```bash
npm run build:mac
```
Creates DMG in `dist/` folder.

### Linux
```bash
npm run build:linux
```
Creates AppImage in `dist/` folder.

## Troubleshooting

**"No secondary display detected"**
- Connect second monitor before starting Electron
- Check display settings in your OS
- Restart Electron after connecting monitor

**"Cannot connect to localhost:8080"**
- Ensure Next.js dev server is running: `npm run dev`
- Check if port 8080 is accessible
- Try navigating to `http://localhost:8080` in browser first

**Customer display not fullscreen**
- This is normal - kiosk mode handles it automatically
- Window will fill entire secondary screen
- Use `Esc` key to exit kiosk mode (for testing only)

**DevTools not opening**
- Set `NODE_ENV=development` in `.env` file
- Or use `npm run dev` command

## Alternative: Web-Based Auto-Detection

If you don't want to use Electron, the web-based solution uses the **Window Management API**:

1. Modern browsers (Chrome 100+, Edge 100+)
2. Requires user permission prompt
3. Automatically positions on secondary monitor
4. Click the "🖥️ Display" button in POS
5. Allow permission when prompted
6. Window opens on secondary monitor automatically

## Next Steps

- **Customize styling** in customer display page
- **Add advertisement management** (Phase 5)
- **Configure business/terminal IDs** via .env
- **Package for deployment** with electron-builder
