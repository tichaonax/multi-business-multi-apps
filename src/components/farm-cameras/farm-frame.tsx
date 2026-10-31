'use client'

// MBM-331 — one Farm Control frame (strip, preview tile or player).
// - Passes on only the messages that came from this frame.
// - Sends `close` before the frame is removed, so its live places are free at
//   once (guide §5). A layout-effect cleanup runs while the iframe is still in
//   the page; a normal effect cleanup would be too late.
// Give it a `key` that changes with `src`: a new address is a new frame.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { FarmMessage, useFarmControl } from './farm-control-provider'

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
  const ref = useRef<HTMLIFrameElement>(null)
  const handler = useRef(onMessage)
  handler.current = onMessage
  const send = useRef(farm?.send)
  send.current = farm?.send
  const subscribe = farm?.subscribe

  useEffect(() => {
    if (!subscribe) return
    return subscribe((m, source) => {
      if (source && source === ref.current?.contentWindow) handler.current?.(m)
    })
  }, [subscribe])

  useLayoutEffect(() => {
    const el = ref.current
    onFrame?.(el)
    return () => {
      send.current?.(el, { type: 'close' })
      onFrame?.(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once per frame

  return <iframe ref={ref} src={src} title={title} allow="autoplay; fullscreen" className={className} style={{ border: 0, ...style }} />
}
