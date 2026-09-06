'use client'

import { R710SalesPanel } from '@/components/r710/r710-sales-panel'
import { useR710QuickSell } from '@/contexts/r710-quick-sell-context'

/**
 * The R710 "quick sell" workflow as a modal overlay, triggerable from any
 * page (see the sidebar's button next to "Current Business"). Rendered as
 * a plain overlay rather than a route navigation, so whatever page and
 * state the user had open underneath is never touched — closing this just
 * removes the overlay.
 */
export function R710QuickSellModal() {
  const { isOpen, close } = useR710QuickSell()
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={close}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              📶 R710 WiFi Quick Sell
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sell a token without leaving this page</p>
          </div>
          <button
            onClick={close}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none px-2"
            title="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-5">
          <R710SalesPanel embedded onClose={close} />
        </div>
      </div>
    </div>
  )
}
