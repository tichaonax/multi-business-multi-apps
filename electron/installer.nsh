; Runs at the very start of the installer, before it touches any files —
; the on-workstation equivalent of scripts/stop-running-app.js, which only
; covers the DEV machine's own build step. Installing a new version over a
; previous one that's still running hits the exact same "file in use" wall
; (app.asar / the app's own .exe held open by the running process) — this
; closes it first so the upgrade can actually overwrite those files.
;
; Force-kill (/F) is deliberate, not a courtesy prompt — an admin running
; this installer is explicitly choosing to upgrade right now; the app has
; no unsaved state worth preserving (it's a POS/customer-display shell, not
; a document editor), and a running instance blocking its own upgrade
; silently is worse than one extra second of it closing automatically.
; Hardcoded, not an electron-builder template variable — deliberately, to
; avoid depending on an exact NSIS macro variable name that's easy to get
; wrong and would fail the installer build outright rather than just this
; one fix. Must be kept in sync with package.json's build.productName
; (also hardcoded the same way in scripts/stop-running-app.js, which reads
; it from package.json directly since it's plain Node, not NSIS).
!macro customInit
  nsExec::ExecToLog 'taskkill /F /IM "Multi-Business POS.exe"'
!macroend
