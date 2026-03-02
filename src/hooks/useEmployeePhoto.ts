import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

/** Returns the current logged-in user's employee profile photo URL, or null. */
export function useEmployeePhoto(): string | null {
  const { data: session } = useSession()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!(session?.user as any)?.id) return
    fetch('/api/employees/my-photo')
      .then((r) => r.json())
      .then((d) => setPhotoUrl(d.profilePhotoUrl ?? null))
      .catch(() => {})
  }, [(session?.user as any)?.id])

  return photoUrl
}
