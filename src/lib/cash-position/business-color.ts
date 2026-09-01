/**
 * MBM-287 §5: consistent, accessible per-business colour identification.
 * Uses Businesses.displayColor when an admin has set one; otherwise falls
 * back to a deterministic hash-of-id pick from a fixed palette, so every
 * business gets a stable colour immediately with zero backfill required —
 * the same business always lands on the same fallback colour across every
 * screen, since the hash is a pure function of its id.
 *
 * Palette chosen for contrast against both light and dark chart/text
 * backgrounds — pair with the business name/label everywhere, never colour
 * alone (accessibility).
 */

const FALLBACK_PALETTE = [
  '#2563eb', // blue
  '#16a34a', // green
  '#d97706', // amber
  '#dc2626', // red
  '#7c3aed', // violet
  '#0d9488', // teal
  '#db2777', // pink
  '#4b5563', // slate
  '#65a30d', // lime
  '#0891b2', // cyan
]

function hashString(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  }
  return hash
}

export function getBusinessColor(business: { id: string; displayColor?: string | null }): string {
  if (business.displayColor) return business.displayColor
  return FALLBACK_PALETTE[hashString(business.id) % FALLBACK_PALETTE.length]
}
