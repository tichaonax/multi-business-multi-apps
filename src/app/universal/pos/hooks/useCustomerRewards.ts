'use client'

import { useState, useEffect } from 'react'

export interface CustomerReward {
  id: string
  couponCode: string
  rewardType: 'CREDIT' | 'FREE_WIFI'
  rewardAmount: number
  rewardProductId: string | null
  wifiTokenConfigId: string | null
  status: 'ISSUED' | 'REDEEMED' | 'DEACTIVATED' | 'EXPIRED'
  expiresAt: string
  redeemedAt: string | null
  promo_campaigns: { name: string }
  // Enriched by API
  rewardProduct: { id: string; name: string; basePrice: number } | null
  wifiConfig: { id: string; name: string; durationValue: number; durationUnit: string } | null
}

export function useCustomerRewards(customerId: string | null, businessId: string | null) {
  const [rewards, setRewards] = useState<CustomerReward[]>([])
  const [usedRewards, setUsedRewards] = useState<CustomerReward[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRewards = () => {
    if (!customerId || !businessId) {
      setRewards([])
      setUsedRewards([])
      return
    }
    setLoading(true)
    fetch(`/api/customers/${customerId}/rewards?businessId=${businessId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setRewards(data.data)
          setUsedRewards(data.usedRewards || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRewards()
  }, [customerId, businessId])

  return { rewards, usedRewards, loading, refetch: fetchRewards }
}
