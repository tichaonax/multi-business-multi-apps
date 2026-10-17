'use client'

/**
 * MBM-319 — "Add recorded expenses" panel on the combo payment request form.
 * Lists the restaurant's recorded purchases still awaiting payment; the
 * requester ticks lines to add them as locked items (one section per payee).
 * A purchase with no payee, or an unclassified line, is resolved here once —
 * saved back to the purchase / item so it isn't asked again.
 * Renders nothing for accounts that don't belong to a restaurant.
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { ItemCategorySelector, Domain } from '@/components/expense-account/combo-request-item-row'
import { PayeePicker } from './record-expense-modal'

type Payee = { type: string; id: string; name: string }
interface Line {
  id: string
  description: string
  outstanding: number
  categoryId: string | null
  subcategoryId: string | null
  category: { name: string; emoji: string } | null
  subcategory: { name: string } | null
}
interface Txn {
  id: string
  reference: string
  purchasedAt: string
  payee: Payee | null
  lines: Line[]
}

export interface RecordedLineSelection {
  lineId: string
  description: string
  amount: number
  categoryId: string
  subcategoryId: string | null
  lockedInfo: string
}

const money = (n: number) => `$${n.toFixed(2)}`
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })

export function RecordedExpensesPanel({ accountId, domains, usedLineIds, onAdd }: {
  accountId: string
  domains: Domain[]
  usedLineIds: Set<string>
  onAdd: (groups: { payee: Payee; lines: RecordedLineSelection[] }[]) => void
}) {
  const toast = useToastContext()
  const [txns, setTxns] = useState<Txn[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [payeeFor, setPayeeFor] = useState<Record<string, Payee | null>>({})
  const [classFor, setClassFor] = useState<Record<string, { categoryId: string; subcategoryId: string }>>({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/restaurant/expenses?accountId=${encodeURIComponent(accountId)}&status=unpaid`, { credentials: 'include' })
      const list = res.ok ? await res.json() : null
      if (!list?.restaurant) return
      setTxns(list.data || [])
      setBusinessId(list.businessId)
    } catch {
      // panel is optional — the rest of the form still works
    }
  }, [accountId])

  useEffect(() => { load() }, [load])

  // Lines not already on the form
  const available = useMemo(
    () => txns.map(t => ({ ...t, lines: t.lines.filter(l => !usedLineIds.has(l.id)) })).filter(t => t.lines.length > 0),
    [txns, usedLineIds],
  )
  const totalOwed = available.reduce((s, t) => s + t.lines.reduce((x, l) => x + l.outstanding, 0), 0)
  const lineCount = available.reduce((s, t) => s + t.lines.length, 0)

  if (lineCount === 0) return null

  const toggle = (ids: string[], on: boolean) =>
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => (on ? next.add(id) : next.delete(id)))
      return next
    })

  const selectedTxns = available
    .map(t => ({ ...t, lines: t.lines.filter(l => selected.has(l.id)) }))
    .filter(t => t.lines.length > 0)
  const selectedTotal = selectedTxns.reduce((s, t) => s + t.lines.reduce((x, l) => x + l.outstanding, 0), 0)

  async function patchTxn(id: string, body: unknown) {
    const res = await fetch(`/api/restaurant/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Failed to update the recorded expense')
  }

  async function handleAdd() {
    for (const t of selectedTxns) {
      if (!t.payee && !payeeFor[t.id]) { toast.error(`Choose a payee for ${t.reference}`); return }
      for (const l of t.lines) {
        if (!l.categoryId && !classFor[l.id]?.categoryId) { toast.error(`Choose a category for "${l.description}"`); return }
      }
    }
    setBusy(true)
    try {
      // Save the answers back so they're asked only once
      for (const t of selectedTxns) {
        if (!t.payee) await patchTxn(t.id, { payee: { type: payeeFor[t.id]!.type, id: payeeFor[t.id]!.id } })
        const classify = t.lines.filter(l => !l.categoryId).map(l => ({ lineId: l.id, ...classFor[l.id] }))
        if (classify.length) await patchTxn(t.id, { classify })
      }

      const groups = new Map<string, { payee: Payee; lines: RecordedLineSelection[] }>()
      for (const t of selectedTxns) {
        const payee = t.payee ?? payeeFor[t.id]!
        const key = `${payee.type}:${payee.id}`
        if (!groups.has(key)) groups.set(key, { payee, lines: [] })
        for (const l of t.lines) {
          groups.get(key)!.lines.push({
            lineId: l.id,
            description: l.description,
            amount: l.outstanding,
            categoryId: l.categoryId ?? classFor[l.id].categoryId,
            subcategoryId: l.categoryId ? l.subcategoryId : (classFor[l.id].subcategoryId || null),
            lockedInfo: `${t.reference} · ${dayLabel(t.purchasedAt)}`,
          })
        }
      }
      onAdd(Array.from(groups.values()))
      setSelected(new Set())
      setOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add recorded expenses')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-rose-200 dark:border-rose-800 rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-left">
        <span className="text-sm font-semibold text-rose-800 dark:text-rose-300">
          {open ? '▾' : '▸'} 🧾 Add recorded expenses
        </span>
        <span className="text-xs text-rose-700 dark:text-rose-400">{lineCount} unpaid · {money(totalOwed)}</span>
      </button>

      {open && (
        <div className="p-3 space-y-3">
          <div className="max-h-[28rem] overflow-y-auto space-y-3">
            {available.map(t => {
              const ids = t.lines.map(l => l.id)
              const allOn = ids.every(id => selected.has(id))
              const anyOn = ids.some(id => selected.has(id))
              return (
                <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 cursor-pointer">
                    <input type="checkbox" checked={allOn} onChange={e => toggle(ids, e.target.checked)} />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.payee?.name ?? <span className="italic text-amber-700 dark:text-amber-400">No payee yet</span>}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">{t.reference} · {dayLabel(t.purchasedAt)}</span>
                  </label>
                  {!t.payee && anyOn && (
                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Who is being paid? (saved to this purchase)</div>
                      {businessId ? (
                        <PayeePicker businessId={businessId} value={payeeFor[t.id] ?? null} placeholder="Choose payee…"
                          onChange={p => setPayeeFor(prev => ({ ...prev, [t.id]: p }))} />
                      ) : <div className="text-xs text-red-600">Could not load payees</div>}
                    </div>
                  )}
                  {t.lines.map(l => (
                    <Fragment key={l.id}>
                      <label className="flex items-center gap-2 px-3 py-1.5 border-t border-gray-100 dark:border-gray-700 cursor-pointer">
                        <input type="checkbox" checked={selected.has(l.id)} onChange={e => toggle([l.id], e.target.checked)} />
                        <span className="flex-1 min-w-0">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{l.description}</span>
                          <span className="block text-xs text-gray-400">
                            {l.category ? `${l.category.emoji} ${l.category.name}${l.subcategory ? ` › ${l.subcategory.name}` : ''}` : 'Unclassified'}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{money(l.outstanding)}</span>
                      </label>
                      {!l.categoryId && selected.has(l.id) && (
                        <div className="px-3 pb-2 pl-8">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category (saved to the item for next time)</div>
                          <ItemCategorySelector
                            domains={domains}
                            categoryId={classFor[l.id]?.categoryId ?? ''}
                            subcategoryId={classFor[l.id]?.subcategoryId ?? ''}
                            description={l.description}
                            onChange={(categoryId, subcategoryId) => setClassFor(prev => ({ ...prev, [l.id]: { categoryId, subcategoryId } }))}
                          />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Unselected expenses stay unpaid for a later request.</span>
            <button type="button" onClick={handleAdd} disabled={busy || selected.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50">
              {busy ? 'Adding…' : `Add ${selected.size} selected (${money(selectedTotal)})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
