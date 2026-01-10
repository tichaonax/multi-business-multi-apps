# Dual Monitor Setup Guide

Two options for automatic secondary monitor detection:

## Option 1: Web-Based (Recommended for Testing)

**Pros:** No additional setup, works immediately
**Cons:** Requires browser permission prompt

**Setup:**
1. Start dev server: `npm run dev`
2. Open POS page (Restaurant/Grocery/Hardware/Clothing)
3. Click "🖥️ Display" button
4. **Allow permission** when browser prompts for screen access
5. Customer display opens automatically on secondary monitor
6. Press F11 on customer display for fullscreen

**Browser Support:**
- ✅ Chrome 100+
- ✅ Edge 100+
- ❌ Firefox (not yet supported)
- ❌ Safari (not yet supported)

**How it works:**
- Uses Window Management API to detect monitors
- Automatically positions window on secondary display
- Attempts fullscreen via JavaScript (may require manual F11)

---

## Option 2: Electron Wrapper (Recommended for Production)

**Pros:** True automatic fullscreen, kiosk mode, no permission prompts
**Cons:** Requires Electron installation

**Setup:**

### 1. Install Electron Dependencies
```bash
cd electron
npm install
```

### 2. Start Next.js Dev Server
```bash
# In main project directory
npm run dev
```
Leave this running in one terminal.

### 3. Launch Electron POS
```bash
# In electron directory

# Option A: Use batch file (Windows)
start-pos.bat

# Option B: Command line
npm run start:restaurant
npm run start:grocery
npm run start:hardware
npm run start:clothing
```

### 4. What Happens
- **Primary Monitor:** POS system opens (windowed, normal controls)
- **Secondary Monitor:** Customer display opens automatically in fullscreen kiosk mode
- **Sync:** Real-time via BroadcastChannel (instant, zero latency)

### Configuration

Create `electron/.env`:
```env
POS_TYPE=restaurant
BUSINESS_ID=your-business-id
TERMINAL_ID=terminal-001
NODE_ENV=development
```

---

## Comparison

| Feature | Web-Based | Electron |
|---------|-----------|----------|
| Automatic positioning | ✅ | ✅ |
| Fullscreen | Manual (F11) | Automatic |
| Kiosk mode | ❌ | ✅ |
| Browser chrome | Visible | Hidden |
| Permission prompt | Required | None |
| Setup complexity | None | Medium |
| Production ready | Testing only | Yes |
| Works offline | No | Yes |

---

## Testing Your Setup

### With Web-Based:
1. Open POS: `http://localhost:8080/restaurant/pos`
2. Click "🖥️ Display" button
3. Allow screen access permission
4. Verify customer display opens on second monitor
5. Add items to cart - see updates on customer display
6. Press F11 on customer display for fullscreen

### With Electron:
1. Start dev server: `npm run dev`
2. Run: `cd electron && npm start`
3. POS opens on primary, customer display on secondary (automatically fullscreen)
4. Add items to cart - see updates instantly
5. Customer display stays fullscreen (kiosk mode)

---

## Troubleshooting

**No secondary monitor detected:**
- Connect second monitor before starting
- Check OS display settings
- Restart application after connecting monitor

**Permission denied (Web-based):**
- Click "🖥️ Display" button again
- Check browser permissions (chrome://settings/content/windowPlacement)
- Try different browser (Chrome/Edge recommended)

**Customer display not fullscreen (Web-based):**
- Press F11 key on customer display window
- Or implement custom fullscreen button in UI

**Electron not connecting:**
- Ensure `npm run dev` is running first
- Check `http://localhost:8080` works in browser
- Verify port 8080 is not blocked by firewall

---

## Production Deployment

### Web-Based:
- Deploy Next.js app as usual
- Users must allow screen permission
- Works on modern browsers only

### Electron:
```bash
cd electron

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

Distributes as standalone application with automatic dual-monitor support.

---

## Recommendation

- **Development/Testing:** Use web-based (faster iteration)
- **Production/Retail:** Use Electron (better UX, no permission prompts, true kiosk mode)
