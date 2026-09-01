'use client'

import { useEffect, useState } from 'react'
import { compareVersions } from '@/lib/workstation-agents/agent-version'

interface ElectronAppVersionInfo {
  version: string | null
  isOutdated: boolean
}

/**
 * The installed Electron kiosk shell's own version, plus whether it's
 * behind what /api/public/electron/latest-version currently reports —
 * same "is this workstation behind or not" question the r710-agent update
 * check already answers for that agent, applied here to the kiosk shell
 * itself. null/false outside Electron or before either value has loaded.
 */
export function useElectronAppVersion(): ElectronAppVersionInfo {
  const [version, setVersion] = useState<string | null>(null)
  const [latestVersion, setLatestVersion] = useState<string | null>(null)

  useEffect(() => {
    if (!window.electron?.isElectron) return
    // getAppVersion() is a newer preload method — an Electron shell installed
    // before this feature shipped exposes window.electron without it, and
    // calling a non-existent method throws synchronously (not a promise
    // rejection .catch() would ever see), crashing the whole page. Guard
    // the version check itself the same way as an update-required banner:
    // an older kiosk should just not show this badge, not crash on it.
    if (typeof window.electron.getAppVersion !== 'function') return
    window.electron.getAppVersion().then(setVersion).catch(() => {})
    fetch('/api/public/electron/latest-version')
      .then((res) => res.json())
      .then((json) => setLatestVersion(json?.data?.version ?? null))
      .catch(() => {})
  }, [])

  const isOutdated = !!(version && latestVersion && compareVersions(version, latestVersion) < 0)

  return { version, isOutdated }
}
