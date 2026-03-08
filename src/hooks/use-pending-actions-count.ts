import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

/**
 * Returns the total count of pending actions requiring the current user's attention.
 * The API itself gates each section by the user's permissions, so we fetch for all
 * authenticated users and surface the count only when > 0.
 */
export function usePendingActionsCount(): number {
  const { data: session, status } = useSession()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (status !== 'authenticated') { setCount(0); return }
    fetch('/api/admin/pending-actions', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setCount(data?.total ?? 0) })
      .catch(() => {})
  }, [status])

  return count
}
