/**
 * MBM-352 — keeps this till in step with its server.
 *
 *  1. ensureAgent(): the POS app carries the R710 agent (resources/agent).
 *     When the app starts, it makes sure that agent is the one running on
 *     127.0.0.1:47710, starting it (the agent closes any older copy itself),
 *     and points the agent's start-at-sign-in at it.
 *
 *  2. installUpdate(): "Update now" on the Update required screen.
 *     - If an admin has set up the "MBM POS Updater" task (installer.nsh →
 *       updater/setup-updater.ps1) for this server, start it. It runs as
 *       SYSTEM, so no Windows prompt, even for a standard user. A small
 *       helper restarts the app once it's done.
 *     - Otherwise download the installer, check its SHA-256, and run it.
 *       Windows shows its prompt (an admin's Yes, or their password). That
 *       run also sets the task up for next time (--mbm-server / --mbm-cert).
 */
const { app } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const { execFile } = require('child_process')

const AGENT_PORT = 47710
const TASK_NAME = 'MBM POS Updater'
const DATA_DIR = path.join(process.env.ProgramData || 'C:\\ProgramData', 'MBM POS')
const STATUS_FILE = path.join(DATA_DIR, 'update-status.json')
const CONFIG_FILE = path.join(DATA_DIR, 'updater.json')
const POWERSHELL = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')

const agentDir = () => path.join(process.resourcesPath, 'agent')
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''))

/** The agent version bundled with this POS app, or null (dev run / not bundled). */
function bundledAgentVersion() {
  try { return readJson(path.join(agentDir(), 'package.json')).version || null } catch { return null }
}

async function probeAgent() {
  try {
    const res = await fetch(`http://127.0.0.1:${AGENT_PORT}/probe?serverUrl=x`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return null
    return (await res.json()).agentVersion || null
  } catch { return null }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function agentProcessRunning() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/FI', 'IMAGENAME eq r710-agent.exe', '/NH'], { windowsHide: true }, (err, out) =>
      resolve(!err && /r710-agent\.exe/i.test(out || '')))
  })
}

// One start at a time. Each new agent closes any other copy as it starts, so
// two starts a second apart (the app's own at launch + the Update required
// screen's) closed each other and left no agent running (1.0.43).
let ensuring = null
/** Start the bundled agent unless it is already the one running. Never throws. */
function ensureAgent() {
  if (!ensuring) ensuring = doEnsureAgent().finally(() => { ensuring = null })
  return ensuring
}

async function doEnsureAgent() {
  try {
    const want = bundledAgentVersion()
    const exe = path.join(agentDir(), 'r710-agent.exe')
    if (!want || !fs.existsSync(exe)) return
    let running = await probeAgent()
    // An agent that is still starting (e.g. from the sign-in Run key) doesn't
    // answer yet: give it 15 s rather than start a second one over it.
    if (running === null && (await agentProcessRunning())) {
      for (let i = 0; i < 15 && running === null; i++) { await sleep(1000); running = await probeAgent() }
    }
    if (running === want) return
    console.log(`[Agent] running: ${running || 'none'}, bundled: ${want} — starting the bundled agent`)
    // Through Start-Process -WindowStyle Hidden, not spawn(detached): a
    // detached console program gets no console at all, so every command the
    // agent runs (reg, taskkill, its printer lookups) pops up a console
    // window of its own. Started this way it has one hidden console that
    // they share, and it outlives the POS app.
    await new Promise((resolve) => {
      execFile(POWERSHELL, ['-NoProfile', '-NonInteractive', '-Command',
        'Start-Process -FilePath $env:MBM_AGENT -WorkingDirectory $env:MBM_AGENT_DIR -WindowStyle Hidden'], {
        windowsHide: true, env: { ...process.env, MBM_AGENT: exe, MBM_AGENT_DIR: agentDir() },
      }, (err) => { if (err) console.warn('[Agent] could not start the bundled agent:', err.message); resolve() })
    })
    // Wait for it, then make it the one that starts at sign-in (it writes its
    // own path to the user's Run key — replacing an old unzipped copy's).
    for (let i = 0; i < 30; i++) {
      await sleep(1000)
      if ((await probeAgent()) === want) {
        await fetch(`http://127.0.0.1:${AGENT_PORT}/api/auto-start`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true }),
        }).catch(() => {})
        return
      }
    }
    console.warn('[Agent] the bundled agent did not answer within 30 s')
  } catch (e) {
    console.warn('[Agent] ensureAgent failed:', e && e.message)
  }
}

