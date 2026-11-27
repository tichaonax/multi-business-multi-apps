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
  ; MBM-352: the POS app carries the R710 agent (resources\agent). Close it
  ; and its tray helper too, so their files can be replaced. The POS app
  ; starts the new agent when it next opens.
  nsExec::ExecToLog 'taskkill /F /IM "r710-agent.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "tray_windows_release.exe"'
!macroend

; MBM-352: set up the "MBM POS Updater" task (updater\setup-updater.ps1), so
; a standard Windows user can update from the POS app without an admin
; password. --mbm-server=<url> [--mbm-cert=sha256/...] is passed by the POS
; app's "Update now" and by install-pos.ps1. A silent install by the task
; itself passes neither and keeps the server already set.
!macro customInstall
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "--mbm-server=" $R1
  ${If} ${Errors}
    StrCpy $R1 ""
  ${EndIf}
  ClearErrors
  ${GetOptions} $R0 "--mbm-cert=" $R2
  ${If} ${Errors}
    StrCpy $R2 ""
  ${EndIf}
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\updater\setup-updater.ps1" -InstallDir "$INSTDIR" -Server "$R1" -Cert "$R2"'

  ; MBM-352: put the desktop and Start menu shortcuts (all users) back if
  ; someone deleted them, so the app can always be reopened by hand.
  ; electron-builder only creates them on a first install, not on an update.
  ${IfNot} ${FileExists} "$DESKTOP\${SHORTCUT_NAME}.lnk"
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  ${EndIf}
  ${IfNot} ${FileExists} "$SMPROGRAMS\${SHORTCUT_NAME}.lnk"
    CreateShortCut "$SMPROGRAMS\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  ${EndIf}
  ClearErrors
!macroend

; Remove the task on a real uninstall only. An upgrade runs the old
; uninstaller first, and the new install sets the task up again.
!macro customUnInstall
  ${IfNot} ${isUpdated}
    nsExec::ExecToLog 'schtasks /delete /tn "MBM POS Updater" /f'
  ${EndIf}
!macroend
