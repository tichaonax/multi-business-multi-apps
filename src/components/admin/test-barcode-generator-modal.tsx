'use client'

import { useState, useEffect, useCallback } from 'react'
import { BulkPrintModal, type ProductData } from '@/components/clothing/bulk-print-modal'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BusinessEntry {
  businessId: string
  businessName: string
  businessType: string
}

interface BizConfig extends BusinessEntry {
  selected: boolean
  productCount: number
  baleCount: number   // clothing only
}

type RunStatus = 'idle' | 'running' | 'done' | 'error'

interface BizRun {
  status: RunStatus
  productsCreated: number
  balesCreated: number
  note?: string
  generatedProducts: ProductData[]
}

interface Props {
  businesses: BusinessEntry[]
  onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  restaurant: '🍽️',
  grocery:    '🛒',
  clothing:   '👕',
  hardware:   '🔧',
}

function toConfigs(businesses: BusinessEntry[]): BizConfig[] {
  return businesses
    .filter(b => !(b as any).isUmbrellaBusiness)
    .map(b => ({
      ...b,
      selected:     false,
      productCount: 5,
      baleCount:    0,
    }))
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TestBarcodeGeneratorModal({ businesses, onClose }: Props) {
  const [configs, setConfigs]         = useState<BizConfig[]>(() => toConfigs(businesses))
  const [runs, setRuns]               = useState<Record<string, BizRun>>({})
  const [autoStock, setAutoStock]     = useState(true)
  const [isRunning, setIsRunning]     = useState(false)
  const [printModal, setPrintModal]   = useState<{ businessId: string; products: ProductData[] } | null>(null)

  useEffect(() => {
    if (businesses.length > 0) {
      setConfigs(prev => prev.length === 0 ? toConfigs(businesses) : prev)
    }
  }, [businesses])

  const updateRun = useCallback((bId: string, upd: Partial<BizRun>) => {
    setRuns(prev => ({ ...prev, [bId]: { ...(prev[bId] ?? { status: 'idle', productsCreated: 0, balesCreated: 0, generatedProducts: [] }), ...upd } }))
  }, [])

  function setField(businessId: string, field: keyof BizConfig, value: any) {
    setConfigs(prev => prev.map(c => c.businessId === businessId ? { ...c, [field]: value } : c))
  }

  function toggleAll(selected: boolean) {
    setConfigs(prev => prev.map(c => ({ ...c, selected })))
  }

  async function run() {
    const selected = configs.filter(c => c.selected)
    if (!selected.length) return

    setIsRunning(true)

    // Reset runs for selected
    selected.forEach(c => updateRun(c.businessId, { status: 'idle', productsCreated: 0, balesCreated: 0, note: undefined, generatedProducts: [] }))

    for (const cfg of selected) {
      updateRun(cfg.businessId, { status: 'running' })
      try {
        const res = await fetch('/api/admin/test-barcode-generator/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            items: [{
              businessId:   cfg.businessId,
              businessType: cfg.businessType,
              productCount: cfg.productCount,
              baleCount:    cfg.businessType === 'clothing' ? cfg.baleCount : 0,
              autoStock,
            }],
          }),
        })
        const json = await res.json()

        if (!res.ok || !json.success) {
          updateRun(cfg.businessId, { status: 'error', note: json.error ?? 'Unknown error' })
          continue
        }

        const r = json.results?.[0]

        if (r?.success === false) {
          updateRun(cfg.businessId, { status: 'error', note: r.error ?? 'Generation failed' })
          continue
        }

        const generatedProducts: ProductData[] = [
          ...(r?.products ?? []).map((p: any) => ({
            id:           p.barcode,
            name:         p.name,
            barcodeData:  p.barcode,
            sellingPrice: p.price,
            sku:          p.sku,
            description:  p.description,
            size:         p.size,
            color:        p.color,
            itemName:     p.name,
          })),
          ...(r?.bales ?? []).map((b: any) => ({
            id:           b.barcode,
            name:         b.name,
            barcodeData:  b.barcode,
            sellingPrice: b.price,
            batchNumber:  b.batchNumber,
            description:  b.batchNumber ? 'Batch: ' + b.batchNumber : undefined,
            itemCount:    b.itemCount,
          })),
        ]

        const note = r?.noBaleCategories
          ? 'No bale categories — bales skipped'
          : r?.baleError
          ? `Bale error: ${r.baleError}`
          : undefined

        updateRun(cfg.businessId, {
          status:            'done',
          productsCreated:   r?.productsGenerated ?? 0,
          balesCreated:      r?.balesGenerated    ?? 0,
          note,
          generatedProducts,
        })
      } catch (err: any) {
        updateRun(cfg.businessId, { status: 'error', note: err.message ?? 'Network error' })
      }
    }

    setIsRunning(false)
  }

  const selectedCount = configs.filter(c => c.selected).length

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">🏷️ Test Barcode Generator</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Generates <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">[TEST]</code>-prefixed products with real supplier/category data
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Options */}
          <div className="flex items-center gap-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoStock}
                onChange={e => setAutoStock(e.target.checked)}
                disabled={isRunning}
                className="rounded"
              />
              Auto-stock into inventory
            </label>
            <span className="text-xs text-gray-400">
              {autoStock ? 'Products will be saved to inventory' : 'Preview only — nothing saved'}
            </span>
          </div>

          {/* Select all / none */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleAll(true)}
              disabled={isRunning}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >Select all</button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={() => toggleAll(false)}
              disabled={isRunning}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >None</button>
            {selectedCount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{selectedCount} selected</span>
            )}
          </div>

          {/* Business rows */}
          <div className="space-y-2">
            {configs.map(cfg => {
              const r = runs[cfg.businessId]
              const emoji = TYPE_EMOJI[cfg.businessType] ?? '🏪'
              return (
                <div
                  key={cfg.businessId}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    cfg.selected
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={cfg.selected}
                    onChange={e => setField(cfg.businessId, 'selected', e.target.checked)}
                    disabled={isRunning}
                    className="rounded flex-shrink-0"
                  />

                  {/* Name + type */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {emoji} {cfg.businessName}
                    </span>
                    <span className="ml-2 text-xs text-gray-400 capitalize">[{cfg.businessType}]</span>
                  </div>

                  {/* Count inputs */}
                  {cfg.businessType === 'clothing' ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Products</span>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={cfg.productCount}
                          onChange={e => setField(cfg.businessId, 'productCount', Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                          disabled={isRunning || !cfg.selected}
                          className="w-14 text-center text-sm border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Bales</span>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={cfg.baleCount}
                          onChange={e => setField(cfg.businessId, 'baleCount', Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                          disabled={isRunning || !cfg.selected}
                          className="w-14 text-center text-sm border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Products</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={cfg.productCount}
                        onChange={e => setField(cfg.businessId, 'productCount', Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        disabled={isRunning || !cfg.selected}
                        className="w-14 text-center text-sm border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                      />
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
                    {!r || r.status === 'idle' ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : r.status === 'running' ? (
                      <span className="text-xs text-blue-500 animate-pulse">⏳ Running…</span>
                    ) : r.status === 'done' ? (
                      <>
                        <span className="text-xs text-green-600 dark:text-green-400">
                          ✅ {r.productsCreated}p {r.balesCreated > 0 ? `${r.balesCreated}b` : ''}
                        </span>
                        {r.generatedProducts.length > 0 && (
                          <button
                            onClick={() => setPrintModal({ businessId: cfg.businessId, products: r.generatedProducts })}
                            className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                          >
                            🖨️ Print Labels
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-red-500" title={r.note}>❌ Error</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Notes / warnings */}
          {Object.values(runs).some(r => r.note) && (
            <div className="space-y-1">
              {configs.map(cfg => {
                const r = runs[cfg.businessId]
                if (!r?.note) return null
                return (
                  <p key={cfg.businessId} className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ {cfg.businessName}: {r.note}
                  </p>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isRunning}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={run}
              disabled={isRunning || selectedCount === 0}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isRunning ? '⏳ Generating…' : `Generate for ${selectedCount} business${selectedCount !== 1 ? 'es' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Print labels modal — opens for a specific business result */}
    {printModal && (
      <BulkPrintModal
        isOpen
        compact
        onClose={() => setPrintModal(null)}
        businessId={printModal.businessId}
        products={printModal.products}
        qty={1}
      />
    )}
  </>
  )
}
