'use client'

// MBM-345: "← Back to …" that returns to the page this one was opened from
// (src/lib/nav-trail.ts), named after it — "Back to Reports", "Back to Saved
// Reports" — instead of always "Back to POS". Opened directly (a new tab, a
// bookmark) there is no previous page: it falls back to the given link.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { pageName, previousPage } from '@/lib/nav-trail'

export function BackLink({ fallbackHref, fallbackLabel = 'Back to POS', className }: {
  fallbackHref: string
  fallbackLabel?: string
  className?: string
}) {
  const pathname = usePathname()
  const [prev, setPrev] = useState<string | null>(null)
  // After mount only (sessionStorage), so the server and first render agree
  useEffect(() => { setPrev(previousPage(pathname || '/')) }, [pathname])

  return (
    <Link href={prev ?? fallbackHref} className={className}>
      ← {prev ? `Back to ${pageName(prev)}` : fallbackLabel}
    </Link>
  )
}
