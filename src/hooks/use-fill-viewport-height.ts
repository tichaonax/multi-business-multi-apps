'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * MBM-297 — measures the real remaining space from an element's top to the
 * bottom of the viewport, for the "fill the screen, scroll internally"
 * report layout (`.report-print-container`) used by the pricing/inventory
 * reports. Two earlier attempts at this used a hardcoded
 * `calc(100vh - Npx)` guess for the space taken by the sticky global nav
 * plus MainLayout's own wrapper padding — both guesses were wrong in a way
 * that let the container end up taller than the space actually available,
 * pushing the page into a small scroll that hid the report's search bar
 * behind the nav. Measuring the element's real position sidesteps needing
 * to know any of those numbers, and stays correct if either ever changes.
 */
export function useFillViewportHeight(deps: unknown[] = [], bottomBuffer = 16) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    function update() {
      if (!ref.current) return
      const top = ref.current.getBoundingClientRect().top
      setHeight(Math.max(240, window.innerHeight - top - bottomBuffer))
    }
    update()
    window.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    if (ref.current) ro.observe(document.body)
    return () => {
      window.removeEventListener('resize', update)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bottomBuffer, ...deps])

  // Falls back to the old viewport-relative guess only until the real
  // measurement is available (first paint / SSR) — avoids a layout flash.
  return { ref, style: { height: height !== null ? `${height}px` : 'calc(100vh - 64px)' } }
}
