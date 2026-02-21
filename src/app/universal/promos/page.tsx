'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Play, RefreshCw } from 'lucide-react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { CampaignList } from './components/CampaignList'
import { CampaignForm } from './components/CampaignForm'
import { RewardsTable } from './components/RewardsTable'

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
  rewardProduct: { id: string; name: string; basePrice: number } | null
  wifiConfig: { id: string; name: string; durationMinutes: number } | null
}

type Tab = 'campaigns' | 'rewards'

export default function PromosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId } = useBusinessPermissionsContext()
  const customAlert = useAlert()
  const confirm = useConfirm()

  const [activeTab, setActiveTab] = useState<Tab>('campaigns')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [loadingRewards, setLoadingRewards] = useState(false)
  const [running, setRunning] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [rewardStatusFilter, setRewardStatusFilter] = useState('all')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
  }, [session, status, router])

  const fetchCampaigns = useCallback(async () => {
    if (!currentBusinessId) return
    setLoadingCampaigns(true)
    try {
      const res = await fetch(`/api/business/${currentBusinessId}/promo-campaigns`)
      const data = await res.json()
      if (data.success) setCampaigns(data.data)
    } catch {
      // silent fail — table stays empty
    } finally {
      setLoadingCampaigns(false)
    }
  }, [currentBusinessId])

  const fetchRewards = useCallback(async () => {
    if (!currentBusinessId) return
    setLoadingRewards(true)
    try {
      const params = new URLSearchParams()
      if (rewardStatusFilter !== 'all') params.set('status', rewardStatusFilter)
      const res = await fetch(`/api/business/${currentBusinessId}/customer-rewards?${params}`)
      const data = await res.json()
      if (data.success) setRewards(data.data)
    } catch {
      // silent fail
    } finally {
      setLoadingRewards(false)
    }
  }, [currentBusinessId, rewardStatusFilter])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])
  useEffect(() => { if (activeTab === 'rewards') fetchRewards() }, [activeTab, fetchRewards])

  const handleGenerateRewards = async () => {
    if (!currentBusinessId) return
    const ok = await confirm({
      title: 'Generate Rewards',
      description: 'Generate rewards for all customers who have met this month\'s spending threshold?',
      confirmText: 'Generate',
      cancelText: 'Cancel'
    })
    if (!ok) return

    setRunning(true)
    try {
      const res = await fetch(`/api/business/${currentBusinessId}/promo-campaigns/run`, { method: 'POST' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      void customAlert({
        title: 'Rewards Generated',
        description: `${data.data.message} for ${data.data.periodYear}-${String(data.data.periodMonth).padStart(2, '0')}.`
      })
      fetchCampaigns()
    } catch (err: unknown) {
      void customAlert({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to run campaigns' })
    } finally {
      setRunning(false)
    }
  }

  const handleToggle = async (campaign: Campaign) => {
    try {
      const res = await fetch(`/api/business/${currentBusinessId}/promo-campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !campaign.isActive })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      fetchCampaigns()
    } catch (err: unknown) {
      void customAlert({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update campaign' })
    }
  }

  const handleDelete = async (campaign: Campaign) => {
    const ok = await confirm({
      title: 'Delete Campaign',
      description: `Delete campaign "${campaign.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })
    if (!ok) return

    try {
      const res = await fetch(`/api/business/${currentBusinessId}/promo-campaigns/${campaign.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      if (data.data.deactivated) {
        void customAlert({ title: 'Campaign Deactivated', description: 'Campaign has issued rewards and was deactivated instead of deleted.' })
      }
      fetchCampaigns()
    } catch (err: unknown) {
      void customAlert({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete campaign' })
    }
  }

  const handleDeactivateReward = async (rewardId: string) => {
    const ok = await confirm({
      title: 'Deactivate Reward',
      description: 'Deactivate this reward? The customer will no longer be able to use it.',
      confirmText: 'Deactivate',
      cancelText: 'Cancel'
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/business/${currentBusinessId}/customer-rewards/${rewardId}`, { method: 'PATCH' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      fetchRewards()
    } catch (err: unknown) {
      void customAlert({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to deactivate reward' })
    }
  }

  const handleFormSave = () => {
    setShowForm(false)
    setEditingCampaign(null)
    fetchCampaigns()
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'campaigns', label: 'Campaigns' },
    { key: 'rewards', label: 'Issued Rewards' }
  ]

  return (
    <ContentLayout
      title="Customer Promos"
      subtitle="Create monthly spend campaigns and reward loyal customers"
      breadcrumb={[{ label: 'Tools' }, { label: 'Customer Promos', isActive: true }]}
      headerActions={
        activeTab === 'campaigns' ? (
          <div className="flex gap-2">
            <button
              onClick={handleGenerateRewards}
              disabled={running || !currentBusinessId}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Generating...' : 'Generate Rewards'}
            </button>
            <button
              onClick={() => { setEditingCampaign(null); setShowForm(true) }}
              disabled={!currentBusinessId}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        ) : (
          <button
            onClick={fetchRewards}
            disabled={loadingRewards}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRewards ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )
      }
    >
      {!currentBusinessId && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-400">
          Please select a business to manage promo campaigns.
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          {loadingCampaigns ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <CampaignList
              campaigns={campaigns}
              onEdit={c => { setEditingCampaign(c); setShowForm(true) }}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          {loadingRewards ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <RewardsTable
              rewards={rewards}
              statusFilter={rewardStatusFilter}
              onStatusFilterChange={s => setRewardStatusFilter(s)}
              onDeactivate={handleDeactivateReward}
            />
          )}
        </div>
      )}

      {/* Campaign Form Modal */}
      {showForm && currentBusinessId && (
        <CampaignForm
          campaign={editingCampaign}
          businessId={currentBusinessId}
          onSave={handleFormSave}
          onClose={() => { setShowForm(false); setEditingCampaign(null) }}
        />
      )}
    </ContentLayout>
  )
}
