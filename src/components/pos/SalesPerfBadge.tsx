'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SalesPerfThresholds {
  /** Sales amount at which status becomes Fair (amber). Below this = Low (red). */
  fairMin: number
  /** Sales amount at which status becomes Good (green). */
  goodMin: number
  /** Sales amount at which the progress bar fills to 100%. */
  maxBar: number
}

export const DEFAULT_SALES_PERF_THRESHOLDS: SalesPerfThresholds = {
  fairMin: 100,
  goodMin: 150,
  maxBar: 200,
}

// Seeded pseudo-random so star positions are stable per-index (no jitter on re-render)
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const STAR_KEYFRAMES = `
@keyframes salesStarFloat {
  0%   { transform: translateX(-8vw) }
  100% { transform: translateX(108vw) }
}
`

interface SalesStarsProps {
  starCount: number
}

function SalesStars({ starCount }: SalesStarsProps) {
  const [mounted, setMounted] = useState(false)
  const styleInjected = useRef(false)

  useEffect(() => {
    setMounted(true)
    if (!styleInjected.current) {
      const style = document.createElement('style')
      style.textContent = STAR_KEYFRAMES
      document.head.appendChild(style)
      styleInjected.current = true
    }
  }, [])

  if (!mounted || typeof document === 'undefined') return null

  const stars = Array.from({ length: starCount }, (_, i) => {
    const top    = 6  + seededRand(i * 3)     * 42   // 6px – 48px from top
    const dur    = 10 + seededRand(i * 3 + 1) * 7    // 10s – 17s
    const delay  = -(seededRand(i * 3 + 2)    * dur) // negative delay = already mid-flight on mount
    const size   = 12 + seededRand(i * 7)     * 6    // 12px – 18px
    const opacity = 0.55 + seededRand(i * 11) * 0.35 // 0.55 – 0.90

    return (
      <span
        key={i}
        style={{
          position: 'fixed',
          top,
          left: 0,
          fontSize: size,
          opacity,
          pointerEvents: 'none',
          zIndex: 9999,
          lineHeight: 1,
          userSelect: 'none',
          animation: `salesStarFloat ${dur.toFixed(1)}s linear ${delay.toFixed(1)}s infinite`,
        }}
      >
        ⭐
      </span>
    )
  })

  return createPortal(<>{stars}</>, document.body)
}

interface SalesPerfBadgeProps {
  sales: number
  size?: 'sm' | 'md'
  thresholds?: SalesPerfThresholds
}

export function SalesPerfBadge({
  sales,
  size = 'md',
  thresholds = DEFAULT_SALES_PERF_THRESHOLDS,
}: SalesPerfBadgeProps) {
  const isGreen = sales >= thresholds.goodMin
  const isAmber = sales >= thresholds.fairMin
  const emoji = isGreen ? '🟢' : isAmber ? '🟡' : '🔴'
  const label = isGreen ? 'Good' : isAmber ? 'Fair' : 'Low'
  const barColor = isGreen
    ? 'bg-green-500'
    : isAmber
    ? 'bg-amber-400'
    : 'bg-red-500'
  const textColor = isGreen
    ? 'text-green-600 dark:text-green-400'
    : isAmber
    ? 'text-amber-500 dark:text-amber-400'
    : 'text-red-500'
  const fillPct = Math.min(100, (sales / thresholds.maxBar) * 100)

  // 1 star at 100%, +1 per 10% above, capped at 5
  const starCount = sales >= thresholds.maxBar
    ? Math.min(5, 1 + Math.floor((sales / thresholds.maxBar - 1) * 10))
    : 0

  if (size === 'sm') {
    return (
      <>
        {starCount > 0 && <SalesStars starCount={starCount} />}
        <span
          className="inline-flex items-center gap-0.5 flex-shrink-0"
          title={`${label} ($${sales.toFixed(2)})`}
        >
          <span className="text-[10px] leading-none">{emoji}</span>
        </span>
      </>
    )
  }

  return (
    <>
      {starCount > 0 && <SalesStars starCount={starCount} />}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-sm leading-none">{emoji}</span>
        <div className="w-14 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
      </div>
    </>
  )
}
