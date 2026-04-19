'use client'

import { SessionProvider, useSession, getSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

// Public paths that do NOT require authentication
const PUBLIC_PATHS = [
  '/',                  // Landing/homepage — unauthenticated users see the sign-in prompt here
  '/auth/signin',
  '/auth/register',
  '/auth/error',
  '/auth/redirect',
  '/customer-display',  // Electron customer-facing display — no login required
]

// How long (ms) the session must stay gone before we redirect.
// In dev mode, hot-reload can cause a brief signout followed by immediate re-auth.
// We do a live re-check at the end of this window before committing to a redirect.
const REDIRECT_GRACE_MS = 4000

function SessionWatcher() {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
      if (!isPublic && !timerRef.current) {
        timerRef.current = setTimeout(async () => {
          timerRef.current = null
          // Live-check the session before redirecting — a hot-reload or brief
          // network hiccup may have already recovered the session by now.
          try {
            const fresh = await getSession()
            if (fresh) return // Session recovered — do nothing
          } catch {
            // Network error: be conservative and do not redirect
            return
          }
          router.replace('/')
        }, REDIRECT_GRACE_MS)
      }
    } else {
      // Status is 'loading' or 'authenticated' — cancel any pending redirect
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
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
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={false}>
      <SessionWatcher />
      {children}
    </SessionProvider>
  )
}