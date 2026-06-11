'use client'

import { useEffect, useRef, useState } from 'react'
import { useScale } from '@/contexts/ScaleContext'
import { calcCashRounding, distributeRoundingAdjustment, type CashRoundingConfig } from '@/lib/cash-rounding-utils'

const STABLE_HOLD_MS = 2000
const SIZE_ORDER = ['small', 'medium', 'large']

export interface AYLIComboData {
  comboId: string
  comboName: string
  size: string
  basePrice: number
  lines: Array<{ poolItemId: string; productName: string; emoji: string; weightKg: number; pricePerKg: number; linePrice: number }>
  totalPrice: number
  roundingDiscount?: number  // set only on round-down: adds a discount line to the cart instead of changing prices
}

interface ComboSize { sizeName: string; basePrice: number; meatThresholdKg?: number | null }
// Prices now live on the combo item itself (per-combo pricing)
interface ComboItem {
  id: string
  poolItemId: string
  pricePerKgSmall: number
  pricePerKgMedium: number
  pricePerKgLarge: number
  pool_item: { id: string; name: string; emoji: string; itemCategory: string; buyingPricePerKg?: number | null }
}

interface Props {
  combo: { id: string; name: string; maxWeightKg: number; maxItems: number; sizes: ComboSize[]; items: ComboItem[] }
  onConfirm: (data: AYLIComboData) => void
  onCancel: () => void
  onProgress?: (snapshot: Omit<AYLIComboData, 'totalPrice'>) => void
  calibrationMode?: boolean  // skips size picker, changes Done label
  cashRoundingConfig?: CashRoundingConfig
}

function getPriceForSize(item: ComboItem, size: string): number {
  if (size === 'small') return Number(item.pricePerKgSmall)
  if (size === 'medium') return Number(item.pricePerKgMedium)
  return Number(item.pricePerKgLarge)
}

