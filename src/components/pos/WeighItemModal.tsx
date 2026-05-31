'use client'

import { useEffect, useState } from 'react'
import { useScale } from '@/contexts/ScaleContext'

interface Props {
  itemName: string
  pricePerKg: number
  onConfirm: (weightKg: number, totalPrice: number) => void
  onCancel: () => void
}

export function WeighItemModal({ itemName, pricePerKg, onConfirm, onCancel }: Props) {
  const { weight, status, tare } = useScale()
  const [lockedWeight, setLockedWeight] = useState<number | null>(null)

  // Lock the current stable weight so user can review before confirming
  const displayWeight = lockedWeight ?? (weight?.stable && !weight.overload ? weight.weight : null)
  const totalPrice = displayWeight != null ? displayWeight * pricePerKg : null

  // Auto-lock when a stable reading arrives if nothing is locked yet
  useEffect(() => {
    if (lockedWeight == null && weight?.stable && !weight.overload && weight.weight > 0) {
      setLockedWeight(weight.weight)
    }
  }, [weight, lockedWeight])

  function handleUnlock() {
    setLockedWeight(null)
  }

  function handleConfirm() {
    if (displayWeight == null || displayWeight <= 0 || totalPrice == null) return
    onConfirm(displayWeight, totalPrice)
  }

  const connected = status.status === 'connected'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Weigh Item</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{itemName}</p>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Scale status */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {connected ? `Scale connected — ${status.comPort}` : 'Scale not connected'}
            </span>
          </div>

          {/* Live weight display */}
          <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-center">
            {!connected ? (
              <p className="text-sm text-red-500">No scale connected. Go to POS Settings to configure.</p>
            ) : weight?.overload ? (
              <p className="text-2xl font-mono font-bold text-red-500">OVERLOAD</p>
            ) : (
              <>
                <div className="text-4xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {lockedWeight != null
                    ? `${lockedWeight.toFixed(3)} kg`
                    : weight
                    ? `${weight.weight.toFixed(3)} kg`
                    : '— kg'}
                </div>
                <div className={`mt-1 text-xs font-medium ${
                  lockedWeight != null
                    ? 'text-blue-600 dark:text-blue-400'
                    : weight?.stable
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-amber-500'
                }`}>
                  {lockedWeight != null ? 'LOCKED' : weight?.stable ? 'STABLE' : 'UNSTABLE'}
                </div>
              </>
            )}
          </div>

          {/* Price calculation */}
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Weight</div>
              <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                {displayWeight != null ? `${displayWeight.toFixed(3)} kg` : '—'}
              </div>
            </div>
            <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">$/kg</div>
              <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                {pricePerKg.toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 px-3 py-2">
              <div className="text-xs text-blue-600 dark:text-blue-400">Total</div>
              <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
                {totalPrice != null ? totalPrice.toFixed(2) : '—'}
              </div>
            </div>
          </div>

          {/* Tare + unlock */}
          <div className="flex gap-2">
            <button
              onClick={tare}
              disabled={!connected}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
            >
              Tare
            </button>
            {lockedWeight != null && (
              <button
                onClick={handleUnlock}
                className="flex-1 px-3 py-2 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200"
              >
                Re-weigh
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={displayWeight == null || displayWeight <= 0}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
