'use client'

import { useEffect, useState } from 'react'

// Shared parsing + rendering for the vehicle/driver license compliance
// digest text (see buildComplianceDigestText in
// src/lib/vehicles/license-reminder-notify.ts) — used by both the System
// Alerts chat window and the notification bell panel so the two never grow
// their own separate copies of this formatting. Same message format, same
// component, same "Renew →" / "Open driver →" links everywhere it appears.

export const COMPLIANCE_DIGEST_MARKER = '🚨 Vehicle & Driver License Compliance Alert'

// Shared so the collapsed card's fine-print "when was this created" always
// reads identically wherever it appears (System Alerts chat, notification
// bell) — one format, not a format each caller invents for itself.
export function formatAlertTimestamp(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Deterministic per-identifier colour palette — also used for chat message
// avatars (see getUserColor usage in chat-window.tsx), reused here so a
// given vehicle/driver always gets the same colour across the chat digest,
// the bell panel, and anywhere else this renders.
const PALETTE = [
  { avatar: 'bg-rose-500',    name: 'text-rose-600 dark:text-rose-400',    border: 'border-l-rose-400'    },
  { avatar: 'bg-amber-500',   name: 'text-amber-600 dark:text-amber-400',   border: 'border-l-amber-400'   },
  { avatar: 'bg-emerald-500', name: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-400' },
  { avatar: 'bg-cyan-600',    name: 'text-cyan-600 dark:text-cyan-400',     border: 'border-l-cyan-400'    },
  { avatar: 'bg-violet-500',  name: 'text-violet-600 dark:text-violet-400', border: 'border-l-violet-400'  },
  { avatar: 'bg-pink-500',    name: 'text-pink-600 dark:text-pink-400',     border: 'border-l-pink-400'    },
  { avatar: 'bg-orange-500',  name: 'text-orange-600 dark:text-orange-400', border: 'border-l-orange-400'  },
  { avatar: 'bg-teal-600',    name: 'text-teal-600 dark:text-teal-400',     border: 'border-l-teal-400'    },
]
export function getUserColor(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export interface ComplianceItem {
  identifier: string
  subtitle: string
  licenseInfo: string
  dateLine: string
  daysLabel: string
  isOverdue: boolean
  vehicleId?: string
  licenseId?: string
  driverId?: string
  driverOldExpiry?: string
}

// MBM-306 — per-item resolution state, fetched live from
// POST /api/vehicles/license-alert-status rather than stored on the alert
// text itself (see that route's own doc comment for why).
export interface AlertResolution {
  resolved: boolean
  renewedAt?: string
  newLicenseNumber?: string
  newExpiryDate?: string
}
export interface ComplianceSection {
  heading: string
  isOverdueSection: boolean
  items: ComplianceItem[]
}
export interface ParsedComplianceDigest {
  title: string
  sections: ComplianceSection[]
  footer: string
}

// Parses the optional trailing `ref:` line (see formatVehicleLine /
// formatDriverLine in license-reminder-notify.ts) — absent on messages
// stored before this existed, so callers must check the line actually
// starts with 'ref:' before consuming it as part of the item, or an older
// message's next bullet/heading line would get silently swallowed.
function parseRef(line: string): { vehicleId?: string; licenseId?: string; driverId?: string; driverOldExpiry?: string } {
  if (line.startsWith('ref:driver:')) {
    // 'ref:driver:<id>:<ISO old expiry>' — the ISO timestamp itself
    // contains colons, so split only on the first two after the prefix.
    const rest = line.slice('ref:driver:'.length)
    const sep = rest.indexOf(':')
    if (sep === -1) return { driverId: rest }
    return { driverId: rest.slice(0, sep), driverOldExpiry: rest.slice(sep + 1) }
  }
  if (line.startsWith('ref:')) {
    const [, vehicleId, licenseId] = line.split(':')
    return { vehicleId, licenseId }
  }
  return {}
}

export function parseComplianceDigest(message: string): ParsedComplianceDigest | null {
  if (!message.startsWith(COMPLIANCE_DIGEST_MARKER)) return null
  const lines = message.split('\n')
  let i = 0
  const title = lines[i++] ?? ''
  while (i < lines.length && lines[i].trim() === '') i++

  const sections: ComplianceSection[] = []
  let footer = ''
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('⛔') || line.startsWith('⚠️')) {
      const heading = line
      const isOverdueSection = line.startsWith('⛔')
      i++
      const items: ComplianceItem[] = []
      while (i < lines.length && lines[i].startsWith('• ')) {
        const first = lines[i].slice(2)
        const expiryRaw = (lines[i + 1 + (first.includes("— Driver's license") ? 0 : 1)] ?? '').trim()
        const [dateLine, daysLabel] = expiryRaw.split('—').map(s => s.trim())
        const isOverdue = expiryRaw.includes('OVERDUE')
        if (first.includes("— Driver's license")) {
          const identifier = (first.split(' — ')[0] ?? first).trim()
          const refCandidate = (lines[i + 2] ?? '').trim()
          const hasRef = refCandidate.startsWith('ref:')
          items.push({ identifier, subtitle: "Driver's Licence", licenseInfo: '', dateLine: dateLine ?? '', daysLabel: daysLabel ?? '', isOverdue, ...(hasRef ? parseRef(refCandidate) : {}) })
          i += hasRef ? 3 : 2
        } else {
          const [identifier, subtitle] = first.split(' — ')
          const licenseInfo = (lines[i + 1] ?? '').trim()
          const refCandidate = (lines[i + 3] ?? '').trim()
          const hasRef = refCandidate.startsWith('ref:')
          items.push({ identifier: (identifier ?? first).trim(), subtitle: (subtitle ?? '').trim(), licenseInfo, dateLine: dateLine ?? '', daysLabel: daysLabel ?? '', isOverdue, ...(hasRef ? parseRef(refCandidate) : {}) })
          i += hasRef ? 4 : 3
        }
      }
      sections.push({ heading, isOverdueSection, items })
      while (i < lines.length && lines[i].trim() === '') i++
    } else if (line.startsWith('This is a read-only')) {
      footer = line
      i++
    } else {
      i++
    }
  }
  return { title, sections, footer }
}

function ComplianceItemCard({ item, resolution }: { item: ComplianceItem; resolution?: AlertResolution }) {
  const color = getUserColor(item.identifier)
  // Carries the page the user was on back through the deep link — closing
  // the vehicle/driver that opens returns them here instead of stranding
  // them on /vehicles (see the onClose handler in vehicles/page.tsx).
  const returnTo = typeof window !== 'undefined' ? `&returnTo=${encodeURIComponent(window.location.href)}` : ''
  const resolved = resolution?.resolved === true

  return (
    <div className={`rounded-md border-l-4 ${resolved ? 'border-l-emerald-400' : color.border} bg-white/70 dark:bg-black/25 px-2 py-1.5 mb-1.5 last:mb-0`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[12px] font-bold leading-tight ${resolved ? 'text-secondary' : color.name}`}>{item.identifier}</span>
        {item.daysLabel && (
          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${resolved ? 'bg-gray-200 dark:bg-gray-700 text-secondary line-through' : item.isOverdue ? 'bg-red-600 text-white' : 'bg-amber-400 dark:bg-amber-500 text-amber-950'}`}>
            {item.daysLabel}
          </span>
        )}
      </div>
      {item.subtitle && <div className="text-[10px] text-secondary leading-snug">{item.subtitle}</div>}
      {item.licenseInfo && <div className="text-[10px] text-secondary leading-snug">{item.licenseInfo}</div>}
      {item.dateLine && (
        // The original overdue/expiry line stays visible but crossed out
        // once resolved — the point is to show the condition WAS true and
        // has since been fixed, not to erase that it ever happened.
        <div className={`text-[10px] font-semibold mt-0.5 ${resolved ? 'text-secondary line-through' : item.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {item.dateLine}
        </div>
      )}

      {resolved ? (
        <>
          <div className="text-[10px] font-semibold mt-1 text-emerald-700 dark:text-emerald-400">
            ✅ Renewed {resolution?.renewedAt ? formatAlertTimestamp(resolution.renewedAt) : ''}
            {resolution?.newExpiryDate && ` — new expiry ${new Date(resolution.newExpiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`}
            {resolution?.newLicenseNumber && ` (#${resolution.newLicenseNumber})`}
          </div>
          {/* Non-interactive on purpose (AC-03/AC-04) — this period is
              resolved and cannot be renewed again from here. */}
          <span className="inline-block mt-1 text-[10px] font-semibold text-secondary cursor-default select-none">
            Renewed — no further action needed
          </span>
        </>
      ) : (
        <>
          {item.vehicleId && item.licenseId && (
            <a
              href={`/vehicles?recordType=vehicle-license-renew&openRecordId=${item.vehicleId}&licenseId=${item.licenseId}${returnTo}`}
              className="inline-block mt-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Renew →
            </a>
          )}
          {item.driverId && (
            <a
              href="/vehicles?tab=drivers"
              className="inline-block mt-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open driver →
            </a>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Renders the parsed sections/items/footer for a compliance digest message
 * — the part every caller wants to look identical. Callers own their own
 * outer chrome (the chat window's amber expandable card with its own
 * delete button; the notification panel's row with its own read/dismiss
 * controls) since that differs by context, but the actual per-vehicle
 * breakdown is exactly this component everywhere it's used.
 */
export function ComplianceDigestSections({ message }: { message: string }) {
  const parsed = parseComplianceDigest(message)
  const [resolutions, setResolutions] = useState<{ licenses: Record<string, AlertResolution>; drivers: Record<string, AlertResolution> }>({ licenses: {}, drivers: {} })

  // One batched lookup per rendered message, covering every item in it —
  // not per-item, so expanding a digest with a dozen vehicles costs one
  // request, not a dozen. Re-fetches if the message content changes (e.g.
  // the chat window re-renders a different alert in the same slot).
  useEffect(() => {
    if (!parsed) return
    const licenseIds: string[] = []
    const drivers: { driverId: string; oldExpiry: string }[] = []
    for (const section of parsed.sections) {
      for (const item of section.items) {
        if (item.licenseId) licenseIds.push(item.licenseId)
        if (item.driverId && item.driverOldExpiry) drivers.push({ driverId: item.driverId, oldExpiry: item.driverOldExpiry })
      }
    }
    if (licenseIds.length === 0 && drivers.length === 0) return
    let cancelled = false
    fetch('/api/vehicles/license-alert-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseIds, drivers }),
    })
      .then(res => res.json())
      .then(json => {
        if (!cancelled && json?.success) setResolutions(json.data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [message])

  if (!parsed) {
    return <p className="text-[11px] whitespace-pre-wrap leading-relaxed">{message}</p>
  }
  return (
    <div className="space-y-2">
      {parsed.sections.map((section, sIdx) => (
        <div key={sIdx}>
          <p className={`text-[11px] font-bold mb-1 ${section.isOverdueSection ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {section.heading}
          </p>
          {section.items.map((item, idx) => (
            <ComplianceItemCard
              key={idx}
              item={item}
              resolution={item.licenseId ? resolutions.licenses[item.licenseId] : item.driverId ? resolutions.drivers[item.driverId] : undefined}
            />
          ))}
        </div>
      ))}
      {parsed.footer && (
        <p className="text-[10px] text-amber-700 dark:text-amber-400 italic">{parsed.footer}</p>
      )}
    </div>
  )
}