export function AYLIComboModal({ combo, onConfirm, onCancel, onProgress, calibrationMode = false, cashRoundingConfig }: Props) {
  const { weight, status, tare } = useScale()

  // Step 0 = container placement + auto-tare, Step 1 = size picker, Step 2 = fill panel
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [tared, setTared] = useState(false)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [basePrice, setBasePrice] = useState(0)
  const [sizeLocked, setSizeLocked] = useState(false)

  // Fill panel state
  const [selectedItemId, setSelectedItemId] = useState<string>('')  // poolItemId
  const [previousWeight, setPreviousWeight] = useState(0)
  const [lines, setLines] = useState<AYLIComboData['lines']>([])
  const [error, setError] = useState<string | null>(null)
  const [firstMeatPoolItemId, setFirstMeatPoolItemId] = useState<string | null>(null)

  // Scale stable-weight tracking
  const [readyToCapture, setReadyToCapture] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stableStartRef = useRef<number | null>(null)

  const connected = status.status === 'connected'
  const liveWeight = weight?.weight ?? 0
  const isStable = !!weight?.stable && !weight.overload && liveWeight >= 0
  const isOverload = !!weight?.overload

  const maxWeightKg = Number(combo.maxWeightKg)
  const maxItems = combo.maxItems
  const totalWeightKg = lines.reduce((s, l) => s + l.weightKg, 0)
  const distinctCount = lines.length
  const delta = Math.round((liveWeight - previousWeight) * 1000) / 1000  // positive = add, negative = remove

  // Step 0: auto-tare when container is stable on the scale
  useEffect(() => {
    if (step !== 0 || tared || !isStable || liveWeight <= 0) return
    // Container stable for 2s → auto-tare
    const timer = setTimeout(() => {
      tare()
      setTared(true)
      // In calibration mode skip size picker — default to medium and go straight to fill
      if (calibrationMode) {
        const mediumSize = combo.sizes.find(s => s.sizeName === 'medium') ?? combo.sizes[0]
        if (mediumSize) { setSelectedSize(mediumSize.sizeName); setBasePrice(Number(mediumSize.basePrice)) }
        setTimeout(() => setStep(2), 600)
      } else {
        setTimeout(() => setStep(1), 600)
      }
    }, STABLE_HOLD_MS)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, tared, isStable, liveWeight])

  // Step 1: While the user picks a size, track the scale's settled post-tare reading.
  // Each stable reading updates previousWeight so that by the time a size is tapped,
  // the baseline already reflects the actual zeroed scale (not a hardcoded 0).
  useEffect(() => {
    if (step !== 1 || !isStable || liveWeight < 0) return
    setPreviousWeight(liveWeight)
  }, [step, isStable, liveWeight])

  // Stable hold-down timer for fill panel
  useEffect(() => {
    if (step !== 2) return
    const clearTimers = () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      stableStartRef.current = null
      setReadyToCapture(false)
      setCountdown(0)
    }
    if (!isStable || Math.abs(liveWeight - previousWeight) < 0.001) { clearTimers(); return }

    stableStartRef.current = Date.now()
    setCountdown(Math.ceil(STABLE_HOLD_MS / 1000))

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (stableStartRef.current ?? Date.now())
      const remaining = Math.ceil((STABLE_HOLD_MS - elapsed) / 1000)
      setCountdown(remaining > 0 ? remaining : 0)
    }, 200)

    timerRef.current = setTimeout(() => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setCountdown(0)
      setReadyToCapture(true)
    }, STABLE_HOLD_MS)

    return clearTimers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStable, liveWeight, step])

  function handleSelectSize(size: ComboSize) {
    setSelectedSize(size.sizeName)
    setBasePrice(Number(size.basePrice))
    setPreviousWeight(liveWeight)  // snapshot scale reading so first item's delta is food-only
    setStep(2)
  }

  function handleCapture() {
    if (!readyToCapture || !selectedItemId || Math.abs(delta) < 0.001) return
    setError(null)

    const comboItem = combo.items.find(it => it.poolItemId === selectedItemId)
    if (!comboItem) return

    const pricePerKg = getPriceForSize(comboItem, selectedSize)

    // ── Removal ─────────────────────────────────────────────────────────────
    if (delta < 0) {
      const absRemoval = Math.abs(delta)
      const existingLine = lines.find(l => l.poolItemId === selectedItemId)
      if (!existingLine) {
        setError(`${comboItem.pool_item.name} hasn't been captured yet — nothing to remove.`)
        return
      }
      if (absRemoval > existingLine.weightKg + 0.001) {
        setError(`Cannot remove ${absRemoval.toFixed(3)} kg — only ${existingLine.weightKg.toFixed(3)} kg of ${existingLine.productName} captured.`)
        return
      }
      const newWeightKg = Math.max(0, Math.round((existingLine.weightKg - absRemoval) * 1000) / 1000)
      const newLinePrice = Math.round(newWeightKg * pricePerKg * 100) / 100
      const newLines: AYLIComboData['lines'] = newWeightKg < 0.001
        ? lines.filter(l => l.poolItemId !== selectedItemId)
        : lines.map(l => l.poolItemId === selectedItemId ? { ...l, weightKg: newWeightKg, linePrice: newLinePrice } : l)

      setLines(newLines)
      onProgress?.({ comboId: combo.id, comboName: combo.name, size: selectedSize, basePrice, lines: newLines })
      if (newWeightKg < 0.001 && selectedItemId === firstMeatPoolItemId) setFirstMeatPoolItemId(null)
      setPreviousWeight(liveWeight)
      setReadyToCapture(false)
      setSelectedItemId('')
      return
    }

    // ── Addition (existing logic) ────────────────────────────────────────────
    const newTotal = totalWeightKg + delta
    if (newTotal > maxWeightKg) {
      setError(`Adding ${delta.toFixed(3)} kg would exceed the ${maxWeightKg} kg limit (currently ${totalWeightKg.toFixed(3)} kg).`)
      return
    }

    const existingLine = lines.find(l => l.poolItemId === selectedItemId)
    const isNewItem = !existingLine

    if (isNewItem && distinctCount >= maxItems) {
      setError(`Maximum of ${maxItems} distinct items reached.`)
      return
    }

    const addedPrice = delta * pricePerKg

    const newLines: AYLIComboData['lines'] = existingLine
      ? lines.map(l => l.poolItemId === selectedItemId
          ? { ...l, weightKg: l.weightKg + delta, linePrice: l.linePrice + addedPrice }
          : l)
      : [...lines, {
          poolItemId: selectedItemId,
          productName: comboItem.pool_item.name,
          emoji: comboItem.pool_item.emoji || '🍽️',
          weightKg: delta,
          pricePerKg,
          linePrice: addedPrice
        }]

    setLines(newLines)
    onProgress?.({ comboId: combo.id, comboName: combo.name, size: selectedSize, basePrice, lines: newLines })

    if (!sizeLocked) setSizeLocked(true)

    if (!firstMeatPoolItemId && comboItem.pool_item.itemCategory === 'MEAT') {
      setFirstMeatPoolItemId(selectedItemId)
    }

    setPreviousWeight(liveWeight)
    setReadyToCapture(false)
    setSelectedItemId('')
  }

  function handleDone() {
    if (lines.length === 0) return
    const itemsTotal = lines.reduce((s, l) => s + l.linePrice, 0)
    onConfirm({
      comboId: combo.id,
      comboName: combo.name,
      size: selectedSize,
      basePrice,
      lines,
      totalPrice: basePrice + itemsTotal
    })
  }

  const itemsTotal = lines.reduce((s, l) => s + l.linePrice, 0)
  const comboTotal = basePrice + itemsTotal

  // Rounding options for the Done footer (only when cashRoundingConfig provided + not calibration)
  const roundingStep = (!calibrationMode && cashRoundingConfig?.enabled) ? cashRoundingConfig.step : 0
  const roundUpTarget = roundingStep > 0 && lines.length > 0
    ? Math.round(Math.ceil(comboTotal / roundingStep) * roundingStep * 100) / 100 : comboTotal
  const roundDownTarget = roundingStep > 0 && lines.length > 0
    ? Math.round(Math.floor(comboTotal / roundingStep) * roundingStep * 100) / 100 : comboTotal
  const upAdj   = Math.round((roundUpTarget   - comboTotal) * 100) / 100
  const downAdj = Math.round((roundDownTarget - comboTotal) * 100) / 100  // negative
  const canRoundUp   = upAdj > 0
  const canRoundDown = downAdj < 0 && roundDownTarget > 0

  function handleDoneWithRounding(adjustment: number) {
    if (lines.length === 0) return
    if (adjustment < 0) {
      // Round DOWN — keep original prices; signal a discount line via roundingDiscount
      onConfirm({
        comboId: combo.id,
        comboName: combo.name,
        size: selectedSize,
        basePrice,
        lines,
        totalPrice: comboTotal,
        roundingDiscount: Math.round(Math.abs(adjustment) * 100) / 100,
      })
    } else {
      // Round UP — distribute adjustment into line prices
      const result = distributeRoundingAdjustment(lines, adjustment)
      onConfirm({
        comboId: combo.id,
        comboName: combo.name,
        size: selectedSize,
        basePrice,
        lines: result.lines,
        totalPrice: Math.round((basePrice + result.totalPrice) * 100) / 100,
      })
    }
  }

  // Pending capture cost — what adding/removing the current delta will cost
  const isRemoving = delta < -0.001
  const pendingComboItem = selectedItemId ? combo.items.find(it => it.poolItemId === selectedItemId) : null
  const pendingPricePerKg = pendingComboItem ? getPriceForSize(pendingComboItem, selectedSize) : 0
  const pendingCost = Math.abs(delta) > 0.001 && pendingPricePerKg > 0
    ? Math.round(Math.abs(delta) * pendingPricePerKg * 100) / 100 : 0
  const pendingSign = isRemoving ? -1 : 1
  const newComboTotalAfterCapture = Math.round((comboTotal + pendingSign * pendingCost) * 100) / 100
  const weightPct = Math.min(100, (totalWeightKg / maxWeightKg) * 100)

  // Removal validation: can't remove more than what's in the line
  const removalLine = isRemoving && selectedItemId ? lines.find(l => l.poolItemId === selectedItemId) : null
  const removalExceedsLine = removalLine ? Math.abs(delta) > removalLine.weightKg + 0.001 : false
  const removalNoLine = isRemoving && selectedItemId && !lines.find(l => l.poolItemId === selectedItemId)

  const captureDisabled = !readyToCapture || !selectedItemId || Math.abs(delta) < 0.001
    || (delta > 0 && liveWeight > maxWeightKg)
    || removalExceedsLine || !!removalNoLine

  // Meat threshold
  const selectedSizeData = combo.sizes.find(s => s.sizeName === selectedSize)
  const meatThresholdKg = selectedSizeData?.meatThresholdKg ? Number(selectedSizeData.meatThresholdKg) : null
  const hasMeatInPool = combo.items.some(it => it.pool_item.itemCategory === 'MEAT')
  const firstMeatLine = firstMeatPoolItemId ? lines.find(l => l.poolItemId === firstMeatPoolItemId) : null
  const firstMeatWeight = firstMeatLine?.weightKg ?? 0
  const meatThresholdMet = !hasMeatInPool || !meatThresholdKg || firstMeatWeight >= meatThresholdKg

  const borderClass = !connected
    ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
    : isOverload
    ? 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
    : readyToCapture
    ? 'border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
    : isStable && liveWeight > previousWeight
    ? 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'

  return (
    /* Full-screen blocking overlay — nothing behind is clickable */
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-4 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">🥗 {combo.name}</h2>
              {step === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Step 1 of 3 — Place container</p>
            )}
            {step === 1 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Step 2 of 3 — Select size</p>
            )}
            {step === 2 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                  {calibrationMode
                    ? 'Pricing calibration — capturing weights'
                    : <>{selectedSize} — Base: ${basePrice.toFixed(2)}{sizeLocked && <span className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">size locked</span>}</>
                  }
                </p>
              )}
            </div>
            {step === 2 && (
              <button onClick={tare} type="button"
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                ⚖️ Tare
              </button>
            )}
          </div>
        </div>

        {/* Step 0: Container placement + auto-tare */}
        {step === 0 && (
          <div className="p-6 text-center space-y-5">
            <div className="text-5xl">🥡</div>
            <div>
              <h3 className="text-base font-semibold text-primary mb-1">Place empty container on the scale</h3>
              <p className="text-sm text-secondary">Once it's stable, the scale will zero automatically and the size picker will open.</p>
            </div>

            {/* Live scale reading */}
            <div className={`rounded-xl border-2 p-4 transition-colors ${
              !connected ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              : isOverload ? 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
              : isStable && liveWeight > 0 ? 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
            }`}>
              <div className="flex items-center gap-2 mb-2 justify-center">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
                <span className="text-xs text-secondary">{connected ? `Scale — ${status.comPort}` : 'Scale not connected'}</span>
              </div>
              {!connected ? (
                <p className="text-sm text-red-500">No scale connected. Go to POS Settings to configure.</p>
              ) : isOverload ? (
                <p className="text-2xl font-mono font-bold text-red-500">OVERLOAD</p>
              ) : liveWeight <= 0 ? (
                <p className="text-sm text-secondary">Waiting for container… (reading: {liveWeight.toFixed(3)} kg)</p>
              ) : isStable ? (
                <div>
                  <div className="text-3xl font-mono font-bold text-amber-600 dark:text-amber-300">{liveWeight.toFixed(3)} kg</div>
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">Stable — zeroing in {Math.ceil(STABLE_HOLD_MS / 1000)}s…</div>
                </div>
              ) : (
                <div>
                  <div className="text-3xl font-mono font-bold text-gray-500">{liveWeight.toFixed(3)} kg</div>
                  <div className="text-xs text-secondary mt-1">Keep container still…</div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onCancel} className="flex-1 btn-secondary">Cancel</button>
              <button type="button" onClick={() => {
                tare()
                if (calibrationMode) {
                  const mediumSize = combo.sizes.find(s => s.sizeName === 'medium') ?? combo.sizes[0]
                  if (mediumSize) { setSelectedSize(mediumSize.sizeName); setBasePrice(Number(mediumSize.basePrice)) }
                  setTimeout(() => setStep(2), 600)
                } else {
                  setTimeout(() => setStep(1), 600)
                }
              }}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                Skip (no container)
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Size Picker */}
        {step === 1 && (
          <div className="p-5">
            <p className="text-sm text-secondary mb-4">Select a size to start the combo:</p>
            <div className="grid grid-cols-3 gap-3">
              {[...combo.sizes].sort((a, b) => SIZE_ORDER.indexOf(a.sizeName) - SIZE_ORDER.indexOf(b.sizeName)).map(s => (
                <button key={s.sizeName} type="button" onClick={() => handleSelectSize(s)}
                  className="flex flex-col items-center justify-center py-5 rounded-xl border-2 border-blue-200 dark:border-blue-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                  <span className="capitalize text-base font-semibold text-primary">{s.sizeName}</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">${Number(s.basePrice).toFixed(2)}</span>
                  <span className="text-xs text-secondary mt-0.5">base price</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-5">
              <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Step 2: Fill Panel */}
        {step === 2 && (
          <div className="p-5 space-y-4">

            {/* Scale display */}
            <div className={`rounded-xl border-2 p-4 transition-colors ${borderClass}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
                  <span className="text-xs text-secondary">{connected ? `Scale — ${status.comPort}` : 'Scale not connected'}</span>
                </div>
                {isStable && Math.abs(liveWeight - previousWeight) >= 0.001 && !readyToCapture && (
                  <span className={`text-xs font-semibold ${isRemoving ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {isRemoving ? 'Removing… ' : 'Holding… '}{countdown}s
                  </span>
                )}
                {readyToCapture && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">● Ready</span>
                )}
              </div>
              <div className="text-center">
                {isOverload ? (
                  <p className="text-2xl font-mono font-bold text-red-500">OVERLOAD</p>
                ) : (
                  <>
                    <div className="text-4xl font-mono font-bold text-gray-900 dark:text-gray-100">{liveWeight.toFixed(3)} kg</div>
                    {Math.abs(liveWeight - previousWeight) >= 0.001 && (() => {
                      const itemName = combo.items.find(it => it.poolItemId === selectedItemId)?.pool_item?.name
                      const roundingAfter = !calibrationMode && cashRoundingConfig && pendingCost > 0
                        ? calcCashRounding(newComboTotalAfterCapture, cashRoundingConfig)
                        : null
                      const gapAfter = roundingAfter && roundingAfter.direction !== 'EXACT' ? roundingAfter.adjustment : 0
                      const deltaColor = isRemoving ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                      return (
                        <div className="mt-0.5 space-y-0.5">
                          <div className={`text-base font-medium ${deltaColor}`}>
                            {isRemoving ? '−' : '+'}{Math.abs(delta).toFixed(3)} kg
                            {selectedItemId ? ` → ${itemName}` : ' (select item first)'}
                            {pendingCost > 0 && (
                              <span className="ml-2 font-bold">
                                ({isRemoving ? '−' : '+'}${pendingCost.toFixed(2)})
                              </span>
                            )}
                          </div>
                          {pendingCost > 0 && !removalExceedsLine && !removalNoLine && (
                            <div className="text-sm text-gray-400 dark:text-gray-300">
                              New total: <span className="font-semibold text-primary">${newComboTotalAfterCapture.toFixed(2)}</span>
                              {gapAfter > 0
                                ? <span className="ml-2 text-amber-600 dark:text-amber-400">· +${gapAfter.toFixed(2)} to reach ${roundingAfter!.roundedAmount.toFixed(2)}</span>
                                : roundingAfter?.direction === 'EXACT' && comboTotal !== newComboTotalAfterCapture
                                  ? <span className="ml-2 text-green-600 dark:text-green-400">· exact — no rounding needed ✓</span>
                                  : null
                              }
                            </div>
                          )}
                          {removalExceedsLine && removalLine && (
                            <div className="text-xs text-red-500 dark:text-red-400">
                              Only {removalLine.weightKg.toFixed(3)} kg of {itemName} captured — reduce less
                            </div>
                          )}
                          {removalNoLine && selectedItemId && (
                            <div className="text-xs text-red-500 dark:text-red-400">
                              {itemName} hasn't been captured yet
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>
            </div>

            {/* Capacity bars */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs text-secondary mb-1">
                  <span>Weight</span>
                  <span>{totalWeightKg.toFixed(3)} / {maxWeightKg} kg</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${weightPct >= 100 ? 'bg-red-500' : weightPct >= 80 ? 'bg-amber-400' : 'bg-blue-500'}`}
                    style={{ width: `${weightPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-secondary mb-1">
                  <span>Items</span>
                  <span>{distinctCount} / {maxItems}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${distinctCount >= maxItems ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${(distinctCount / maxItems) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Item selector */}
            <div>
              <p className="text-xs font-medium text-secondary mb-2">SELECT NEXT ITEM TO ADD:</p>
              <div className="grid grid-cols-3 gap-2">
                {combo.items.map(it => {
                  const price = getPriceForSize(it, selectedSize)
                  const isSelected = selectedItemId === it.poolItemId
                  const addedLine = lines.find(l => l.poolItemId === it.poolItemId)
                  return (
                    <button key={it.poolItemId} type="button"
                      onClick={() => { setSelectedItemId(it.poolItemId); setError(null) }}
                      className={`text-left p-2.5 rounded-lg border-2 transition-colors relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : addedLine
                          ? 'border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}>
                      {addedLine && (
                        <span className="absolute top-1 right-1 bg-green-500 text-white text-[9px] font-bold rounded px-1 py-0.5 leading-none">
                          {addedLine.weightKg.toFixed(3)} kg
                        </span>
                      )}
                      <div className="text-2xl mb-0.5">{it.pool_item.emoji || '🍽️'}</div>
                      <div className="font-medium text-sm text-primary truncate">{it.pool_item.name}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">${price.toFixed(2)}/kg</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Meat threshold warning */}
            {hasMeatInPool && meatThresholdKg && !meatThresholdMet && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                {firstMeatPoolItemId
                  ? `⚠ Minimum ${(meatThresholdKg * 1000).toFixed(0)}g of ${firstMeatLine ? lines.find(l => l.poolItemId === firstMeatPoolItemId)?.productName : 'meat'} required. Currently ${(firstMeatWeight * 1000).toFixed(0)}g — add more.`
                  : `⚠ This combo requires at least ${(meatThresholdKg * 1000).toFixed(0)}g of meat (chicken, beef, or fish).`
                }
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Capture / Remove button */}
            <button type="button" onClick={handleCapture} disabled={captureDisabled}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                captureDisabled
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : isRemoving
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}>
              {!selectedItemId
                ? 'Select an item above first'
                : !readyToCapture
                ? `Waiting for stable weight…`
                : isRemoving
                ? `✕ Remove ${Math.abs(delta).toFixed(3)} kg from ${combo.items.find(it => it.poolItemId === selectedItemId)?.pool_item?.name}`
                : `✓ Capture +${delta.toFixed(3)} kg of ${combo.items.find(it => it.poolItemId === selectedItemId)?.pool_item?.name}`
              }
            </button>

            {/* Lines */}
            {lines.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 text-xs font-semibold text-secondary uppercase tracking-wide">Contents</div>
                {lines.map(l => {
                  const poolItem = combo.items.find(it => it.poolItemId === l.poolItemId)
                  return (
                  <div key={l.poolItemId} className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{poolItem?.pool_item.emoji || '🍽️'}</span>
                      <div>
                        <span className="text-sm font-medium text-primary">{l.productName}</span>
                        <span className="text-xs text-secondary ml-2">{l.weightKg.toFixed(3)} kg × ${l.pricePerKg.toFixed(2)}/kg</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary">${l.linePrice.toFixed(2)}</span>
                  </div>
                  )
                })}
              </div>
            )}

            {/* Totals */}
            {(() => {
              const rounding = !calibrationMode && cashRoundingConfig && lines.length > 0
                ? calcCashRounding(comboTotal, cashRoundingConfig)
                : null
              const showRounding = rounding && rounding.direction !== 'EXACT'
              return (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <div className="flex justify-between px-3 py-2 text-sm text-secondary">
                    <span className="capitalize">Base ({selectedSize})</span>
                    <span>${basePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 text-sm text-secondary border-t border-gray-100 dark:border-gray-700">
                    <span>Items total</span>
                    <span>${itemsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2.5 text-base font-bold text-primary border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                    <span>Combo Total</span>
                    <span>${comboTotal.toFixed(2)}</span>
                  </div>
                  {(canRoundUp || canRoundDown) && (
                    <div className="border-t border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
                      <div className="font-semibold mb-1">🪙 Cash rounding options</div>
                      {canRoundUp   && <div className="flex justify-between"><span>↑ Round up</span><span>+${upAdj.toFixed(2)} → <b>${roundUpTarget.toFixed(2)}</b></span></div>}
                      {canRoundDown && <div className="flex justify-between"><span>↓ Round down</span><span>−${Math.abs(downAdj).toFixed(2)} → <b>${roundDownTarget.toFixed(2)}</b></span></div>}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Footer actions */}
            {!calibrationMode && (canRoundUp || canRoundDown) && lines.length > 0 && meatThresholdMet ? (
              <div className="space-y-2 pt-1">
                <div className={`grid gap-2 ${canRoundUp && canRoundDown ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {canRoundUp && (
                    <button type="button" onClick={() => handleDoneWithRounding(upAdj)}
                      className="py-2.5 px-3 rounded-lg font-semibold text-sm bg-green-600 hover:bg-green-700 text-white">
                      ↑ ${roundUpTarget.toFixed(2)} (+${upAdj.toFixed(2)})
                    </button>
                  )}
                  {canRoundDown && (
                    <button type="button" onClick={() => handleDoneWithRounding(downAdj)}
                      className="py-2.5 px-3 rounded-lg font-semibold text-sm bg-orange-500 hover:bg-orange-600 text-white">
                      ↓ ${roundDownTarget.toFixed(2)} (−${Math.abs(downAdj).toFixed(2)})
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={onCancel} className="flex-1 btn-secondary text-sm">Cancel</button>
                  <button type="button" onClick={handleDone}
                    className="flex-1 py-2 px-3 rounded-lg font-semibold text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200">
                    Keep ${comboTotal.toFixed(2)}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onCancel} className="flex-1 btn-secondary">Cancel</button>
                <button type="button" onClick={handleDone} disabled={lines.length === 0 || !meatThresholdMet}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                    lines.length === 0 || !meatThresholdMet
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}>
                  {calibrationMode ? `Done — Save Weights (${lines.length} items, ${totalWeightKg.toFixed(3)} kg)` : `Done — Add to Cart ($${comboTotal.toFixed(2)})`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
