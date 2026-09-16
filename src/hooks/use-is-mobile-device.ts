'use client'

import { useEffect, useState } from 'react'

/**
 * MBM-297 Phase C — detects a touch-primary device (phone/tablet) so the
 * "Take Photo" camera-capture action can be gated to mobile only, per the
 * spec's explicit requirement that desktop never sees a camera-capture
 * action. `(pointer: coarse)` is the primary-input signal (a mouse-equipped
 * laptop with a touchscreen still reports `fine` as its primary pointer);
 * the width check is a fallback for browsers/environments that don't
 * support the media query.
 */
export function useIsMobileDevice(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)')
    function update() {
      setIsMobile(mql.matches || window.innerWidth < 768)
    }
    update()
    mql.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      mql.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return isMobile
}
