'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

interface ExpenseAccountOption {
  id: string
  accountNumber: string
  accountName: string
  balance: number
  isActive: boolean
  businessId: string | null
  businessName: string | null
  depositCap: number | null
  depositCapReachedAt: string | null
  isAutoDepositFrozen: boolean
}

interface AutoDepositConfig {
  id: string
  businessId: string
  expenseAccountId: string
  dailyAmount: number
  displayOrder: number
  isActive: boolean
  isPausedByCap: boolean
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  expenseAccount: ExpenseAccountOption & {
    business: { name: string } | null
  }
  creator: { id: string; name: string }
}

const EMPTY_FORM = { expenseAccountId: '', dailyAmount: '', notes: '', startDate: '', endDate: '' }

export default function AutoDepositsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const { hasPermission, loading: permissionsLoading, currentBusiness } = useBusinessPermissionsContext()

  const businessId = currentBusiness?.businessId ?? null
  const isAdmin = (session?.user as any)?.role === 'admin'
  const canManage = isAdmin || hasPermission('canManageAutoDeposits')
  const canAccess = isAdmin || hasPermission('canAccessExpenseAccount')

  const [configs, setConfigs] = useState<AutoDepositConfig[]>([])
  const [accounts, setAccounts] = useState<ExpenseAccountOption[]>([])
  const [businessBalance, setBusinessBalance] = useState<number | null>(null)
  const [totalDailyCommitment, setTotalDailyCommitment] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_FORM)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ dailyAmount: '', notes: '', isActive: true, startDate: '', endDate: '' })
  const [saving, setSaving] = useState(false)

  // Redirect if no access
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])
  useEffect(() => {
    if (!permissionsLoading && !canAccess && !canManage) router.push('/expense-accounts')
  }, [permissionsLoading, canAccess, canManage, router])

  const loadConfigs = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/auto-deposits/${businessId}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setConfigs(data.data?.configs ?? [])
        setBusinessBalance(data.data?.businessBalance ?? null)
        setTotalDailyCommitment(data.data?.totalDailyCommitment ?? 0)
      } else {
        toast.error(data.error || 'Failed to load auto-deposit configs')
      }
    } catch { toast.error('Failed to load auto-deposit configs') }
    finally { setLoading(false) }
  }, [businessId, toast])

  const loadAccounts = useCallback(async () => {
    try {
      // Fetch all accounts system-wide — target account can belong to any business
      const res = await fetch('/api/expense-account?allForSetup=true', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setAccounts((data.data?.accounts ?? []).filter((a: ExpenseAccountOption) => a.isActive))
      }
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    if (businessId) {
      loadConfigs()
    }
    loadAccounts()
  }, [businessId, loadConfigs, loadAccounts])

  // Accounts not yet assigned to a config
  const availableAccounts = accounts.filter(
    a => !configs.some(c => c.expenseAccountId === a.id)
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !createForm.expenseAccountId || !createForm.dailyAmount) return
    const amount = parseFloat(createForm.dailyAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Daily amount must be a positive number'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/auto-deposits/${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          expenseAccountId: createForm.expenseAccountId,
          dailyAmount: amount,
          notes: createForm.notes.trim() || null,
          startDate: createForm.startDate || null,
          endDate: createForm.endDate || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.push('✅ Auto-deposit config created')
        setCreateForm(EMPTY_FORM)
        setShowCreate(false)
        loadConfigs()
        loadAccounts()
      } else {
        toast.error(data.error || 'Failed to create config')
      }
    } catch { toast.error('Failed to create config') }
    finally { setSubmitting(false) }
  }

  const startEdit = (config: AutoDepositConfig) => {
    setEditingId(config.id)
    setEditForm({
      dailyAmount: String(config.dailyAmount),
      notes: config.notes ?? '',
      isActive: config.isActive,
      startDate: config.startDate ? config.startDate.slice(0, 10) : '',
      endDate: config.endDate ? config.endDate.slice(0, 10) : '',
    })
  }

  const handleSaveEdit = async (configId: string) => {
    if (!businessId) return
    const amount = parseFloat(editForm.dailyAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Daily amount must be positive'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/auto-deposits/${businessId}/${configId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dailyAmount: amount,
          notes: editForm.notes.trim() || null,
          isActive: editForm.isActive,
          startDate: editForm.startDate || null,
          endDate: editForm.endDate || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.push('✅ Config updated')
        setEditingId(null)
        loadConfigs()
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch { toast.error('Failed to update config') }
    finally { setSaving(false) }
  }

  const handleToggleActive = async (config: AutoDepositConfig) => {
    if (!businessId) return
    try {
      const res = await fetch(`/api/auto-deposits/${businessId}/${config.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !config.isActive }),
      })
      if (res.ok) {
        toast.push(config.isActive ? '⏸ Config paused' : '▶️ Config activated')
        loadConfigs()
      }
    } catch { toast.error('Failed to toggle config') }
  }

  const handleDelete = async (config: AutoDepositConfig) => {
    if (!businessId) return
    if (!confirm(`Delete auto-deposit for "${config.expenseAccount.accountName}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/auto-deposits/${businessId}/${config.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        toast.push('🗑 Config deleted')
        loadConfigs()
        loadAccounts()
      }
    } catch { toast.error('Failed to delete config') }
  }

  const handleReactivate = async (config: AutoDepositConfig) => {
    if (!businessId) return
    if (!confirm(`Reactivate auto-deposit for "${config.expenseAccount.accountName}"? This will resume deposits (cap may be higher or removed).`)) return
    try {
      const res = await fetch(`/api/auto-deposits/${businessId}/${config.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPausedByCap: false }),
      })
      if (res.ok) {
        toast.push('✅ Config reactivated')
        loadConfigs()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to reactivate')
      }
    } catch { toast.error('Failed to reactivate config') }
  }

  if (status === 'loading' || permissionsLoading) {
    return (
      <ContentLayout title="EOD Auto-Deposits">
        <div className="flex items-center justify-center h-64 text-secondary">Loading…</div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="EOD Auto-Deposits"
      subtitle="Automatically deposit a fixed daily amount into expense accounts every time you close the day"
    >
      <div className="space-y-6 max-w-3xl">

        {/* Summary bar */}
        <div className="bg-surface border border-border rounded-lg p-4 flex flex-wrap gap-6 text-sm">
          <div>
            <div className="text-secondary mb-0.5">Active configs</div>
            <div className="font-semibold text-primary">{configs.filter(c => c.isActive).length} / {configs.length}</div>
          </div>
          <div>
            <div className="text-secondary mb-0.5">Daily commitment</div>
            <div className="font-semibold text-primary">${totalDailyCommitment.toFixed(2)}</div>
          </div>
          {businessBalance !== null && (
            <div>
              <div className="text-secondary mb-0.5">Business cash balance</div>
              <div className={`font-semibold ${businessBalance < totalDailyCommitment ? 'text-red-500' : 'text-green-500'}`}>
                ${businessBalance.toFixed(2)}
                {businessBalance < totalDailyCommitment && (
                  <span className="ml-1.5 text-xs text-red-400">(⚠ below daily commitment)</span>
                )}
              </div>
            </div>
          )}
          {configs.some(c => c.isPausedByCap) && (
            <div>
              <div className="text-secondary mb-0.5">Cap-paused</div>
              <div className="font-semibold text-amber-600 dark:text-amber-400">
                {configs.filter(c => c.isPausedByCap).length} config{configs.filter(c => c.isPausedByCap).length !== 1 ? 's' : ''}
                <span className="ml-1 text-xs font-normal">⚠ needs reactivation</span>
              </div>
            </div>
          )}
          {configs.some(c => c.expenseAccount.isAutoDepositFrozen) && (
            <div>
              <div className="text-secondary mb-0.5">Frozen accounts</div>
              <div className="font-semibold text-red-600 dark:text-red-400">
                {configs.filter(c => c.expenseAccount.isAutoDepositFrozen).length} account{configs.filter(c => c.expenseAccount.isAutoDepositFrozen).length !== 1 ? 's' : ''}
                <span className="ml-1 text-xs font-normal">🔒 blocked by admin</span>
              </div>
            </div>
          )}
        </div>

        {/* Configs list */}
        {loading ? (
          <div className="text-secondary text-sm">Loading configs…</div>
        ) : configs.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-8 text-center text-secondary">
            <div className="text-3xl mb-3">⚡</div>
            <div className="font-medium mb-1">No auto-deposit configs yet</div>
            <div className="text-sm">Each active config will automatically deposit its daily amount when you close the day.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map(config => (
              <div
                key={config.id}
                className={`bg-surface border rounded-lg p-4 ${config.isActive ? 'border-border' : 'border-border/50 opacity-60'}`}
              >
                {editingId === config.id ? (
                  /* ─── Edit form ─── */
                  <div className="space-y-3">
                    <div className="font-medium text-primary">{config.expenseAccount.accountName}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-secondary mb-1">Daily amount ($)</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="w-full bg-input border border-border rounded px-3 py-1.5 text-sm text-primary"
                          value={editForm.dailyAmount}
                          onChange={e => setEditForm(f => ({ ...f, dailyAmount: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 text-sm text-primary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                          />
                          Active
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-secondary mb-1">Start date (optional)</label>
                        <input
                          type="date"
                          className="w-full bg-input border border-border rounded px-3 py-1.5 text-sm text-primary"
                          value={editForm.startDate}
                          onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-secondary mb-1">End date (optional)</label>
                        <input
                          type="date"
                          className="w-full bg-input border border-border rounded px-3 py-1.5 text-sm text-primary"
                          value={editForm.endDate}
                          onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Notes (optional)</label>
                      <input
                        type="text"
                        className="w-full bg-input border border-border rounded px-3 py-1.5 text-sm text-primary"
                        value={editForm.notes}
                        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="e.g. Utilities savings"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(config.id)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-primary-500 text-white rounded text-sm hover:bg-primary-600 disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 border border-border rounded text-sm text-secondary hover:text-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ─── Display row ─── */
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {config.isPausedByCap ? (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            ⛔ Cap reached
                          </span>
                        ) : (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${config.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                            {config.isActive ? '⚡ Active' : '⏸ Paused'}
                          </span>
                        )}
                        {config.expenseAccount.isAutoDepositFrozen && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" title="Admin has frozen this account for auto-deposits">
                            🔒 Frozen
                          </span>
                        )}
                        <span className="font-medium text-primary truncate">{config.expenseAccount.accountName}</span>
                        <span className="text-xs text-secondary">{config.expenseAccount.accountNumber}</span>
                        {config.expenseAccount.business?.name && config.expenseAccount.businessId !== businessId && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" title="Account belongs to a different business">
                            🏢 {config.expenseAccount.business.name}
                          </span>
                        )}
                      </div>
                      {config.notes && (
                        <div className="text-xs text-secondary mt-0.5">{config.notes}</div>
                      )}
                      {/* Schedule dates */}
                      {(config.startDate || config.endDate) && (
                        <div className="text-xs text-secondary mt-0.5 flex gap-2">
                          {config.startDate && <span>📅 From: {config.startDate.slice(0, 10)}</span>}
                          {config.endDate && <span>📅 Until: {config.endDate.slice(0, 10)}</span>}
                        </div>
                      )}
                      {/* Cap progress */}
                      {config.expenseAccount.depositCap != null && (
                        <div className="mt-1">
                          <div className="text-xs text-secondary mb-0.5">
                            Deposit cap: ${Number(config.expenseAccount.depositCap).toFixed(2)}
                            {config.expenseAccount.depositCapReachedAt && (
                              <span className="ml-1 text-amber-600 dark:text-amber-400">
                                — reached {new Date(config.expenseAccount.depositCapReachedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Reactivation button for cap-paused configs */}
                      {config.isPausedByCap && canManage && (
                        <button
                          onClick={() => handleReactivate(config)}
                          className="mt-1.5 text-xs px-2 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 rounded border border-amber-300 dark:border-amber-700 font-medium"
                        >
                          ↺ Reactivate
                        </button>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-primary">${Number(config.dailyAmount).toFixed(2)}<span className="text-xs text-secondary font-normal">/day</span></div>
                      <div className="text-xs text-secondary">Acc. balance: ${Number(config.expenseAccount.balance).toFixed(2)}</div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(config)}
                          title="Edit"
                          className="p-1.5 rounded hover:bg-hover text-secondary hover:text-primary"
                        >✏️</button>
                        <button
                          onClick={() => handleToggleActive(config)}
                          title={config.isActive ? 'Pause' : 'Activate'}
                          className="p-1.5 rounded hover:bg-hover text-secondary hover:text-primary"
                        >{config.isActive ? '⏸' : '▶️'}</button>
                        <button
                          onClick={() => handleDelete(config)}
                          title="Delete"
                          className="p-1.5 rounded hover:bg-hover text-red-400 hover:text-red-600"
                        >🗑</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new config */}
        {canManage && (
          <div>
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                disabled={configs.length >= 10 || availableAccounts.length === 0}
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-sm text-secondary hover:text-primary hover:border-primary-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>➕</span>
                {configs.length >= 10
                  ? 'Maximum 10 configs reached'
                  : availableAccounts.length === 0
                  ? 'All active accounts already configured'
                  : 'Add auto-deposit config'}
              </button>
            ) : (
              <form onSubmit={handleCreate} className="bg-surface border border-border rounded-lg p-4 space-y-3">
                <div className="font-medium text-primary text-sm">New auto-deposit config</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-secondary mb-1">Expense account *</label>
                    <select
                      required
                      className="w-full bg-input border border-border rounded px-3 py-1.5 text-sm text-primary"
                      value={createForm.expenseAccountId}
                      onChange={e => setCreateForm(f => ({ ...f, expenseAccountId: e.target.value }))}
                    >
                      <option value="">Select account…</option>
                      {availableAccounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.accountName} ({a.accountNumber}){a.businessName && a.businessId !== businessId ? ` — ${a.businessName}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-secondary mb-1">Daily amount ($) *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 50.00"
                      className="w-full bg-input border border-border rounded px-3 py-1.5 text-sm text-primary"
                      value={createForm.dailyAmount}
                      onChange={e => setCreateForm(f => ({ ...f, dailyAmount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-secondary mb-1">Start date (optional)</label>
                    <input
                      type="date"
                      className="w-full bg-input border border-border rounded px-3 py-1.5 text-sm text-primary"
                      value={createForm.startDate}
                      onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-secondary mb-1">End date (optional)</label>
                    <input
                      type="date"
                      className="w-full bg-input border border-border rounded px-3 py-1.5 text-sm text-primary"
                      value={createForm.endDate}
                      onChange={e => setCreateForm(f => ({ ...f, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly electricity savings"
                    className="w-full bg-input border border-border rounded px-3 py-1.5 text-sm text-primary"
                    value={createForm.notes}
                    onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 bg-primary-500 text-white rounded text-sm hover:bg-primary-600 disabled:opacity-50"
                  >
                    {submitting ? 'Creating…' : 'Create config'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM) }}
                    className="px-4 py-1.5 border border-border rounded text-sm text-secondary hover:text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Info box */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <div className="font-medium">ℹ How EOD auto-deposits work</div>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-400">
            <li>Each active config deposits its daily amount when you close the day</li>
            <li>Funds are debited from this business&apos;s cash balance and credited to the target expense account</li>
            <li>Target accounts can belong to <strong>any business</strong> — useful for umbrella company accounts</li>
            <li>Deposits run automatically — EOD closers without access to the target account cannot skip them</li>
            <li>Configs are processed in order — if balance runs out, remaining configs are skipped</li>
            <li>Safe to close the day again — already-processed configs are skipped automatically</li>
            <li><strong>Schedule</strong>: set optional start/end dates to limit when deposits run</li>
            <li><strong>Deposit cap</strong>: admin can set a total cap on an account — deposits stop when reached; requires manual reactivation</li>
            <li><strong>Freeze</strong>: admin can freeze an account to block all auto-deposits (manual deposits still work)</li>
          </ul>
        </div>

      </div>
    </ContentLayout>
  )
}
