/**
 * MBM-276 Phase E: "Manage Profiles" page — a small, dependency-free HTML
 * page served by pairing-server.ts at http://127.0.0.1:47710/ so an admin
 * standing at the workstation (not just via the tray) can see every paired
 * server, release the scale, toggle auto-start, and restart the agent.
 *
 * Deliberately a single inline string, not a bundled frontend — this is a
 * few dozen lines of vanilla JS polling one JSON endpoint, and adding a
 * build step (or a static-file-serving path) for that would be more
 * machinery than the page itself.
 */

export function buildManagePageHtml(): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MBM Local Agent</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 720px; margin: 32px auto; padding: 0 16px; color: #1a1a1a; background: #fafafa; }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  .sub { color: #666; font-size: 0.9rem; margin-bottom: 24px; }
  .card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .profile { border-bottom: 1px solid #eee; padding: 12px 0; }
  .profile:last-child { border-bottom: none; }
  .profile-label { font-weight: 600; }
  .profile-url { color: #888; font-size: 0.8rem; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 500; margin-left: 6px; }
  .ok { background: #d4f4dd; color: #1a7a3a; }
  .bad { background: #fde2e2; color: #b42318; }
  .warn { background: #fff3cd; color: #8a6100; }
  .none { background: #eee; color: #888; }
  button { cursor: pointer; border: 1px solid #ccc; background: #fff; border-radius: 6px; padding: 6px 12px; font-size: 0.85rem; }
  button:hover { background: #f0f0f0; }
  button.danger { border-color: #e0a0a0; color: #b42318; }
  .empty { color: #888; font-style: italic; }
  .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; inset: 0; background: #ccc; border-radius: 22px; transition: .15s; cursor: pointer; }
  .slider:before { content: ""; position: absolute; height: 16px; width: 16px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: .15s; }
  input:checked + .slider { background: #2563eb; }
  input:checked + .slider:before { transform: translateX(18px); }
  @media (prefers-color-scheme: dark) {
    body { color: #eee; background: #1a1a1a; }
    .card { background: #262626; border-color: #3a3a3a; }
    .profile { border-color: #333; }
    .sub, .profile-url { color: #999; }
    button { background: #333; border-color: #4a4a4a; color: #eee; }
    button:hover { background: #3a3a3a; }
  }
</style>
</head>
<body>
  <h1>MBM Local Agent</h1>
  <div class="sub">Running on this machine — paired server profiles and local device status.</div>

  <div class="card">
    <div class="row">
      <div>
        <div style="font-weight:600">Start with Windows</div>
        <div class="sub" style="margin:0">Launches the agent automatically when you sign in. Applies to the whole agent — every profile below.</div>
      </div>
      <label class="switch"><input id="autoStart" type="checkbox" onchange="toggleAutoStart(this.checked)"><span class="slider"></span></label>
    </div>
  </div>

  <div class="card" id="scaleCard"></div>

  <div class="card">
    <div style="font-weight:600; margin-bottom:8px">Paired Servers</div>
    <div id="profiles"></div>
  </div>

  <div class="card row">
    <div class="sub" style="margin:0">Reconnects every paired profile.</div>
    <button onclick="restart()">Restart Agent</button>
  </div>

<script>
function badge(text, cls) { return '<span class="badge ' + cls + '">' + text + '</span>' }
function stateBadge(label, state) {
  if (!state) return ''
  var cls = state === 'connected' ? 'ok' : state === 'connecting' ? 'warn' : 'bad'
  return badge(label + ': ' + state, cls)
}

async function load() {
  const res = await fetch('/api/status')
  const s = await res.json()

  document.getElementById('autoStart').checked = !!s.autoStartEnabled

  const scaleCard = document.getElementById('scaleCard')
  let scaleHtml = '<div class="row"><div style="font-weight:600">Scale</div>'
  if (s.scaleOwnerProfileId) {
    const cls = s.scaleStatus.status === 'connected' ? 'ok' : s.scaleStatus.status === 'error' ? 'bad' : 'warn'
    scaleHtml += badge(s.scaleStatus.status + (s.scaleStatus.comPort ? ' on ' + s.scaleStatus.comPort : ''), cls)
    scaleHtml += '</div><div class="sub" style="margin-top:6px">Owned by <strong>' + esc(s.scaleOwnerLabel || s.scaleOwnerProfileId) + '</strong></div>'
    scaleHtml += '<div style="margin-top:8px"><button onclick="releaseScale()">Release</button></div>'
  } else {
    scaleHtml += badge('not connected', 'none') + '</div>'
  }
  scaleCard.innerHTML = scaleHtml

  const container = document.getElementById('profiles')
  if (s.profiles.length === 0) {
    container.innerHTML = '<div class="empty">No profiles paired yet. Pair from the admin panel on the server you want to connect to.</div>'
    return
  }
  container.innerHTML = s.profiles.map(function (p) {
    return '<div class="profile">' +
      '<div class="row">' +
        '<div><div class="profile-label">' + esc(p.label) + '</div><div class="profile-url">' + esc(p.serverUrl) + '</div></div>' +
        '<button class="danger" onclick="unpair(\\'' + p.profileId + '\\', \\'' + esc(p.label).replace(/'/g, "\\\\'") + '\\')">Unpair</button>' +
      '</div>' +
      '<div style="margin-top:6px">' + stateBadge('R710', p.r710State) + ' ' + stateBadge('Printer', p.workstationState) + '</div>' +
    '</div>'
  }).join('')
}

function esc(str) {
  return String(str).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] })
}

async function toggleAutoStart(enabled) {
  await fetch('/api/auto-start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) })
  load()
}
async function releaseScale() {
  await fetch('/api/scale/release', { method: 'POST' })
  load()
}
async function restart() {
  await fetch('/api/restart', { method: 'POST' })
  setTimeout(load, 1500)
}
async function unpair(profileId, label) {
  if (!confirm('Unpair "' + label + '"? This removes its saved credentials from this machine — you\\'ll need to re-pair from that server\\'s admin panel to reconnect.')) return
  await fetch('/api/profiles/' + encodeURIComponent(profileId) + '/unpair', { method: 'POST' })
  load()
}

load()
setInterval(load, 4000)
</script>
</body>
</html>`
}
