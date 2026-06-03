'use client'

interface VendorLine {
  categoryName: string
  weightKg: number
  pricePerKg: number
  totalAmount: number
}

interface LivestockDisplayProps {
  vendorName?: string
  vendorTotalAmount?: number
  vendorTotalWeightKg?: number
  vendorLines?: VendorLine[]
  currentWeightKg?: number | null
  currentCategory?: string
  currentPricePerKg?: number
  currentLineTotal?: number | null
}

export function LivestockDisplay({
  vendorName,
  vendorTotalAmount = 0,
  vendorTotalWeightKg = 0,
  vendorLines = [],
  currentWeightKg,
  currentCategory,
  currentPricePerKg,
  currentLineTotal,
}: LivestockDisplayProps) {
  return (
    <div className="h-full flex flex-col bg-gray-950 text-white p-8 gap-6">

      {/* Vendor header */}
      <div className="flex items-center justify-between bg-gray-900 rounded-2xl px-8 py-5">
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Vendor</p>
          <p className="text-3xl font-bold">{vendorName ?? '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Session Total</p>
          <p className="text-4xl font-bold text-green-400">${vendorTotalAmount.toFixed(2)}</p>
          <p className="text-lg text-gray-400">{vendorTotalWeightKg.toFixed(3)} kg</p>
        </div>
      </div>

      {/* Live scale reading */}
      {currentWeightKg != null && currentWeightKg > 0.02 && (
        <div className="bg-blue-900/50 border border-blue-500/40 rounded-2xl px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-300 uppercase tracking-widest mb-1">On Scale Now</p>
            <p className="text-5xl font-mono font-bold text-white">{currentWeightKg.toFixed(3)} kg</p>
            {currentCategory && (
              <p className="text-xl text-blue-200 mt-1">{currentCategory}</p>
            )}
          </div>
          {currentPricePerKg != null && currentPricePerKg > 0 && (
            <div className="text-right">
              <p className="text-sm text-blue-300 uppercase tracking-widest mb-1">Rate</p>
              <p className="text-2xl font-bold">${currentPricePerKg.toFixed(2)}/kg</p>
              {currentLineTotal != null && (
                <>
                  <p className="text-sm text-blue-300 uppercase tracking-widest mt-3 mb-1">Line Value</p>
                  <p className="text-4xl font-bold text-yellow-300">${currentLineTotal.toFixed(2)}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lines added */}
      {vendorLines.length > 0 && (
        <div className="flex-1 overflow-auto">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-3">Lines Added</p>
          <div className="space-y-2">
            {vendorLines.map((line, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-900 rounded-xl px-6 py-4">
                <div>
                  <p className="text-lg font-semibold">{line.categoryName}</p>
                  <p className="text-sm text-gray-400">
                    {line.weightKg.toFixed(3)} kg × ${line.pricePerKg.toFixed(2)}/kg
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-300">${line.totalAmount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {vendorLines.length === 0 && currentWeightKg == null && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-xl">Waiting for first item…</p>
        </div>
      )}
    </div>
  )
}
