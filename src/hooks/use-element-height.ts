'use client'

import { useRef, useState, useLayoutEffect } from 'react'

// Measures a DOM node's rendered height live (via ResizeObserver), so a
// sibling can stick directly below it with an exact pixel offset instead of
// a guessed one — used to keep a filters bar and a table header stacked as
// a single continuous sticky unit regardless of how tall the filters
// content happens to be (it wraps differently per breakpoint, per page).
export function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setHeight(el.getBoundingClientRect().height)
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setHeight(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, height }
}
