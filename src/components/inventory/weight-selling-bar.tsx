'use client'

export interface WeightRule {
  id: string
  categoryName: string
  pricePerKg: number
  emoji: string
}

interface WeightSellingBarProps {
  businessId: string
  businessType: 'restaurant' | 'grocery'
  // Sell by weight toggle
  isSoldByWeight: boolean
  onIsSoldByWeightChange: (v: boolean) => void
  // Selling preset
  saleRules: WeightRule[]
  weightPricingRuleId: string
  onWeightPricingRuleIdChange: (id: string) => void
  // Manual price fallback
  pricePerKg: string
  onPricePerKgChange: (v: string) => void
  // Cost preset
  purchaseRules: WeightRule[]
  purchaseRuleId: string
  onPurchaseRuleIdChange: (id: string) => void
  onCostPriceChange?: (price: string) => void
  // Submitted flag — triggers inline validation errors
  submitted?: boolean
}

export function WeightSellingBar({
  submitted = false,
  onCostPriceChange,
  businessId,
  businessType,
  isSoldByWeight,
  onIsSoldByWeightChange,
  saleRules,
  weightPricingRuleId,
  onWeightPricingRuleIdChange,
  pricePerKg,
  onPricePerKgChange,
  purchaseRules,
  purchaseRuleId,
  onPurchaseRuleIdChange,
}: WeightSellingBarProps) {
  const settingsUrl = `/${businessType}/settings/pos?businessId=${businessId}`

  const sellError = submitted && isSoldByWeight && !weightPricingRuleId && !pricePerKg
    ? 'Selling preset or price per kg is required'
    : submitted && isSoldByWeight && !weightPricingRuleId && pricePerKg && parseFloat(pricePerKg) <= 0
    ? 'Price per kg must be greater than 0'
    : null

  return (
    <div className={`px-5 py-2.5 ${isSoldByWeight ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-white dark:bg-gray-800'}`}>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isSoldByWeight}
          onChange={(e) => {
            onIsSoldByWeightChange(e.target.checked)
            if (!e.target.checked) {
              onWeightPricingRuleIdChange('')
              onPricePerKgChange('')
              onPurchaseRuleIdChange('')
            }
          }}
          className="rounded accent-amber-600"
        />
        <span className={`text-sm font-semibold ${isSoldByWeight ? 'text-amber-800 dark:text-amber-200' : 'text-gray-700 dark:text-gray-300'}`}>
          ⚖️ Sell by Weight (kg)
        </span>
        {!isSoldByWeight && (
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">scale weigh prompt at POS</span>
        )}
      </label>

      {isSoldByWeight && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
          {/* Selling preset */}
          <div>
            <label className="block text-xs font-medium text-green-700 dark:text-green-400 mb-1">🛒 Selling preset *</label>
            <select
              value={weightPricingRuleId}
              onChange={(e) => {
                const ruleId = e.target.value
                onWeightPricingRuleIdChange(ruleId)
                if (ruleId) {
                  const rule = saleRules.find(r => r.id === ruleId)
                  if (rule) onPricePerKgChange(String(rule.pricePerKg))
                } else {
                  onPricePerKgChange('')
                }
              }}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">None — enter manually</option>
              {saleRules.map(r => (
                <option key={r.id} value={r.id}>{r.emoji} {r.categoryName} — ${r.pricePerKg.toFixed(2)}/kg</option>
              ))}
            </select>
            {weightPricingRuleId ? (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className="text-gray-500">Sell at</span>
                <span className="font-mono font-bold text-green-700 dark:text-green-300">
                  ${saleRules.find(r => r.id === weightPricingRuleId)?.pricePerKg.toFixed(2)}/kg
                </span>
                <span className="text-gray-400 italic">follows preset</span>
              </div>
            ) : (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs text-gray-500">Manual price/kg:</span>
                <input
                  type="number" min="0" step="0.01"
                  value={pricePerKg}
                  onChange={(e) => onPricePerKgChange(e.target.value)}
                  className="input-field w-24 py-1 text-sm font-mono"
                  placeholder="0.00"
                />
              </div>
            )}
            {saleRules.length === 0 && (
              <a href={settingsUrl} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
                ⚙️ Configure selling presets →
              </a>
            )}
            {sellError && (
              <p className="text-xs text-red-600 font-medium mt-1">{sellError}</p>
            )}
          </div>

          {/* Cost per kg */}
          <div>
            <label className="block text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">🚚 Cost per kg *</label>
            <select
              value={purchaseRuleId}
              onChange={(e) => {
                const ruleId = e.target.value
                onPurchaseRuleIdChange(ruleId)
                if (ruleId) {
                  const rule = purchaseRules.find(r => r.id === ruleId)
                  if (rule) onCostPriceChange?.(String(rule.pricePerKg))
                }
              }}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select vendor purchase preset…</option>
              {purchaseRules.map(r => (
                <option key={r.id} value={r.id}>{r.emoji} {r.categoryName} — ${r.pricePerKg.toFixed(2)}/kg</option>
              ))}
            </select>
            {purchaseRules.length === 0 && (
              <a href={settingsUrl} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
                ⚙️ Configure vendor purchase presets →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
