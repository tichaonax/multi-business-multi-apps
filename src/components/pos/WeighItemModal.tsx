'use client'

import { useScale } from '@/contexts/ScaleContext'

interface Props {
  itemName: string
  pricePerKg: number
  onConfirm: (weightKg: number, totalPrice: number) => void
  onCancel: () => void
}

export function WeighItemModal({ itemName, pricePerKg, onConfirm, onCancel }: Props) {
  const { weight, status, tare } = useScale()

  const connected = status.status === 'connected'
  const isStable = !!weight?.stable && !weight.overload && weight.weight > 0
  const liveWeight = weight?.weight ?? 0
  const totalPrice = isStable ? liveWeight * pricePerKg : null

  function handleConfirm() {
    if (!isStable || liveWeight <= 0 || totalPrice == null) return
    onConfirm(liveWeight, totalPrice)
  }

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

          {/* Live weight display — always shows current reading, never locks */}
          <div className={`rounded-xl border-2 p-4 text-center transition-colors ${
            !connected ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' :
            weight?.overload ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' :
            isStable ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' :
            'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
          }`}>
            {!connected ? (
              <p className="text-sm text-red-500">No scale connected. Go to POS Settings to configure.</p>
            ) : weight?.overload ? (
              <p className="text-2xl font-mono font-bold text-red-500">OVERLOAD</p>
            ) : (
              <>
                <div className="text-4xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {liveWeight.toFixed(3)} kg
                </div>
                <div className={`mt-1 text-xs font-semibold tracking-wide ${
                  isStable ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'
                }`}>
                  {isStable ? '● STABLE — LIVE' : '○ READING…'}
                </div>
              </>
            )}
          </div>

          {/* Price calculation */}
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Weight</div>
              <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                {isStable ? `${liveWeight.toFixed(3)} kg` : '—'}
              </div>
            </div>
            <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">$/kg</div>
              <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                {pricePerKg.toFixed(2)}
              </div>
            </div>
            <div className={`rounded-lg px-3 py-2 ${isStable ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <div className={`text-xs ${isStable ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Total</div>
              <div className={`font-mono font-bold ${isStable ? 'text-blue-700 dark:text-blue-300' : 'text-gray-400'}`}>
                {totalPrice != null ? `$${totalPrice.toFixed(2)}` : '—'}
              </div>
            </div>
          </div>

          {/* Tare */}
          <button
            onClick={tare}
            disabled={!connected}
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
          >
            Tare (Zero Scale)
          </button>
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
            disabled={!isStable || liveWeight <= 0}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
