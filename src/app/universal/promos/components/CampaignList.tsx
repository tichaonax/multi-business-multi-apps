'use client'

import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  description: string | null
  spendThreshold: number
  rewardType: 'CREDIT' | 'FREE_WIFI'
  rewardAmount: number
  rewardProductId: string | null
  wifiTokenConfigId: string | null
  rewardValidDays: number
  isActive: boolean
  _count: { customer_rewards: number }
}

interface CampaignListProps {
  campaigns: Campaign[]
  onEdit: (campaign: Campaign) => void
  onToggle: (campaign: Campaign) => void
  onDelete: (campaign: Campaign) => void
}

export function CampaignList({ campaigns, onEdit, onToggle, onDelete }: CampaignListProps) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-secondary">
        <p className="text-4xl mb-3">🎁</p>
        <p className="font-medium">No campaigns yet</p>
        <p className="text-sm mt-1">Create your first campaign to start rewarding loyal customers.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
            <th className="pb-3 pr-4 font-medium text-secondary">Campaign</th>
            <th className="pb-3 pr-4 font-medium text-secondary">Threshold</th>
            <th className="pb-3 pr-4 font-medium text-secondary">Reward</th>
            <th className="pb-3 pr-4 font-medium text-secondary">Valid Days</th>
            <th className="pb-3 pr-4 font-medium text-secondary">Rewards Issued</th>
            <th className="pb-3 pr-4 font-medium text-secondary">Status</th>
            <th className="pb-3 font-medium text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {campaigns.map(c => (
            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="py-3 pr-4">
                <div className="font-medium text-primary">{c.name}</div>
                {c.description && (
                  <div className="text-xs text-secondary mt-0.5 truncate max-w-[200px]">{c.description}</div>
                )}
              </td>
              <td className="py-3 pr-4 text-primary">${Number(c.spendThreshold).toFixed(2)}/mo</td>
              <td className="py-3 pr-4">
                <div className="flex flex-col gap-0.5">
                  {Number(c.rewardAmount) > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      ${Number(c.rewardAmount).toFixed(2)} Credit
                    </span>
                  )}
                  {c.rewardProductId && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                      🎁 Free Item
                    </span>
                  )}
                  {c.wifiTokenConfigId && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      📶 Free WiFi
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 pr-4 text-primary">{c.rewardValidDays}d</td>
              <td className="py-3 pr-4 text-primary">{c._count.customer_rewards}</td>
              <td className="py-3 pr-4">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  c.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(c)}
                    title="Edit"
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onToggle(c)}
                    title={c.isActive ? 'Deactivate' : 'Activate'}
                    className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 rounded"
                  >
                    {c.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onDelete(c)}
                    title="Delete"
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
