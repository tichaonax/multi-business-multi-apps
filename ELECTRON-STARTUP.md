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

3. **Customer Display**: Opens automatically on secondary monitor
   - Shows business info and welcome/marketing content immediately
   - Automatically updates when you log in and select a business
   - Switches automatically when you change businesses
   - Updates in real-time when you add cart items
   - Shows advertising/marketing when cart is empty (ready for Phase 5)

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

For production use (without DevTools):

```bash
# Build the application
npm run build

# Start in production mode
npm start
```

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
