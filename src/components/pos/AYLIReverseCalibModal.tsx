'use client'

import { useEffect, useRef, useState } from 'react'
import { useScale } from '@/contexts/ScaleContext'
import { type AYLIComboData } from './AYLIComboModal'

const STABLE_HOLD_MS = 2000

interface ComboSize { sizeName: string; basePrice: number; meatThresholdKg?: number | null }
interface ComboItem {
  id: string
  poolItemId: string
  pool_item: { id: string; name: string; emoji: string; itemCategory: string }
}

interface Props {
  combo: { id: string; name: string; sizes: ComboSize[]; items: ComboItem[] }
  calibTargetPrice: number
  onConfirm: (data: AYLIComboData) => void
  onCancel: () => void
}

export function AYLIReverseCalibModal({ combo, calibTargetPrice, onConfirm, onCancel }: Props) {
  const { weight, status } = useScale()

  const liveWeight = weight?.weight ?? 0
  const isStable = !!weight?.stable && !weight.overload
  const connected = status.status === 'connected'

  // All combo items sorted MEAT first — used as the full selectable list
  const allItems: ComboItem[] = [
    ...combo.items.filter(ci => ci.pool_item.itemCategory === 'MEAT'),
    ...combo.items.filter(ci => ci.pool_item.itemCategory !== 'MEAT'),
  ]

  // Phase 'select': user picks which items are in this calibration portion
  // Phase 'place':  full container on scale, confirm weight
  // Phase 'removing': system directs removal one by one
  const [phase, setPhase] = useState<'select' | 'place' | 'removing'>('select')

  // Selected item ids (poolItemId). Start with all selected — user unchecks items not in this portion.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(allItems.map(ci => ci.poolItemId)))

  // Ordered subset of combo.items matching selection (MEAT first)
  const [removalOrder, setRemovalOrder] = useState<ComboItem[]>([])

  const [previousWeight, setPreviousWeight] = useState(0)
  const [removedIdx, setRemovedIdx] = useState(0)
  const [captured, setCaptured] = useState<Array<{ poolItemId: string; weightKg: number }>>([])
  const [placeReady, setPlaceReady] = useState(false)
  const [readyToCapture, setReadyToCapture] = useState(false)

  const placeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (placeTimerRef.current) clearTimeout(placeTimerRef.current)
      if (captureTimerRef.current) clearTimeout(captureTimerRef.current)
    }
  }, [])

  // Place phase: 2s stable hold
  useEffect(() => {
    if (phase !== 'place') return
    if (!isStable || liveWeight <= 0.001) {
      setPlaceReady(false)
      if (placeTimerRef.current) { clearTimeout(placeTimerRef.current); placeTimerRef.current = null }
      return
    }
    if (placeTimerRef.current !== null) return
    placeTimerRef.current = setTimeout(() => setPlaceReady(true), STABLE_HOLD_MS)
  }, [isStable, liveWeight, phase])

  const delta = Math.round((previousWeight - liveWeight) * 1000) / 1000

  // Removal phase: 2s stable hold after delta > 0.001
  useEffect(() => {
    if (phase !== 'removing') return
    if (!isStable || delta < 0.001) {
      setReadyToCapture(false)
      if (captureTimerRef.current) { clearTimeout(captureTimerRef.current); captureTimerRef.current = null }
      return
    }
    if (captureTimerRef.current !== null) return
    captureTimerRef.current = setTimeout(() => setReadyToCapture(true), STABLE_HOLD_MS)
  }, [isStable, delta, phase])

  function toggleItem(poolItemId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(poolItemId)) next.delete(poolItemId)
      else next.add(poolItemId)
      return next
    })
  }

  function handleConfirmSelection() {
    const ordered = allItems.filter(ci => selectedIds.has(ci.poolItemId))
    setRemovalOrder(ordered)
    setPhase('place')
  }

  function handleConfirmPlace() {
    setPreviousWeight(liveWeight)
    setPhase('removing')
    setReadyToCapture(false)
    if (captureTimerRef.current) { clearTimeout(captureTimerRef.current); captureTimerRef.current = null }
  }

  function handleCapture() {
    const currentItem = removalOrder[removedIdx]
    if (!currentItem) return

    const itemWeight = Math.round((previousWeight - liveWeight) * 1000) / 1000
    const newCaptured = [...captured, { poolItemId: currentItem.poolItemId, weightKg: itemWeight }]

    setCaptured(newCaptured)
    setPreviousWeight(liveWeight)
    setReadyToCapture(false)
    if (captureTimerRef.current) { clearTimeout(captureTimerRef.current); captureTimerRef.current = null }

    const nextIdx = removedIdx + 1
    setRemovedIdx(nextIdx)

    if (nextIdx >= removalOrder.length) {
      const smallSize = combo.sizes.find(s => s.sizeName === 'small') ?? combo.sizes[0]
      onConfirm({
        comboId:    combo.id,
        comboName:  combo.name,
        size:       smallSize?.sizeName ?? 'small',
        basePrice:  Number(smallSize?.basePrice ?? 0),
        totalPrice: calibTargetPrice,
        lines: newCaptured.map(c => {
          const ci = combo.items.find(i => i.poolItemId === c.poolItemId)!
          return {
            poolItemId:  c.poolItemId,
            productName: ci.pool_item.name,
            emoji:       ci.pool_item.emoji,
            weightKg:    c.weightKg,
            pricePerKg:  0,
            linePrice:   0,
          }
        }),
      })
    }
  }

  function handleStartOver() {
    setPhase('select')
    setSelectedIds(new Set())
    setRemovalOrder([])
    setPreviousWeight(0)
    setRemovedIdx(0)
    setCaptured([])
    setPlaceReady(false)
    setReadyToCapture(false)
    if (placeTimerRef.current) { clearTimeout(placeTimerRef.current); placeTimerRef.current = null }
    if (captureTimerRef.current) { clearTimeout(captureTimerRef.current); captureTimerRef.current = null }
  }

  const currentItem = removalOrder[removedIdx] ?? null
  const isMeat = currentItem?.pool_item.itemCategory === 'MEAT'
  const canProceed = selectedIds.size >= 1

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 tracking-widest uppercase">⚙ Reverse Calibration</p>
            <p className="text-sm font-semibold text-primary mt-0.5">{combo.name}</p>
          </div>
          <button onClick={onCancel} className="text-secondary hover:text-primary text-xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        {/* Scale status */}
        <div className={`px-5 py-1.5 text-xs font-medium flex items-center gap-2 flex-shrink-0 ${
          connected
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connected ? 'Scale connected' : 'Scale not connected — connect scale to proceed'}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Phase: select items ── */}
          {phase === 'select' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-primary text-lg">Confirm items for this portion</h3>
                <p className="text-sm text-secondary mt-1">
                  All combo items are selected. Uncheck any that will <strong>not</strong> be in the container for this calibration build.
                </p>
              </div>

              <div className="space-y-1.5">
                {allItems.map(ci => {
                  const checked = selectedIds.has(ci.poolItemId)
                  const isMeatItem = ci.pool_item.itemCategory === 'MEAT'
                  return (
                    <button
                      key={ci.poolItemId}
                      type="button"
                      onClick={() => toggleItem(ci.poolItemId)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                        checked
                          ? isMeatItem
                            ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        checked
                          ? isMeatItem ? 'border-amber-500 bg-amber-500' : 'border-blue-500 bg-blue-500'
                          : 'border-gray-400 dark:border-gray-500'
                      }`}>
                        {checked && <span className="text-white text-xs font-bold">✓</span>}
                      </span>
                      <span className="text-xl flex-shrink-0">{ci.pool_item.emoji || '🍽️'}</span>
                      <span className="text-sm font-medium text-primary flex-1">{ci.pool_item.name}</span>
                      {isMeatItem && checked && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                          MEAT — first
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={handleConfirmSelection}
                disabled={!canProceed}
                className="w-full py-3.5 rounded-xl font-semibold text-base transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed">
                {canProceed ? `Next — place ${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''} on scale →` : 'Select at least one item'}
              </button>
            </div>
          )}

          {/* ── Phase: place full container ── */}
          {phase === 'place' && (
            <div className="space-y-4 text-center">
              <div className="text-5xl">🥘</div>
              <div>
                <h3 className="font-semibold text-primary text-lg">Place full container on scale</h3>
                <p className="text-sm text-secondary mt-1">
                  Fill the container with the {removalOrder.length} selected items below, then place it on the scale.
                </p>
              </div>

              {/* Selected items list */}
              <div className="text-left bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Items to include — removal order</p>
                {removalOrder.map((ci, idx) => (
                  <div key={ci.poolItemId} className="flex items-center gap-2 text-sm">
                    <span className="text-secondary w-4 text-center text-xs flex-shrink-0">{idx + 1}</span>
                    <span className="flex-shrink-0">{ci.pool_item.emoji || '🍽️'}</span>
                    <span className="text-primary">{ci.pool_item.name}</span>
                    {ci.pool_item.itemCategory === 'MEAT' && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold ml-auto flex-shrink-0">
                        MEAT — remove first
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Live weight */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl py-5">
                <p className="text-4xl font-mono font-bold text-primary">{liveWeight.toFixed(3)} <span className="text-xl">kg</span></p>
                <p className="text-xs text-secondary mt-1.5">
                  {!connected ? 'scale offline'
                    : isStable && liveWeight > 0.001 ? '● stable — ready'
                    : isStable ? '● stable — place container'
                    : '○ settling…'}
                </p>
              </div>

              <button
                onClick={handleConfirmPlace}
                disabled={!placeReady}
                className="w-full py-3.5 rounded-xl font-semibold text-base transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed">
                Start removing items →
              </button>

              <p className="text-xs text-secondary">Target: ${calibTargetPrice.toFixed(2)} for small</p>

              <button onClick={handleStartOver} className="text-xs text-secondary hover:text-primary underline">
                ← Change item selection
              </button>
            </div>
          )}

          {/* ── Phase: removal loop ── */}
          {phase === 'removing' && currentItem && (
            <div className="space-y-4">

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-secondary">
                  <span>Removing item {removedIdx + 1} of {removalOrder.length}</span>
                  {captured.length > 0 && <span>{captured.length} captured</span>}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(removedIdx / removalOrder.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Instruction card */}
              <div className={`rounded-2xl p-5 text-center border-2 ${
                isMeat
                  ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10'
              }`}>
                <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-3">Remove from container</p>
                <div className="text-5xl mb-2">{currentItem.pool_item.emoji || '🍽️'}</div>
                <p className="text-xl font-bold text-primary">{currentItem.pool_item.name}</p>
                {isMeat && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                    Sets the meat minimum weight
                  </p>
                )}
              </div>

              {/* Live scale */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl py-4 text-center">
                <p className="text-3xl font-mono font-bold text-primary">{liveWeight.toFixed(3)} <span className="text-lg">kg</span></p>
                <p className={`text-sm font-medium mt-1 ${delta > 0.001 ? 'text-green-600 dark:text-green-400' : 'text-secondary'}`}>
                  {delta > 0.001 ? `removed: ${delta.toFixed(3)} kg` : 'remove the item from the container'}
                </p>
                <p className="text-xs text-secondary mt-0.5">
                  {isStable ? '● stable' : '○ settling…'}
                </p>
              </div>

              {/* Capture button */}
              <button
                onClick={handleCapture}
                disabled={!readyToCapture}
                className={`w-full py-3.5 rounded-xl font-semibold text-base transition-colors ${
                  readyToCapture
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-secondary cursor-not-allowed'
                }`}>
                {readyToCapture
                  ? `✓ Captured ${delta.toFixed(3)} kg of ${currentItem.pool_item.name}`
                  : 'Waiting for stable reading…'}
              </button>

              {/* Captured log */}
              {captured.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Captured</p>
                  {captured.map(c => {
                    const ci = combo.items.find(i => i.poolItemId === c.poolItemId)
                    return (
                      <div key={c.poolItemId} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-primary">{ci?.pool_item.emoji} {ci?.pool_item.name}</span>
                        <span className="font-mono text-green-600 dark:text-green-400">{c.weightKg.toFixed(3)} kg ✓</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Start over */}
              <div className="text-center pt-1">
                <button onClick={handleStartOver} className="text-xs text-secondary hover:text-primary underline">
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
