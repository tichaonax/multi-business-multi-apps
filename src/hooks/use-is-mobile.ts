'use client'

import { useState, useEffect } from 'react'

// Matches the `lg` breakpoint already used to hide the floating chat bubble
// below it (see floating-chat.tsx's minimized bubble) — anything narrower
// counts as mobile for chat layout purposes.
export function useIsMobile(breakpointPx = 1024) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [breakpointPx])

  return isMobile
}
