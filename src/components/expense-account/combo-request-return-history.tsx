'use client'

// MBM-333: every time a cashier returned a combo request for changes. The
// latest one is the request; earlier ones show what was asked before.

export interface ReturnEntry {
  id: string
  note: string
  returnedAt: string
  resubmittedAt: string | null
  returnedByUser: { id: string; name: string } | null
}

const when = (d: string) => new Date(d).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function ReturnHistory({ returns }: { returns: ReturnEntry[] }) {
  if (returns.length === 0) return null
  const latest = returns[returns.length - 1]
  const earlier = returns.slice(0, -1).reverse()
  const open = !latest.resubmittedAt

  return (
    <div className={`rounded-lg border p-4 text-sm ${open
      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
      <p className={`font-medium ${open ? 'text-yellow-800 dark:text-yellow-300' : 'text-gray-700 dark:text-gray-300'}`}>
        {open ? '↩️ Returned for changes' : '↩️ Was returned for changes'}
        {returns.length > 1 && ` (${returns.length} times)`}
      </p>
      <p className={`mt-1 italic ${open ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-700 dark:text-gray-300'}`}>&ldquo;{latest.note}&rdquo;</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {latest.returnedByUser?.name ?? 'Cashier'} · {when(latest.returnedAt)}
        {latest.resubmittedAt ? ` · resubmitted ${when(latest.resubmittedAt)}` : ' · make the changes, then submit again'}
      </p>
      {earlier.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">Earlier returns ({earlier.length})</summary>
          <ul className="mt-2 space-y-2">
            {earlier.map(r => (
              <li key={r.id} className="text-xs text-gray-700 dark:text-gray-300">
                &ldquo;{r.note}&rdquo;
                <span className="text-gray-500 dark:text-gray-400"> — {r.returnedByUser?.name ?? 'Cashier'}, {when(r.returnedAt)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
