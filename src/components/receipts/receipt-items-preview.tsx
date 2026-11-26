'use client'

/**
 * MBM-338 — Receipt History: what was sold, at a glance.
 *
 * - <ReceiptItemsCell>: the "Items" column — the main item (WiFi first, with
 *   its code in a pill) and "+ N more".
 * - <ReceiptHoverCard>: the popup shown while hovering a row — every item,
 *   the total, payment, salesperson, and WiFi codes with Copy buttons.
 */
import type { ReactNode } from 'react'
import { WifiCodeCopy, WifiCodePill, CopyButton } from '@/components/wifi/wifi-code'

export interface ReceiptPreviewItem {
  name: string
  quantity: number
  totalPrice: number
  isWifi?: boolean
  wifiCodes?: string[]
  wifiCodesMatched?: boolean
  notIssued?: boolean
  notChargedAmount?: number
  /** MBM-345: thumbnail where the product / inventory item has an image */
  imageUrl?: string | null
}

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`
const cleanName = (name: string) => name.replace(/^📶\s*/, '')

/** MBM-345: a small item thumbnail (nothing when the item has no image) */
export function ItemThumb({ url, size = 'w-6 h-6' }: { url?: string | null; size?: string }) {
  if (!url) return null
  return <img src={url} alt="" loading="lazy" className={`${size} rounded object-cover shrink-0 border border-gray-200 dark:border-gray-600`} />
}

export function ReceiptItemsCell({ items }: { items?: ReceiptPreviewItem[] }) {
  if (!items || items.length === 0) return <span className="text-gray-400">—</span>
  // WiFi lines first so the code is visible without hovering
  const wifi = items.find(i => i.isWifi && !i.notIssued)
  const main = wifi ?? items[0]
  const rest = items.length - 1
  const codes = main.wifiCodes ?? []
  return (
    <div className="flex items-center gap-1.5 min-w-0 max-w-[16rem]">
      <ItemThumb url={main.imageUrl} />
      <span className="truncate">
        {main.isWifi && '📶 '}{cleanName(main.name)}{main.quantity > 1 ? ` ×${main.quantity}` : ''}
      </span>
      {codes.slice(0, 1).map(c => <WifiCodePill key={c} code={c} />)}
      {codes.length > 1 && <span className="text-xs text-blue-600 dark:text-blue-400">+{codes.length - 1} code{codes.length > 2 ? 's' : ''}</span>}
      {items.some(i => i.notIssued) && <span className="text-xs text-red-600 dark:text-red-400" title="A WiFi pass could not be issued and was not charged">⚠️</span>}
      {rest > 0 && <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">+ {rest} more</span>}
    </div>
  )
}

export function ReceiptHoverCard({
  orderNumber, items, total, payment, salesperson, salespersonExtra, date, directWifiSale,
}: {
  orderNumber: string
  items?: ReceiptPreviewItem[]
  total: number
  payment: string
  salesperson: string | null
  salespersonExtra?: ReactNode
  date: string
  directWifiSale?: boolean
}) {
  const allCodes = (items ?? []).flatMap(i => (i.isWifi && !i.notIssued ? (i.wifiCodes ?? []) : []))
  return (
    <div className="w-80 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-2xl p-3 space-y-3 text-sm text-gray-700 dark:text-gray-200">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-gray-900 dark:text-white">{orderNumber}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{date}</span>
      </div>
      {directWifiSale && <p className="text-xs text-blue-700 dark:text-blue-300">📶 WiFi direct sale</p>}

      {/* WiFi codes — stand out, copyable */}
      {allCodes.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">WiFi code{allCodes.length > 1 ? 's' : ''}</span>
            {allCodes.length > 1 && <CopyButton text={allCodes.join('\n')} label="📋 Copy all" />}
          </div>
          {(items ?? []).filter(i => i.isWifi && !i.notIssued).flatMap(i => (i.wifiCodes ?? []).map((c, k) => (
            <div key={`${i.name}-${c}-${k}`}>
              <WifiCodeCopy code={c} packageName={cleanName(i.name)} />
              {i.wifiCodesMatched && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">matched from the WiFi sales at this time</p>}
            </div>
          )))}
        </div>
      )}

      {/* Items */}
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {(items ?? []).map((i, k) => (
          <li key={k} className="py-1 flex items-start justify-between gap-2">
            <ItemThumb url={i.imageUrl} size="w-8 h-8" />
            <span className={`flex-1 min-w-0 ${i.notIssued ? 'text-red-600 dark:text-red-400' : ''}`}>
              {i.quantity} × {i.isWifi && '📶 '}{cleanName(i.name)}
              {i.notIssued && <span className="block text-xs">WiFi not issued — {money(i.notChargedAmount ?? 0)} not charged</span>}
              {i.isWifi && !i.notIssued && (i.wifiCodes?.length ?? 0) === 0 && <span className="block text-xs text-gray-400">code not recorded</span>}
            </span>
            <span className="shrink-0 tabular-nums">{money(i.totalPrice)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-2">
        <span>Total · {payment}</span>
        <span className="tabular-nums">{money(total)}</span>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5 flex-wrap">
        <span>Salesperson: <span className="font-medium">{salesperson || '—'}</span></span>
        {salespersonExtra}
      </div>
    </div>
  )
}
