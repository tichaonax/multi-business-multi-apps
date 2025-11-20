'use client'

import { useState, useEffect, useCallback } from 'react'
import { UniversalOrder, OrderFilters, OrderStats } from '../types'
import { transformOrdersForBusiness } from '../utils'

interface UseOrdersOptions {
  businessId: string
  businessType: string
  autoLoad?: boolean
}

interface UseOrdersReturn {
  orders: UniversalOrder[]
  businessOrders: any[]
  loading: boolean
  error: string | null
  stats: OrderStats | null
  filters: OrderFilters
  setFilters: (filters: OrderFilters) => void
  loadOrders: () => Promise<void>
  refreshOrders: () => Promise<void>
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasMore: boolean
    setPage: (page: number) => void
  }
}

const ITEMS_PER_PAGE = 20

export function useOrders({
  businessId,
  businessType,
  autoLoad = true
}: UseOrdersOptions): UseOrdersReturn {
  const [orders, setOrders] = useState<UniversalOrder[]>([])
  const [businessOrders, setBusinessOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [filters, setFilters] = useState<OrderFilters>({
    searchTerm: '',
    statusFilter: 'all',
    typeFilter: 'all',
    paymentFilter: 'all'
  })

  const loadOrders = useCallback(async () => {
    if (!businessId) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        businessId,
        includeItems: 'true',
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString()
      })

      // Add filters
      if (filters.statusFilter !== 'all') {
        params.set('status', filters.statusFilter)
      }
      if (filters.typeFilter !== 'all') {
        params.set('orderType', filters.typeFilter)
      }
      if (filters.paymentFilter !== 'all') {
        params.set('paymentStatus', filters.paymentFilter)
      }
      if (filters.startDate) {
        params.set('startDate', filters.startDate)
      }
      if (filters.endDate) {
        params.set('endDate', filters.endDate)
      }

      const response = await fetch(`/api/universal/orders?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const transformedOrders = transformOrdersForBusiness(data.data, businessType)
          setOrders(data.data)
          setBusinessOrders(transformedOrders)
          setTotalCount(data.meta?.total || 0)
          setTotalPages(data.meta?.totalPages || 0)

          // Calculate stats
          const todaysOrders = data.data.filter((o: any) => 
            new Date(o.createdAt).toDateString() === new Date().toDateString()
          )
          
          const orderStats: OrderStats = {
            totalOrders: data.meta?.summary?.totalOrders || 0,
            totalRevenue: data.meta?.summary?.totalAmount || 0,
            completedRevenue: data.meta?.summary?.completedRevenue || 0,
            pendingRevenue: data.meta?.summary?.pendingRevenue || 0,
            pendingOrders: data.meta?.summary?.pendingOrders || 0,
            completedToday: todaysOrders.filter((o: any) => o.status === 'COMPLETED').length,
            averageOrderValue: data.meta?.summary?.totalOrders > 0
              ? (data.meta?.summary?.totalAmount || 0) / data.meta?.summary?.totalOrders
              : 0
          }
          setStats(orderStats)
        } else {
          setError(data.error || 'Failed to load orders')
        }
      } else {
        setError('Failed to fetch orders')
      }
    } catch (err) {
      setError('Network error while loading orders')
      console.error('Orders loading error:', err)
    } finally {
      setLoading(false)
    }
  }, [businessId, businessType, currentPage, filters])

  const refreshOrders = useCallback(async () => {
    setCurrentPage(1)
    await loadOrders()
  }, [loadOrders])

  // Auto-load on mount and when dependencies change
  useEffect(() => {
    if (autoLoad && businessId) {
      loadOrders()
    }
  }, [autoLoad, businessId, loadOrders])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const setPage = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  return {
    orders,
    businessOrders,
    loading,
    error,
    stats,
    filters,
    setFilters,
    loadOrders,
    refreshOrders,
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      hasMore: currentPage < totalPages,
      setPage
    }
  }
}