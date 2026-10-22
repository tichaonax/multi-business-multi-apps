#!/usr/bin/env node
/**
 * Creates a Windows shortcut to launch Electron in the Startup folder
 * This makes Electron start automatically when the user logs in
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const electronPath = path.join(PROJECT_ROOT, 'electron');
const electronExe = path.join(electronPath, 'node_modules', 'electron', 'dist', 'electron.exe');

// Verify electron.exe exists
if (!fs.existsSync(electronExe)) {
  console.error('❌ electron.exe not found!');
  console.error(`   Expected at: ${electronExe}`);
  console.error('   Run: cd electron && npm install');
  process.exit(1);
}

// The launcher batch file is checked into the repo and finds electron.exe
// relative to its own folder (%~dp0), so it works for any Windows user.
// Never regenerate it with absolute paths — a committed copy carrying one
// machine's user folder breaks every other install that pulls it.
const batchPath = path.join(PROJECT_ROOT, 'start-electron-app.bat');
if (!fs.existsSync(batchPath)) {
  console.error('❌ start-electron-app.bat not found at', batchPath);
  process.exit(1);
}
console.log('✅ Using batch file:', batchPath);

// Get user's Startup folder and Desktop paths
const startupFolder = path.join(
  process.env.APPDATA,
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'Startup'
);

// Desktop may be at USERPROFILE\Desktop or OneDrive\Desktop
let desktopFolder = path.join(process.env.USERPROFILE, 'Desktop');
if (!fs.existsSync(desktopFolder)) {
  // Try OneDrive Desktop
  const oneDriveDesktop = path.join(process.env.USERPROFILE, 'OneDrive', 'Desktop');
  if (fs.existsSync(oneDriveDesktop)) {
    desktopFolder = oneDriveDesktop;
  } else {
    // Last resort: create it
    fs.mkdirSync(desktopFolder, { recursive: true });
  }
}

console.log('📁 Startup folder:', startupFolder);
console.log('🖥️  Desktop folder:', desktopFolder);

// Create shortcuts using PowerShell
const startupShortcutPath = path.join(startupFolder, 'MultiBusinessPOS.lnk');
const desktopShortcutPath = path.join(desktopFolder, 'Launch MultiBusinessPOS.lnk');

const powershellScript = `
$WScriptShell = New-Object -ComObject WScript.Shell

# Create Startup folder shortcut
$StartupShortcut = $WScriptShell.CreateShortcut("${startupShortcutPath.replace(/\\/g, '\\\\')}")
$StartupShortcut.TargetPath = "${batchPath.replace(/\\/g, '\\\\')}"
$StartupShortcut.WorkingDirectory = "${electronPath.replace(/\\/g, '\\\\')}"
$StartupShortcut.Description = "Multi-Business POS - Auto-start on login"
$StartupShortcut.IconLocation = "${electronExe.replace(/\\/g, '\\\\')},0"
$StartupShortcut.Save()

# Create Desktop shortcut
$DesktopShortcut = $WScriptShell.CreateShortcut("${desktopShortcutPath.replace(/\\/g, '\\\\')}")
$DesktopShortcut.TargetPath = "${batchPath.replace(/\\/g, '\\\\')}"
$DesktopShortcut.WorkingDirectory = "${electronPath.replace(/\\/g, '\\\\')}"
$DesktopShortcut.Description = "Launch Multi-Business POS Kiosk Application"
$DesktopShortcut.IconLocation = "${electronExe.replace(/\\/g, '\\\\')},0"
$DesktopShortcut.Save()

Write-Host "Shortcuts created successfully"
`;

const psFile = path.join(PROJECT_ROOT, 'create-shortcut.ps1');
fs.writeFileSync(psFile, powershellScript);

console.log('\n🔧 Creating shortcuts...');

exec(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, (error, stdout, stderr) => {
  // Log PowerShell output for debugging
  if (stdout) console.log('[PowerShell]', stdout.trim());
  if (stderr) console.error('[PowerShell Error]', stderr.trim());

  // Clean up temp PowerShell file
  try {
    fs.unlinkSync(psFile);
  } catch (e) {}

  if (error) {
    console.error('❌ Failed to create shortcuts:', error.message);
    process.exit(1);
  }

  const startupExists = fs.existsSync(startupShortcutPath);
  const desktopExists = fs.existsSync(desktopShortcutPath);

  if (startupExists && desktopExists) {
    console.log('✅ Shortcuts created successfully!');
    console.log('\n📍 Startup shortcut (auto-start on login):');
    console.log(`   ${startupShortcutPath}`);
    console.log('\n🖥️  Desktop shortcut (manual launch):');
    console.log(`   ${desktopShortcutPath}`);
    console.log('\n📋 What happens now:');
    console.log('   1. Service starts Next.js server on boot');
    console.log('   2. When you log in, Electron starts automatically');
    console.log('   3. If it crashes, double-click desktop shortcut to restart');
    console.log('   4. POS and Customer Display open in kiosk mode');
    console.log('\n🔄 To test now:');
    console.log(`   - Double-click: ${desktopShortcutPath}`);
    console.log(`   - Or run: "${batchPath}"`);
  } else {
    console.error('❌ Shortcuts were not created');
    if (!startupExists) console.error('   Missing: Startup shortcut');
    if (!desktopExists) console.error('   Missing: Desktop shortcut');
    process.exit(1);
  }
});
