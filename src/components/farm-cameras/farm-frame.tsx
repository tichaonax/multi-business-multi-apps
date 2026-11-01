'use client'

// MBM-331 — one Farm Control frame (strip, preview tile, viewer or player).
// - Passes on only the messages that came from this frame.
// - Sends `close` before the frame is removed, so its live places are free at
//   once (guide §5). A layout-effect cleanup runs while the iframe is still in
//   the page; a normal effect cleanup would be too late.
// - Opens in MBM's look (guide §5.3, revision 4): light or dark as MBM shows
//   it, MBM's blue and backgrounds; when the user switches theme the frame is
//   sent a `theme` message and follows at once, without a reload.
// Give it a `key` that changes with `src`: a new address is a new frame.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTheme } from '@/contexts/theme-context'
import { FarmMessage, useFarmControl } from './farm-control-provider'

/** MBM's colours for the frames: six hex digits, no # (guide §5.3) */
const LOOK = {
  light: { theme: 'light', accent: '2563eb', accentText: 'ffffff', bg: 'ffffff', panel: 'f3f4f6' },
  dark: { theme: 'dark', accent: '2563eb', accentText: 'ffffff', bg: '111827', panel: '1f2937' },
} as const

function withLook(src: string, look: Record<string, string>) {
  const u = new URL(src)
  for (const [k, v] of Object.entries(look)) u.searchParams.set(k, v)
  return u.toString()
}

interface FarmFrameProps {
  src: string
  title: string
  className?: string
  style?: React.CSSProperties
  onMessage?: (m: FarmMessage) => void
  /** The iframe, for sending it messages */
  onFrame?: (frame: HTMLIFrameElement | null) => void
}

export function FarmFrame({ src, title, className, style, onMessage, onFrame }: FarmFrameProps) {
  const farm = useFarmControl()
  const { resolvedTheme } = useTheme()
  const ref = useRef<HTMLIFrameElement>(null)
  const handler = useRef(onMessage)
  handler.current = onMessage
  const send = useRef(farm?.send)
  send.current = farm?.send
  const subscribe = farm?.subscribe
  // The look goes in the address once; later changes go as messages
  const [fullSrc] = useState(() => withLook(src, LOOK[resolvedTheme]))
  const lookSent = useRef(resolvedTheme)

  useEffect(() => {
    if (!subscribe) return
    return subscribe((m, source) => {
      if (source && source === ref.current?.contentWindow) handler.current?.(m)
    })
  }, [subscribe])

  useEffect(() => {
    if (lookSent.current === resolvedTheme) return
    lookSent.current = resolvedTheme
    send.current?.(ref.current, { type: 'theme', ...LOOK[resolvedTheme] })
  }, [resolvedTheme])

  useLayoutEffect(() => {
    const el = ref.current
    onFrame?.(el)
    return () => {
      send.current?.(el, { type: 'close' })
      onFrame?.(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once per frame

  return <iframe ref={ref} src={fullSrc} title={title} allow="autoplay; fullscreen" className={className} style={{ border: 0, ...style }} />
}
