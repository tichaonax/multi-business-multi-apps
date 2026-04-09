'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export type UserPermissions = Record<string, boolean>

// Module-level cache — shared across all components, avoids duplicate fetches
let _cachedPromise: Promise<UserPermissions | null> | null = null
let _cachedAt = 0

function fetchUserPermissions(bustCache = false): Promise<UserPermissions | null> {
  const now = Date.now()
  if (!bustCache && _cachedPromise && now - _cachedAt < 30000) return _cachedPromise
  _cachedAt = now
  _cachedPromise = fetch('/api/user/permissions', { credentials: 'include' })
    .then(r => (r.ok ? r.json() : null))
    .then(d => d?.permissions ?? null)
    .catch(() => null)
  return _cachedPromise
}

/**
 * Returns user-level permissions fetched from the API.
 * `loaded` is false while the initial fetch is in flight — use it to
 * defer redirects so users are not sent to /unauthorized before we know
 * whether they actually have access.
 */
export function useUserPermissions(): { permissions: UserPermissions | null; loaded: boolean } {
  const { status } = useSession()
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (status !== 'authenticated') {
      setPermissions(null)
      setLoaded(true)
      return
    }
    fetchUserPermissions().then(p => {
      setPermissions(p)
      setLoaded(true)
    })
  }, [status])

  return { permissions, loaded }
}
