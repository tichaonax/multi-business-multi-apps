'use client'

/**
 * MBM-319 — record a restaurant purchase (one payee, one or more items) as an
 * unpaid expense, on the day it happened, regardless of available funds.
 * Payment happens later through a combo payment request.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { PayeeSelector } from '@/components/expense-account/payee-selector'

interface CatalogueItem {
  id: string
  name: string
  useCount: number
  category: { name: string; emoji: string } | null
  subcategory: { name: string } | null
}
interface RankedPayee { type: string; id: string; name: string; useCount: number }
interface Line { key: string; item: { id?: string; name: string } | null; amount: string }

const newLine = (): Line => ({ key: crypto.randomUUID(), item: null, amount: '' })
const todayStr = () => new Date().toLocaleDateString('en-CA')

interface Props {
  businessId: string
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

export function RecordExpenseModal({ businessId, isOpen, onClose, onSaved }: Props) {
  const toast = useToastContext()
  const [date, setDate] = useState(todayStr)
  const [payee, setPayee] = useState<{ type: string; id: string; name: string } | null>(null)
  const [lines, setLines] = useState<Line[]>([newLine()])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset each time it opens.
  useEffect(() => {
    if (!isOpen) return
    setDate(todayStr())
    setPayee(null)
    setLines([newLine()])
    setNotes('')
    setError(null)
  }, [isOpen])

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.amount) > 0 ? Number(l.amount) : 0), 0), [lines])

  if (!isOpen) return null

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)))

  const save = async () => {
    setError(null)
    const filled = lines.filter(l => l.item || l.amount)
    if (filled.length === 0) return setError('Add at least one item')
    if (filled.some(l => !l.item)) return setError('Choose an item for every line')
    if (filled.some(l => !(Number(l.amount) > 0))) return setError('Every item needs an amount greater than 0')
    if (!date || date > todayStr()) return setError('Choose a purchase date that is not in the future')

    // Today → now; an earlier day → midday local time on that day.
    const purchasedAt = date === todayStr() ? new Date() : new Date(`${date}T12:00:00`)
    setSaving(true)
    try {
      const res = await fetch('/api/restaurant/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          purchasedAt: purchasedAt.toISOString(),
          payee: payee ? { type: payee.type, id: payee.id } : null,
          notes: notes.trim() || null,
          lines: filled.map(l => ({ itemId: l.item!.id, itemName: l.item!.name, amount: Number(l.amount) })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return setError(json.error || 'Failed to record expense')
      toast.push(`Expense recorded — ${json.data?.reference} ($${total.toFixed(2)}), awaiting payment`, { type: 'success' })
      onSaved?.()
      onClose()
    } catch {
      setError('Failed to record expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9998] p-4" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">🧾 Record Expense</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Saved as unpaid — it is paid later through a payment request. Funds are not needed now.</p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase date</span>
              <input
                type="date"
                value={date}
                max={todayStr()}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </label>
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payee <span className="font-normal text-gray-400">(optional)</span></span>
              <PayeePicker businessId={businessId} value={payee} onChange={setPayee} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Items</span>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={l.key} className="flex gap-2 items-start">
                  <div className="flex-1 min-w-0">
                    <ItemPicker businessId={businessId} value={l.item} onChange={item => updateLine(l.key, { item })} autoFocus={i === lines.length - 1 && i > 0} />
                  </div>
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={l.amount}
                      onChange={e => updateLine(l.key, { amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right"
                    />
                  </div>
                  <button
                    onClick={() => setLines(prev => (prev.length > 1 ? prev.filter(x => x.key !== l.key) : [newLine()]))}
                    title="Remove"
                    className="shrink-0 px-2 py-2 text-gray-400 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setLines(prev => [...prev, newLine()])} className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              + Add another item
            </button>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="font-normal text-gray-400">(optional)</span></span>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={300}
              placeholder="e.g. bought on credit, pay Friday"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Total <span className="text-lg font-bold text-gray-900 dark:text-white">${total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-semibold">
              {saving ? 'Saving…' : 'Save as unpaid'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Searchable item dropdown — most-purchased first, "+ Add" for new names. */
function ItemPicker({ businessId, value, onChange, autoFocus }: {
  businessId: string
  value: { id?: string; name: string } | null
  onChange: (item: { id?: string; name: string } | null) => void
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<CatalogueItem[]>([])
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value?.name ?? '') }, [value])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    const t = setTimeout(() => {
      fetch(`/api/restaurant/expenses/items?businessId=${encodeURIComponent(businessId)}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
        .then(r => (r.ok ? r.json() : { data: [] }))
        .then(j => setItems(j.data || []))
        .catch(() => setItems([]))
    }, 150)
    return () => clearTimeout(t)
  }, [businessId, query, open])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const q = query.trim()
  const exact = items.some(i => i.name.toLowerCase() === q.toLowerCase())

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        autoFocus={autoFocus}
        placeholder="Search items…"
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (value) onChange(null) }}
        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm ${value ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'}`}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {items.map(i => (
            <button
              key={i.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange({ id: i.id, name: i.name }); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center justify-between gap-2"
            >
              <span className="text-gray-900 dark:text-white truncate">{i.name}</span>
              <span className="text-xs text-gray-400 shrink-0">
                {i.category ? `${i.category.emoji} ${i.category.name}${i.subcategory ? ` › ${i.subcategory.name}` : ''}` : 'Unclassified'}
              </span>
            </button>
          ))}
          {q && !exact && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange({ name: q }); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
            >
              + Add “{q}” as a new item
            </button>
          )}
          {!q && items.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">Type to add the first item</p>}
        </div>
      )}
    </div>
  )
}

/** Searchable payee dropdown — this restaurant's previous payees, most-used
 * first, with the full payee search as a fallback for a first-time payee. */
export function PayeePicker({ businessId, value, onChange, placeholder = 'Not specified' }: {
  businessId: string
  value: { type: string; id: string; name: string } | null
  onChange: (p: { type: string; id: string; name: string } | null) => void
  placeholder?: string
}) {
  const [payees, setPayees] = useState<RankedPayee[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [searchAll, setSearchAll] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/restaurant/expenses/payees?businessId=${encodeURIComponent(businessId)}`)
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(j => setPayees(j.data || []))
      .catch(() => setPayees([]))
  }, [businessId])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (searchAll) {
    return (
      <div className="space-y-1">
        <PayeeSelector value={value} onChange={p => { onChange(p); if (p) setSearchAll(false) }} />
        <button type="button" onClick={() => setSearchAll(false)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">← Back to recent payees</button>
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const shown = payees.filter(p => !q || p.name.toLowerCase().includes(q)).slice(0, 50)

  return (
    <div ref={boxRef} className="relative">
      <input
        value={open ? query : value?.name ?? ''}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => setQuery(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(null); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-blue-50 dark:hover:bg-gray-700 italic">
            Not specified (decide when paying)
          </button>
          {shown.map(p => (
            <button key={`${p.type}:${p.id}`} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(p); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 flex justify-between gap-2">
              <span className="text-gray-900 dark:text-white truncate">{p.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{p.type.toLowerCase()}</span>
            </button>
          ))}
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setSearchAll(true); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700">
            🔍 Search all payees…
          </button>
        </div>
      )}
    </div>
  )
}