const normUrl = (u) => String(u || '').trim().replace(/\/+$/, '').toLowerCase()

function taskExists() {
  return new Promise((resolve) => {
    execFile('schtasks', ['/query', '/tn', TASK_NAME], { windowsHide: true }, (err) => resolve(!err))
  })
}

function readStatus() {
  try { return readJson(STATUS_FILE) } catch { return null }
}

/** A hidden helper, as this user, that restarts the app once the task is done. */
function startRestartHelper() {
  // While the installer runs (~30 s, the app is closed by then) it shows a
  // small window, so the till isn't just blank.
  const script = `
$start = Get-Date
$f = Join-Path $env:ProgramData 'MBM POS\\update-status.json'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$form = New-Object Windows.Forms.Form
$form.Text = 'Multi-Business POS'; $form.Width = 460; $form.Height = 170; $form.TopMost = $true
$form.StartPosition = 'CenterScreen'; $form.FormBorderStyle = 'FixedDialog'; $form.ControlBox = $false
$label = New-Object Windows.Forms.Label
$label.Dock = 'Fill'; $label.TextAlign = 'MiddleCenter'; $label.Font = New-Object Drawing.Font('Segoe UI', 11)
$label.Text = "Updating the POS app...\`n\`nIt will reopen by itself."
$form.Controls.Add($label)
$shown = $false
for ($i = 0; $i -lt 1800; $i++) {
  Start-Sleep -Milliseconds 500
  [Windows.Forms.Application]::DoEvents()
  $s = $null; try { $s = Get-Content $f -Raw | ConvertFrom-Json } catch {}
  $fresh = $s -and ([datetime]$s.at -gt $start)
  if ($fresh -and $s.state -in 'done','failed','uptodate') { break }
  if (-not $shown -and -not (Get-Process 'Multi-Business POS' -ErrorAction SilentlyContinue)) { $form.Show(); $shown = $true }
  if ($shown -and $fresh -and $s.message) { $label.Text = "$($s.message)\`n\`nThe POS app will reopen by itself." }
}
if ($shown) { $label.Text = 'Reopening the POS app...'; [Windows.Forms.Application]::DoEvents() }
Start-Sleep -Seconds 1
if (-not (Get-Process 'Multi-Business POS' -ErrorAction SilentlyContinue)) { Start-Process -FilePath $env:MBM_EXE }
if ($shown) { for ($j = 0; $j -lt 10; $j++) { Start-Sleep -Milliseconds 500; [Windows.Forms.Application]::DoEvents() }; $form.Close() }
`
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  // Through Start-Process -WindowStyle Hidden, not spawn(detached): a
  // detached PowerShell has no console and quits without running anything
  // (1.0.41 never reopened after its update). Started this way it gets its
  // own hidden console and outlives this app, which the installer closes.
  return new Promise((resolve) => {
    execFile(POWERSHELL, ['-NoProfile', '-NonInteractive', '-Command',
      'Start-Process -FilePath $env:MBM_PS -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -EncodedCommand $env:MBM_SCRIPT"'], {
      windowsHide: true, env: { ...process.env, MBM_EXE: process.execPath, MBM_PS: POWERSHELL, MBM_SCRIPT: encoded },
    }, (err) => { if (err) console.warn('[Update] could not start the restart helper:', err.message); resolve() })
  })
}

async function installViaTask(progress) {
  const startedAt = Date.now()
  await startRestartHelper()
  await new Promise((resolve, reject) => {
    execFile('schtasks', ['/run', '/tn', TASK_NAME], { windowsHide: true }, (err, _o, stderr) =>
      err ? reject(new Error(`Could not start the updater task: ${(stderr || err.message).trim()}`)) : resolve())
  })
  progress({ phase: 'installing', message: 'Downloading and installing… the POS app will close and reopen by itself.' })
  // If the install goes ahead, the installer closes this app and the helper
  // reopens it. We only get past here when it didn't.
  for (let i = 0; i < 450; i++) {
    await sleep(2000)
    const s = readStatus()
    if (!s || new Date(s.at).getTime() < startedAt - 5000) continue
    if (s.state === 'failed') return { ok: false, error: s.message || 'The update failed.' }
    if (s.state === 'uptodate') return { ok: true, message: s.message || 'Already up to date.' }
    if (s.state === 'done') return { ok: true, message: 'Installed. Restarting…' }
    if (s.message) progress({ phase: 'installing', message: s.message })
  }
  return { ok: false, error: 'The updater did not finish within 15 minutes.' }
}

