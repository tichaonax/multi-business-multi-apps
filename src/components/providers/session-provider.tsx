'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

// Public paths that do NOT require authentication
const PUBLIC_PATHS = [
  '/',                  // Landing/homepage — unauthenticated users see the sign-in prompt here
  '/auth/signin',
  '/auth/register',
  '/auth/error',
  '/auth/redirect',
  '/customer-display',  // Electron customer-facing display — no login required
]

function SessionWatcher() {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') {
      const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
      if (!isPublic) {
        // Always send unauthenticated users to the landing page, not directly to sign-in
        router.replace('/')
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