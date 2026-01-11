# Service + Electron Workflow Guide

## Overview

The Multi-Business Platform has **two separate components** that work together:

1. **Service (Headless)** - Next.js server running in background
2. **Electron (GUI)** - Kiosk application with POS + Customer Display

**IMPORTANT:** These are **independent processes**. Starting/stopping the service does NOT automatically start/stop Electron.

## Commands Reference

### Service Commands

| Command | What It Does | Electron |
|---------|-------------|----------|
| `npm run service:start` | Starts Next.js server (headless) | **NO** - Does NOT start Electron |
| `npm run service:stop` | Stops Next.js server | **NO** - Does NOT stop Electron |
| `npm run service:restart` | Restarts Next.js server | **NO** - Electron keeps running |

### Electron Commands

| Command | What It Does | Requires Service |
|---------|-------------|------------------|
| `npm run electron:start` | Starts Electron (POS + Customer Display) | **YES** - Service must be running first |
| `npm run electron:stop` | Stops all Electron processes | **NO** - Independent |
| `npm run electron:install-startup` | Add to Windows Startup (one-time) | **NO** - Just installs shortcut |
| `npm run electron:uninstall-startup` | Remove from Windows Startup | **NO** - Just removes shortcut |

## Typical Workflows

### Development Workflow

**Start Everything:**
```bash
# Option 1: Start server + Electron together (recommended for dev)
npm run dev

# Option 2: Start separately
npm run service:start    # Start server first
npm run electron:start   # Then start Electron
```

**Stop Everything:**
```bash
# If you used "npm run dev":
Ctrl+C                   # Stops both

# If started separately:
npm run electron:stop    # Stop Electron first
npm run service:stop     # Then stop server
```

### Production Workflow (Windows Service + Auto-Start)

**One-Time Setup:**
```bash
# 1. Service is already installed (starts on boot)
# 2. Install Electron to Windows Startup
npm run electron:install-startup
```

**After Reboot:**
```
Windows Boots
├─ Service starts automatically → Next.js server runs
└─ User logs in → Electron starts automatically → POS + Customer Display open
```

**Manual Control:**
```bash
# Start service manually
npm run service:start

# Start Electron manually (if not using auto-startup)
npm run electron:start

# Stop Electron
npm run electron:stop

# Stop service
npm run service:stop
```

## Important Notes

### Service Does NOT Control Electron

The Windows service (`multibusinesssyncservice.exe`) only manages the Next.js server. It does **NOT**:
- ❌ Start Electron
- ❌ Stop Electron
- ❌ Restart Electron
- ❌ Monitor Electron

### Electron Depends on Service

Electron requires the Next.js server to be running:
- ✅ `npm run electron:start` waits for server (http://localhost:8080)
- ✅ If service stops, Electron will show "waiting for server..."
- ✅ When service restarts, Electron reconnects automatically

### Auto-Startup (Windows Startup Folder)

When installed via `npm run electron:install-startup`:
- ✅ Electron starts automatically when user logs into Windows
- ✅ Waits for service to be ready before opening windows
- ❌ Service commands do NOT affect Windows Startup

## Troubleshooting

### "Electron is running but service is stopped"

This can happen! They're independent processes.

**Solution:**
```bash
# Stop Electron
npm run electron:stop

# Start service
npm run service:start

# Start Electron
npm run electron:start
```

### "Service is running but Electron won't start"

**Check service status:**
```bash
sc query multibusinesssyncservice.exe
```

**Check if server is accessible:**
```bash
curl http://localhost:8080
```

**Start Electron:**
```bash
npm run electron:start
```

### "How do I restart everything?"

```bash
# Stop Electron first (if running)
npm run electron:stop

# Restart service
npm run service:restart

# Wait a few seconds, then start Electron
npm run electron:start
```

### "Electron is stuck/frozen"

```bash
# Force stop Electron
npm run electron:stop

# Wait a moment, then restart
npm run electron:start
```

## Process Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Windows Machine                            │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  SESSION 0 (Non-Interactive Background)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Windows Service (multibusinesssyncservice.exe)      │   │
│  │  ├─ Starts automatically on boot (LocalSystem)       │   │
│  │  ├─ Runs Next.js server (http://localhost:8080)      │   │
│  │  ├─ Waits for user to log in                         │   │
│  │  └─ Calls LaunchInUserSession.exe to start Electron  │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓ CreateProcessAsUser                │
│  ────────────────────────────────────────────────────────   │
│                                                                │
│  SESSION 1+ (Interactive User Desktop)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Electron (Launched in User Session)                 │   │
│  │  ├─ Full GPU and display access                      │   │
│  │  ├─ Detects all monitors correctly                   │   │
│  │  ├─ Main Window: POS (primary monitor)               │   │
│  │  └─ Customer Display (secondary monitor, kiosk mode) │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

**Key Architecture Points:**
- ✅ Service controls Electron lifecycle (start/stop/restart)
- ✅ Service uses `CreateProcessAsUser` to launch Electron in user session
- ✅ Electron runs with full display access (not in Session 0)
- ✅ Customer display sees all monitors and runs in kiosk mode

## Quick Reference

**Just want everything running?**
```bash
npm run dev                # Development (server + Electron together)
```

**Production with manual control?**
```bash
npm run service:start      # Start server
npm run electron:start     # Start Electron
```

**Production with auto-start?**
```bash
npm run electron:install-startup   # One-time setup
# Reboot → everything starts automatically
```

**Stop everything?**
```bash
npm run electron:stop      # Stop Electron
npm run service:stop       # Stop server
```

**Completely remove auto-start?**
```bash
npm run electron:uninstall-startup
```