async function installViaPrompt(entry, serverSession, progress) {
  const base = entry.url.replace(/\/+$/, '')
  const infoRes = await serverSession.fetch(`${base}/api/public/electron/download?info=1`, { cache: 'no-store' })
  if (!infoRes.ok) throw new Error('The server has no POS app installer to give.')
  const info = (await infoRes.json()).data
  if (!info?.sha256) throw new Error('The server did not say which installer to expect.')

  const res = await serverSession.fetch(`${base}/api/public/electron/download`, { cache: 'no-store' })
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}).`)
  const total = Number(res.headers.get('content-length')) || 0
  const file = path.join(os.tmpdir(), String(info.file || 'Multi-Business-POS-Setup.exe').replace(/[^A-Za-z0-9._-]/g, '-'))
  const out = fs.createWriteStream(file)
  const hash = crypto.createHash('sha256')
  let got = 0
  let lastPct = -1
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const buf = Buffer.from(value)
    hash.update(buf)
    got += buf.length
    if (!out.write(buf)) await new Promise((r) => out.once('drain', r))
    const pct = total ? Math.floor((got / total) * 100) : -1
    if (pct !== lastPct) { lastPct = pct; progress({ phase: 'downloading', percent: pct, message: `Downloading POS app ${info.version}…` }) }
  }
  await new Promise((r, j) => out.end((e) => (e ? j(e) : r())))
  if (hash.digest('hex') !== String(info.sha256).toLowerCase()) {
    fs.rmSync(file, { force: true })
    throw new Error('The download is damaged (SHA-256 does not match). Nothing was installed.')
  }

  progress({ phase: 'confirm', message: 'Confirm the Windows prompt to install. The POS app will close and reopen by itself.' })
  // Start-Process goes through the Windows shell, which shows the prompt the
  // installer asks for (a plain spawn would just fail with "elevation required").
  const args = [`--mbm-server=${base}`]
  if (entry.certFingerprint) args.push(`--mbm-cert=${entry.certFingerprint}`)
  const script = "Start-Process -FilePath $env:MBM_FILE -ArgumentList $env:MBM_ARGS.Split(' ')"
  await new Promise((resolve, reject) => {
    execFile(POWERSHELL, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
      windowsHide: true, env: { ...process.env, MBM_FILE: file, MBM_ARGS: args.join(' ') },
    }, (err, _o, stderr) => (err ? reject(new Error(/cancel/i.test(stderr || '') ? 'The Windows prompt was cancelled. Nothing was installed.' : `Could not start the installer: ${(stderr || err.message).trim()}`)) : resolve()))
  })
  return { ok: true, message: 'Installing… the POS app will close and reopen by itself.' }
}

/**
 * @param entry          the active server (registry entry: url, certFingerprint)
 * @param serverSession  that server's session (its certificate trust applies)
 * @param progress       ({ phase, percent?, message }) => void
 */
async function installUpdate(entry, serverSession, progress) {
  if (!entry) return { ok: false, error: 'No server connected.' }
  try {
    let cfg = null
    try { cfg = readJson(CONFIG_FILE) } catch { /* not set up */ }
    if (cfg && normUrl(cfg.server) === normUrl(entry.url) && (await taskExists())) {
      const r = await installViaTask(progress)
      if (r.ok) return r
      // The no-prompt updater failed (e.g. it can't reach the server as
      // SYSTEM): fall back to the Windows prompt. That install also sets the
      // updater up again.
      console.warn('[Update] the updater task failed:', r.error)
      progress({ phase: 'fallback', message: `The automatic updater failed (${r.error}). Trying with the Windows prompt instead...` })
    }
    return await installViaPrompt(entry, serverSession, progress)
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) }
  }
}

module.exports = { ensureAgent, installUpdate, bundledAgentVersion }
