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
    window.electron.getAppVersion().then(setVersion).catch(() => {})
    fetch('/api/public/electron/latest-version')
      .then((res) => res.json())
      .then((json) => setLatestVersion(json?.data?.version ?? null))
      .catch(() => {})
  }, [])

  const isOutdated = !!(version && latestVersion && compareVersions(version, latestVersion) < 0)

  return { version, isOutdated }
}
