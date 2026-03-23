'use client'

import { useState, useEffect, useCallback } from 'react'

interface AutoDepositSettings {
  accountId: string
  accountName: string
  accountNumber: string
  depositCap: number | null
  depositCapSetBy: { id: string; name: string } | null
  depositCapSetAt: string | null
  depositCapReachedAt: string | null
  isAutoDepositFrozen: boolean
  autoDepositFrozenBy: { id: string; name: string } | null
  autoDepositFrozenAt: string | null
  totalDeposited: number
  remainingTowardsCap: number | null
  capReached: boolean
}

interface Props {
  accountId: string
}

export function AutoDepositAdminPanel({ accountId }: Props) {
  const [settings, setSettings] = useState<AutoDepositSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Cap edit state
  const [capMode, setCapMode] = useState<'view' | 'edit'>('view')
  const [capInput, setCapInput] = useState('')
  const [capRemove, setCapRemove] = useState(false)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/expense-accounts/${accountId}/auto-deposit-settings`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSettings(data.data)
      } else {
        setError(data.error || 'Failed to load settings')
      }
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const startCapEdit = () => {
    setCapInput(settings?.depositCap != null ? String(settings.depositCap) : '')
    setCapRemove(settings?.depositCap == null)
    setCapMode('edit')
    setError(null)
    setSuccessMsg(null)
  }

  const handleSaveCap = async () => {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const body: Record<string, unknown> = {}
      if (capRemove) {
        body.depositCap = null
      } else {
        const num = parseFloat(capInput)
        if (isNaN(num) || num <= 0) {
          setError('Cap must be a positive number')
          setSaving(false)
          return
        }
        body.depositCap = num
      }

      const res = await fetch(`/api/expense-accounts/${accountId}/auto-deposit-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg('Cap updated')
        setCapMode('view')
        loadSettings()
      } else {
        setError(data.error || 'Failed to update cap')
      }
    } catch {
      setError('Failed to update cap')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFreeze = async (freeze: boolean) => {
    if (!confirm(freeze
      ? 'Freeze this account? All EOD auto-deposits to this account will be blocked until unfrozen. Manual deposits are unaffected.'
      : 'Unfreeze this account? EOD auto-deposits will resume for active configs.'
    )) return

    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(`/api/expense-accounts/${accountId}/auto-deposit-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isAutoDepositFrozen: freeze }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg(freeze ? '🔒 Account frozen for auto-deposits' : '🔓 Account unfrozen')
        loadSettings()
      } else {
        setError(data.error || 'Failed to update freeze state')
      }
    } catch {
      setError('Failed to update freeze state')
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleString() : '—'

  if (loading) {
    return (
      <div className="p-6 text-secondary text-sm text-center animate-pulse">
        Loading auto-deposit settings…
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-6 text-red-500 text-sm text-center">
        {error || 'Failed to load settings'}
      </div>
    )
  }

  const capPct =
    settings.depositCap != null && settings.depositCap > 0
      ? Math.min(100, (settings.totalDeposited / settings.depositCap) * 100)
      : null

  return (
    <div className="space-y-6">
      {/* Feedback messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
          ⚠ {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
          ✅ {successMsg}
        </div>
      )}

      {/* ── Deposit Cap ─────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary">Deposit Cap</h3>
            <p className="text-xs text-secondary mt-0.5">
              Maximum total amount that can be auto-deposited into this account (all-time, across all businesses)
            </p>
          </div>
          {capMode === 'view' && (
            <button
              onClick={startCapEdit}
              className="text-xs px-3 py-1.5 border border-border rounded hover:bg-hover text-secondary hover:text-primary"
            >
              ✏️ Edit
            </button>
          )}
        </div>

        {capMode === 'view' ? (
          <div className="space-y-3">
            {settings.depositCap != null ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">{fmt(settings.totalDeposited)}</span>
                  <span className="text-secondary text-sm">/ {fmt(settings.depositCap)} cap</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      settings.capReached
                        ? 'bg-amber-500'
                        : capPct != null && capPct >= 80
                        ? 'bg-yellow-500'
                        : 'bg-primary-500'
                    }`}
                    style={{ width: `${capPct ?? 0}%` }}
                  />
                </div>
                <div className="text-xs text-secondary flex justify-between">
                  <span>{capPct?.toFixed(1)}% used</span>
                  {settings.remainingTowardsCap != null && (
                    <span>{fmt(settings.remainingTowardsCap)} remaining</span>
                  )}
                </div>

                {settings.capReached && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
                    <span>⛔</span>
                    <div>
                      <div className="font-medium">Cap reached</div>
                      <div className="text-xs">
                        {settings.depositCapReachedAt
                          ? `On ${fmtDate(settings.depositCapReachedAt)}`
                          : 'Date not recorded'}
                        {' — '}configs targeting this account are paused and require manual reactivation on the{' '}
                        <a
                          href="/expense-accounts/auto-deposits"
                          className="underline hover:text-amber-600"
                        >
                          Auto-Deposits page
                        </a>
                        .
                      </div>
                    </div>
                  </div>
                )}

                {settings.depositCapSetBy && (
                  <div className="text-xs text-secondary">
                    Cap set by <strong>{settings.depositCapSetBy.name}</strong> on {fmtDate(settings.depositCapSetAt)}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-secondary text-sm">No cap — deposits are unlimited</span>
                <span className="text-xs text-secondary">Total deposited all-time: {fmt(settings.totalDeposited)}</span>
              </div>
            )}
          </div>
        ) : (
          /* Edit cap form */
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-sm text-primary cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={capRemove}
                  onChange={e => setCapRemove(e.target.checked)}
                />
                Remove cap (unlimited deposits)
              </label>
              {!capRemove && (
                <div>
                  <label className="block text-xs text-secondary mb-1">Cap amount ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.10"
                    placeholder="e.g. 10000.00"
                    className="w-48 bg-input border border-border rounded px-3 py-1.5 text-sm text-primary"
                    value={capInput}
                    onChange={e => setCapInput(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-secondary mt-1">
                    Current all-time deposits: {fmt(settings.totalDeposited)}
                    {' — '}setting cap below this will immediately mark the cap as reached.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveCap}
                disabled={saving}
                className="px-3 py-1.5 bg-primary-500 text-white rounded text-sm hover:bg-primary-600 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save cap'}
              </button>
              <button
                onClick={() => { setCapMode('view'); setError(null) }}
                className="px-3 py-1.5 border border-border rounded text-sm text-secondary hover:text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Freeze ──────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-primary">Auto-Deposit Freeze</h3>
          <p className="text-xs text-secondary mt-0.5">
            When frozen, all EOD auto-deposits targeting this account are blocked. Manual deposits continue to work normally.
          </p>
        </div>

        <div className={`flex items-start gap-4 p-3 rounded-lg border ${
          settings.isAutoDepositFrozen
            ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20'
            : 'border-border bg-gray-50 dark:bg-gray-700/20'
        }`}>
          <div className="flex-1">
            {settings.isAutoDepositFrozen ? (
              <div>
                <div className="flex items-center gap-2 font-medium text-red-700 dark:text-red-400 text-sm">
                  <span>🔒</span>
                  <span>Frozen — auto-deposits blocked</span>
                </div>
                {settings.autoDepositFrozenBy && (
                  <div className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                    Frozen by <strong>{settings.autoDepositFrozenBy.name}</strong> on {fmtDate(settings.autoDepositFrozenAt)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
                <span>✅</span>
                <span>Not frozen — auto-deposits allowed</span>
              </div>
            )}
          </div>
          <button
            onClick={() => handleToggleFreeze(!settings.isAutoDepositFrozen)}
            disabled={saving}
            className={`shrink-0 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50 ${
              settings.isAutoDepositFrozen
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 border border-green-300 dark:border-green-700'
                : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700'
            }`}
          >
            {settings.isAutoDepositFrozen ? '🔓 Unfreeze' : '🔒 Freeze'}
          </button>
        </div>
      </div>

      {/* ── Info note ────────────────────────────────────────────────────── */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
        <div className="font-medium">ℹ Notes</div>
        <ul className="list-disc list-inside space-y-0.5">
          <li>The cap applies to <strong>all</strong> auto-deposits across all businesses contributing to this account</li>
          <li>When a cap is reached, each contributing config is individually paused and must be manually reactivated from the <a href="/expense-accounts/auto-deposits" className="underline">Auto-Deposits page</a></li>
          <li>Raising or removing a cap clears the &quot;cap reached&quot; marker — but does not auto-reactivate paused configs</li>
          <li>Lowering a cap below the current total will immediately mark the cap as reached</li>
        </ul>
      </div>
    </div>
  )
}
