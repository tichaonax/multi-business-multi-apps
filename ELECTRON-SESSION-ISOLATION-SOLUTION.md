# Electron Multi-Monitor Session Isolation Solution

## The Problem

When Windows services try to launch Electron directly, Electron runs in **Session 0** (background, non-interactive) instead of the user's desktop session. This causes:

- ❌ `screen.getAllDisplays()` returns only 1 display (even when 2+ monitors connected)
- ❌ GPU errors and rendering issues
- ❌ No visible windows on user desktop
- ❌ Customer display cannot open on secondary monitor

This is called **Windows Session 0 Isolation** and has been enforced since Windows Vista.

## The Solution: CreateProcessAsUser

We use the **industry-standard** approach for services launching GUI applications:

```
Service (Session 0) → CreateProcessAsUser → Electron (User Session) → Full Display Access
```

### Architecture

1. **Windows Service** (Session 0)
   - Runs Next.js server
   - Acts as watchdog/launcher
   - Detects active user login
   - Calls C# helper to launch Electron

2. **C# Helper** (`LaunchInUserSession.exe`)
   - Uses Win32 API `CreateProcessAsUser`
   - Gets active console session ID
   - Gets user token for that session
   - Launches Electron in user's interactive session

3. **Electron** (User Session 1+)
   - Runs in interactive desktop
   - Full GPU and display access
   - `screen.getAllDisplays()` sees all monitors
   - Customer display opens on secondary monitor

## Implementation Details

### Files

**windows-service/LaunchInUserSession.cs**
- C# helper program
- Uses Win32 APIs: `WTSGetActiveConsoleSessionId`, `WTSQueryUserToken`, `CreateProcessAsUser`
- Compiles to `LaunchInUserSession.exe`

**windows-service/build-launcher.bat**
- Builds the C# helper using .NET Framework compiler (csc.exe)
- Run once or auto-builds when service starts

**src/service/sync-service-runner.ts**
- Modified to use the launcher instead of spawning Electron directly
- Waits for user session before launching
- Auto-builds launcher if missing

### How It Works

1. **Service starts on boot** (Session 0)
   ```
   npm run service:start
   ```

2. **Service waits for user to log in**
   - Polls `query session` every 5 seconds
   - Up to 10 minutes wait time
   - Detects "Active" session

3. **Service builds launcher** (if needed)
   - Checks if `LaunchInUserSession.exe` exists
   - Runs `build-launcher.bat` if missing
   - Uses .NET Framework C# compiler

4. **Service launches Electron via helper**
   ```
   LaunchInUserSession.exe "path\to\launch-electron.bat"
   ```

5. **Helper uses CreateProcessAsUser**
   - Gets active console session ID
   - Obtains user token
   - Creates process in user session with full desktop access

6. **Electron starts in user session**
   - Sees all connected monitors
   - Opens POS on primary monitor
   - Opens customer display on secondary monitor in fullscreen kiosk mode

## Why Other Approaches Don't Work

### ❌ Service launching Electron directly
```typescript
// This runs Electron in Session 0 - WRONG
spawn('npm', ['start'], { cwd: electronPath })
```
Result: Only 1 display detected, GPU errors

### ❌ Task Scheduler "Run whether user is logged on or not"
- Same Session 0 isolation issue
- Windows don't appear on desktop

### ❌ "Allow service to interact with desktop" flag
- Deprecated since Windows Vista
- Removed from Windows 10/11
- Does not work

## Building and Testing

### Build the Launcher

```bash
cd windows-service
build-launcher.bat
```

This creates `LaunchInUserSession.exe`

### Test the Launcher Manually

```cmd
LaunchInUserSession.exe "C:\path\to\notepad.exe"
```

Notepad should open on your desktop (not hidden in Session 0)

### Rebuild and Restart Service

```powershell
# Run as Administrator
npm run service:stop
npm run build:service
npm run service:start
```

### Expected Logs

```
🚀 Sync service started successfully
🖥️  Preparing to start Electron in user session...
[Launcher] LaunchInUserSession.exe found
👤 Waiting for user to log in...
✅ Active user session detected
[Launcher] Launching in user session via CreateProcessAsUser...
[INFO] Active console session ID: 1
[INFO] User token obtained successfully.
[INFO] Environment block created.
[SUCCESS] Process launched in user session. PID: 12345
✅ Electron launch command sent to user session
[Electron] Found 2 display(s)
[Electron] Display 1: 1536x960 (Primary)
[Electron] Display 2: 1280x1024 (Secondary)
✅ Customer display kiosk mode enabled
```

## Security Considerations

- Launcher runs with LocalSystem privileges (service account)
- Uses `WTSQueryUserToken` to obtain user's token securely
- Creates process with user's environment and permissions
- No password storage or credential handling required

## Workflow for Production

```
Boot → Service starts (LocalSystem)
     → User logs in manually or via auto-login
     → Service detects active session
     → Service calls LaunchInUserSession.exe
     → Electron starts in user session
     → Customer display ready (24/7 operation)
```

For truly unattended operation, combine with **Windows Auto-Login**:
- Use Sysinternals Autologon tool
- Configure auto-login for dedicated kiosk account
- Service + auto-login = fully automated startup

## References

- [Windows Session 0 Isolation](https://kb.firedaemon.com/support/solutions/articles/4000086228)
- [CreateProcessAsUser Documentation](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessasuserw)
- [Kiosk Mode Best Practices](https://learn.microsoft.com/en-us/windows/configuration/kiosk/)
