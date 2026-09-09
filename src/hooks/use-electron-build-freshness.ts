'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    __NEXT_DATA__?: { buildId?: string }
  }
}

// sessionStorage (not localStorage) deliberately -- it needs to survive the
// reloadIgnoringCache() this triggers (same tab/window), but reset on the
// next real app launch, so a persistent detection bug can't loop forever
// while still allowing every fresh launch a genuine retry.
const RETRY_FLAG_KEY = 'electron-build-freshness-retry'

/**
 * Electron-only: compares the buildId of the currently-loaded page
 * (window.__NEXT_DATA__.buildId, baked in by the server at render time)
 * against what the live server reports right now
 * (/api/public/build-version). A mismatch means this window is showing a
 * bundle from before the server's last rebuild/redeploy -- see
 * electron/main.js's clearCacheAndReload for why that can happen and stick
 * around indefinitely without this.
 *
 * Runs once per authenticated session (call this after login/session is
 * confirmed, not on every render) and clears+reloads at most once per app
 * launch -- if the mismatch somehow persists after that (a bad detection,
 * or the server itself is mid-deploy), it backs off rather than reload-
 * looping.
 */
export function useElectronBuildFreshnessCheck(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined' || !window.electron?.isElectron) return
    if (typeof window.electron.clearCacheAndReload !== 'function') return // older shell, no-op
    if (sessionStorage.getItem(RETRY_FLAG_KEY)) return

    const currentBuildId = window.__NEXT_DATA__?.buildId
    if (!currentBuildId) return

    fetch('/api/public/build-version')
      .then((res) => res.json())
      .then((json) => {
        const serverBuildId = json?.data?.buildId
        if (!serverBuildId || serverBuildId === currentBuildId) return

        console.log(`[BuildFreshness] Stale bundle detected (loaded ${currentBuildId}, server ${serverBuildId}) -- clearing cache and reloading once.`)
        sessionStorage.setItem(RETRY_FLAG_KEY, '1')
        window.electron?.clearCacheAndReload()
      })
      .catch(() => {}) // offline/unreachable -- fine, just keep using what's already loaded
  }, [enabled])
}
