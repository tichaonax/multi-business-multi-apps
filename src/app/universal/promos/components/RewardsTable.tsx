'use client'

const STATUS_STYLES: Record<string, string> = {
  ISSUED:      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  REDEEMED:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  EXPIRED:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  DEACTIVATED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

const STATUS_LABELS: Record<string, string> = {
  ISSUED:      'Issued',
  REDEEMED:    'Redeemed',
  EXPIRED:     'Expired',
  DEACTIVATED: 'Deactivated'
}

interface Reward {
  id: string
  couponCode: string
  rewardType: 'CREDIT' | 'FREE_WIFI'
  rewardAmount: number
  rewardProductId: string | null
  wifiTokenConfigId: string | null
  status: 'ISSUED' | 'REDEEMED' | 'EXPIRED' | 'DEACTIVATED'
  periodYear: number
  periodMonth: number
  periodSpend: number | null
  issuedAt: string
  expiresAt: string
  redeemedAt: string | null
  business_customers: { name: string; phone: string | null; customerNumber: string }
  promo_campaigns: { name: string }
  rewardProduct: { id: string; name: string } | null
  wifiConfig: { id: string; name: string } | null
}

interface RewardsTableProps {
  rewards: Reward[]
  statusFilter: string
  onStatusFilterChange: (s: string) => void
  onDeactivate: (rewardId: string) => void
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function RewardsTable({ rewards, statusFilter, onStatusFilterChange, onDeactivate }: RewardsTableProps) {
  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'ISSUED', 'REDEEMED', 'EXPIRED', 'DEACTIVATED'].map(s => (
          <button
            key={s}
            onClick={() => onStatusFilterChange(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 dark:border-gray-600 text-secondary hover:border-blue-400'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {rewards.length === 0 ? (
        <div className="text-center py-12 text-secondary">
          <p className="text-4xl mb-3">🎫</p>
          <p className="font-medium">No rewards found</p>
          <p className="text-sm mt-1">Run a campaign to generate rewards for eligible customers.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="pb-3 pr-4 font-medium text-secondary">Customer</th>
                <th className="pb-3 pr-4 font-medium text-secondary">Campaign</th>
                <th className="pb-3 pr-4 font-medium text-secondary">Spent</th>
                <th className="pb-3 pr-4 font-medium text-secondary">Reward</th>
                <th className="pb-3 pr-4 font-medium text-secondary">Code</th>
                <th className="pb-3 pr-4 font-medium text-secondary">Expires</th>
                <th className="pb-3 pr-4 font-medium text-secondary">Status</th>
                <th className="pb-3 font-medium text-secondary"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rewards.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-primary">{r.business_customers.name}</div>
                    <div className="text-xs text-secondary">
                      {r.business_customers.customerNumber}
                      {r.business_customers.phone && ` · ${r.business_customers.phone}`}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-primary">{r.promo_campaigns.name}</td>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-primary">
                      {r.periodSpend != null ? `$${Number(r.periodSpend).toFixed(2)}` : '—'}
                    </span>
                    <div className="text-[10px] text-secondary">{MONTH_NAMES[r.periodMonth - 1]} {r.periodYear}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col gap-0.5">
                      {Number(r.rewardAmount) > 0 && (
                        <span className="text-primary">${Number(r.rewardAmount).toFixed(2)} Credit</span>
                      )}
                      {r.rewardProduct && (
                        <span className="text-purple-700 dark:text-purple-400 text-xs">🎁 {r.rewardProduct.name}</span>
                      )}
                      {r.wifiConfig && (
                        <span className="text-blue-700 dark:text-blue-400 text-xs">📶 {r.wifiConfig.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono text-primary">
                      {r.couponCode}
                    </code>
                  </td>
                  <td className="py-3 pr-4 text-secondary text-xs">
                    {new Date(r.expiresAt).toLocaleDateString()}
                    {r.redeemedAt && (
                      <div className="text-green-600 dark:text-green-400">
                        Redeemed {new Date(r.redeemedAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {r.status === 'ISSUED' && (
                      <button
                        onClick={() => onDeactivate(r.id)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline whitespace-nowrap"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
