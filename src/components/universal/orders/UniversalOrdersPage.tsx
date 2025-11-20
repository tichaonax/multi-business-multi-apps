'use client'

import { useState } from 'react'
import { useOrders } from './hooks/useOrders'
import { useOrderActions } from './hooks/useOrderActions'
import { OrderStats } from './OrderStats'
import { OrderFilters } from './OrderFilters'
import { OrderCard } from './OrderCard'
import { OrderFilters as OrderFiltersType } from './types'
import { BUSINESS_ORDER_CONFIGS } from './BusinessOrderConfig'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface UniversalOrdersPageProps {
  businessType: string
}

export function UniversalOrdersPage({ businessType }: UniversalOrdersPageProps) {
  const { currentBusinessId } = useBusinessPermissionsContext()

  const { businessOrders, stats, loading, error, refreshOrders, filters, setFilters, pagination } = useOrders({
    businessId: currentBusinessId || '',
    businessType,
    autoLoad: true
  })

  const { updateOrderStatus, printReceipt } = useOrderActions({
    businessId: currentBusinessId || '',
    businessType,
    onOrderUpdated: refreshOrders
  })

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status)
      refreshOrders() // Refresh the orders list
    } catch (error) {
      console.error('Failed to update order status:', error)
      // You might want to show a toast notification here
    }
  }

  const handlePrintReceipt = async (order: any) => {
    try {
      await printReceipt(order.id)
    } catch (error) {
      console.error('Failed to print receipt:', error)
      // You might want to show a toast notification here
    }
  }

  const config = BUSINESS_ORDER_CONFIGS[businessType]

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error loading orders
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
          {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Orders
        </h1>
        <p className="text-secondary">
          Manage and track all {businessType} orders
        </p>
      </div>

      {/* Stats */}
      <OrderStats stats={stats} loading={loading} businessType={businessType} />

      {/* Filters */}
      <OrderFilters
        filters={filters}
        onFiltersChange={setFilters}
        businessType={businessType}
      />

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 sm:p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : businessOrders.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-primary mb-2">No orders found</h3>
            <p className="text-secondary">
              {Object.keys(filters).length > 0
                ? 'Try adjusting your filters to see more orders.'
                : `No ${businessType} orders have been created yet.`
              }
            </p>
          </div>
        ) : (
          <>
            {businessOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
                onPrintReceipt={handlePrintReceipt}
                businessType={businessType}
              />
            ))}

            {/* Pagination */}
            {pagination.totalCount > 10 && (
              <div className="flex justify-center mt-6">
                <div className="flex space-x-2">
                  <button
                    onClick={() => pagination.setPage(Math.max(1, pagination.currentPage - 1))}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>

                  <span className="px-3 py-2 text-secondary">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => pagination.setPage(pagination.currentPage + 1)}
                    disabled={!pagination.hasMore}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}