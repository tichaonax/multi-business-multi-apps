'use client'

// MBM-340 — 📹 in the top bar with the new camera alerts count (alert list
// guide §2.1). Shown once the person has ever had a camera alert; opens the
// panel on whatever page they're on.
import { useFarmAlerts } from './farm-alerts-provider'

export function FarmAlertButton() {
  const alerts = useFarmAlerts()
  if (!alerts || (!alerts.ever && alerts.newCount === 0)) return null
  const n = alerts.newCount
  return (
    <button
      onClick={() => (alerts.panel === 'open' ? alerts.closeAlerts() : alerts.openAlerts())}
      className={`relative flex items-center gap-1 px-2 py-1.5 rounded-md text-sm transition-colors ${
        n > 0
          ? 'border border-amber-400 text-gray-900 dark:text-white hover:bg-amber-50 dark:hover:bg-amber-900/20'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      title={n > 0 ? `${n} new camera alert${n === 1 ? '' : 's'}` : 'Camera alerts'}
    >
      <span>📹</span>
      {n > 0 && <span className="min-w-[1.25rem] px-1 rounded-full bg-amber-400 text-gray-900 text-[11px] font-bold leading-5 text-center">{n > 99 ? '99+' : n}</span>}
    </button>
  )
}
