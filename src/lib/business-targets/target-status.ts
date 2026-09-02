/**
 * MBM-288 §3.4 — Ahead/On Track/Watch/Behind status thresholds. Shared by
 * the POS widget's `/today` endpoint and the expanded view's `/expanded`
 * endpoint so the two can't drift apart. A starting proposal, not researched
 * constants (plan §7, decision 5: accepted as proposed) — expect to tune
 * once real target performance data exists.
 */

export const AHEAD_THRESHOLD = 1.05
export const ON_TRACK_THRESHOLD = 0.95
export const WATCH_THRESHOLD = 0.75

export type TargetStatus = 'AHEAD' | 'ON_TRACK' | 'WATCH' | 'BEHIND'

export function statusForRatio(ratio: number): TargetStatus {
  if (ratio >= AHEAD_THRESHOLD) return 'AHEAD'
  if (ratio >= ON_TRACK_THRESHOLD) return 'ON_TRACK'
  if (ratio >= WATCH_THRESHOLD) return 'WATCH'
  return 'BEHIND'
}
