# Starting the Application

## For End Users & Testers

### Simple One-Command Startup

Just run this in the main project directory:

```bash
npm run dev
```

**That's it!** This single command will:
- ✅ Start the Next.js development server on port 8080
- ✅ Start the Electron app automatically (when server is ready)
- ✅ Open POS window on your primary monitor with DevTools
- ✅ Open customer display on secondary monitor with DevTools (if connected)

### What You'll See

1. **Console Output**: You'll see two prefixed log streams:
   - `[SERVER]` - Next.js server logs (cyan color)
   - `[ELECTRON]` - Electron app logs (magenta color)

2. **Main Window**: Opens to login/home page
   - Log in with your credentials
   - System will automatically select your business
   - Navigate to any POS (Restaurant, Grocery, Hardware, Clothing)

3. **Customer Display**: Opens **immediately** on secondary monitor
   - Shows advertising/marketing content right away (no need to wait for login)
   - Automatically updates with business info when you log in
   - Switches automatically when you change businesses
   - Updates in real-time when you add cart items
   - Returns to advertising/marketing when cart is empty
   - **Always on** - perfect for customer-facing advertising 24/7

### Stopping the Application

Press `Ctrl+C` in the terminal to stop both the server and Electron app.

## How It Works

### Multi-Business Support
- **No need to specify business type** - the app works with all business types
- **Dynamic switching** - change between Restaurant, Grocery, Hardware, Clothing without restarting
- **One customer display for all** - seamlessly shows the correct business info

### Workflow Example
1. Start app: `npm run dev`
2. Login on main window
3. Customer display shows your business info immediately
4. Navigate to Restaurant POS → customer display shows restaurant cart
5. Navigate to Grocery POS → customer display switches to grocery cart
6. Switch to different business → customer display updates automatically

## Troubleshooting

### "Port 8080 already in use"
```bash
# On Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Or change PORT in .env.local
PORT=3000
```

### "No secondary display detected"
- Connect second monitor before starting
- Check Windows display settings
- Customer display requires a second monitor

### DevTools not opening
Make sure you're running in development mode (default with `npm run dev`)

### Customer display shows default content
The customer display will show:
- Business information (if businessId provided in URL or localStorage)
- Welcome/marketing content when no cart items
- Cart view when items are added at POS
- Automatically switches businesses when POS changes business

## Production Deployment

### Windows Service with Auto-Start Electron

For production deployment where the app runs as a Windows service and Electron starts automatically on user login:

#### Setup

1. **Install Electron to Windows Startup** (one-time):
```bash
npm run electron:install-startup
```

2. **Reboot computer**

#### How It Works

When Windows boots:
```
Windows Boots
├─ Service starts automatically (headless)
│  └─ Next.js server starts on port 8080
│
└─ User logs in
   └─ Electron startup script runs
      ├─ Waits for server to be ready
      ├─ Opens main window (primary monitor) - Dashboard/Login
      └─ Opens customer display IMMEDIATELY (secondary monitor - fullscreen kiosk)
         ├─ Shows advertising/marketing content initially
         ├─ Updates automatically when user logs in and selects business
         └─ Shows cart when items are added to POS
```

#### Manual Control

**Start Electron manually** (if not using auto-startup):
```bash
# Ensure service is running
npm run service:start

# Then start Electron
npm run electron:start
```

**Remove from auto-startup:**
```bash
npm run electron:uninstall-startup
```

#### Troubleshooting

**Electron doesn't start on login:**
- Check Startup folder: `explorer "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"`
- Look for: `Multi-Business-Kiosk.lnk`
- Reinstall: `npm run electron:uninstall-startup && npm run electron:install-startup`

**Electron shows "waiting for server":**
- Check service status: `sc query multibusinesssyncservice.exe`
- Start service: `npm run service:start`
- Check logs: `type logs\service.log`

**Customer display doesn't appear:**
- Verify secondary monitor is connected
- Electron only opens customer display if second monitor detected

### Standalone Build

Or package as standalone Electron app:
```bash
cd electron
npm run build:win    # For Windows
npm run build:mac    # For macOS
npm run build:linux  # For Linux
```

## Advanced Options

If you need to run server and Electron separately:

```bash
# Terminal 1: Start server only
npm run dev:server

# Terminal 2: Start Electron only (after server is running)
npm run dev:electron
```
