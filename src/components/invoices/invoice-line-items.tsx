'use client'

export interface LineItem {
  id: string           // client-side key only
  description: string
  quantity: string
  unitPrice: string
  discount: string     // percentage 0-100
}

interface Props {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  currencySymbol: string
  taxEnabled: boolean
  taxRate: number      // percentage e.g. 15
  discountAmount: string
  onDiscountChange: (v: string) => void
  readOnly?: boolean
}

function lineTotal(item: LineItem): number {
  const qty = parseFloat(item.quantity) || 0
  const price = parseFloat(item.unitPrice) || 0
  const disc = Math.min(100, Math.max(0, parseFloat(item.discount) || 0))
  return qty * price * (1 - disc / 100)
}

export function computeTotals(
  items: LineItem[],
  discountAmount: string,
  taxRate: number,
  taxEnabled: boolean
) {
  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0)
  const disc = parseFloat(discountAmount) || 0
  const taxBase = Math.max(0, subtotal - disc)
  const tax = taxEnabled ? taxBase * (taxRate / 100) : 0
  const total = taxBase + tax
  return { subtotal, disc, tax, total }
}

function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', quantity: '1', unitPrice: '', discount: '' }
}

export function InvoiceLineItems({
  items,
  onChange,
  currencySymbol,
  taxEnabled,
  taxRate,
  discountAmount,
  onDiscountChange,
  readOnly = false,
}: Props) {
  function addRow() {
    if (items.length >= 30) return
    onChange([...items, newItem()])
  }

  function removeRow(id: string) {
    onChange(items.filter((i) => i.id !== id))
  }

  function updateField(id: string, field: keyof LineItem, value: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }

  const { subtotal, disc, tax, total } = computeTotals(items, discountAmount, taxRate, taxEnabled)

  const fmt = (n: number) => `${currencySymbol}${n.toFixed(2)}`

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
            <tr>
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right w-20">Qty</th>
              <th className="px-3 py-2 text-right w-28">Unit Price</th>
              <th className="px-3 py-2 text-right w-20">Disc %</th>
              <th className="px-3 py-2 text-right w-28">Total</th>
              {!readOnly && <th className="px-2 py-2 w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item, idx) => (
              <tr key={item.id} className="bg-white dark:bg-gray-900">
                <td className="px-3 py-1.5 text-gray-400 text-xs">{idx + 1}</td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className="text-gray-900 dark:text-gray-100">{item.description}</span>
                  ) : (
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateField(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                      className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className="block text-right text-gray-900 dark:text-gray-100">{item.quantity}</span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateField(item.id, 'quantity', e.target.value)}
                      className="w-full px-2 py-1 text-sm text-right border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className="block text-right text-gray-900 dark:text-gray-100">
                      {item.unitPrice ? `${currencySymbol}${parseFloat(item.unitPrice).toFixed(2)}` : '—'}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateField(item.id, 'unitPrice', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-sm text-right border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className="block text-right text-gray-500">
                      {item.discount ? `${item.discount}%` : '—'}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={item.discount}
                      onChange={(e) => updateField(item.id, 'discount', e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-sm text-right border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">
                  {fmt(lineTotal(item))}
                </td>
                {!readOnly && (
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                      title="Remove line"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      {!readOnly && (
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={addRow}
            disabled={items.length >= 30}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline"
          >
            + Add line item
          </button>
          {items.length >= 30 && (
            <span className="text-xs text-amber-600">Maximum 30 items reached</span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{items.length}/30</span>
        </div>
      )}

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {!readOnly ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-600 dark:text-gray-400">Document discount</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-xs">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => onDiscountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-24 px-2 py-0.5 text-sm text-right border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : disc > 0 ? (
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Discount</span>
              <span>-{fmt(disc)}</span>
            </div>
          ) : null}
          {taxEnabled && (
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Tax ({taxRate}%)</span>
              <span>{fmt(tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export { newItem }
