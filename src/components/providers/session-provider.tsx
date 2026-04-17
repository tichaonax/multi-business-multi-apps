'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

// Public paths that do NOT require authentication
const PUBLIC_PATHS = ['/auth/signin', '/auth/register', '/auth/error', '/auth/redirect']

function SessionWatcher() {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') {
      const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
      if (!isPublic) {
        router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`)
      }
    }
  }, [status, pathname, router])

  return null
}

export function CustomSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // refetchInterval keeps the session fresh; when it finally expires the
    // status flips to 'unauthenticated' and SessionWatcher redirects immediately.
    <SessionProvider refetchInterval={4 * 60} refetchOnWindowFocus={true}>
      <SessionWatcher />
      {children}
    </SessionProvider>
  )
}