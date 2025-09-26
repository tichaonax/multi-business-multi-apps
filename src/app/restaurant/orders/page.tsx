'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface OrderItem {
  id: string
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product?: {
    name: string
    description?: string
  }
  productName?: string
  variant?: {
    name: string
  }
}

interface Order {
  id: string
  orderNumber: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  tableNumber?: string
  orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY'
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED'
  subtotal: number
  taxAmount: number
  tipAmount: number
  totalAmount: number
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED'
  paymentMethod?: string
  notes?: string
  estimatedReadyTime?: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'PREPARING', label: 'Preparing', color: 'bg-orange-100 text-orange-800' },
  { value: 'READY', label: 'Ready', color: 'bg-green-100 text-green-800' },
  { value: 'SERVED', label: 'Served', color: 'bg-purple-100 text-purple-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
]

const ORDER_TYPES = [
  { value: 'DINE_IN', label: '🍽️ Dine In', icon: '🍽️' },
  { value: 'TAKEOUT', label: '🥡 Takeout', icon: '🥡' },
  { value: 'DELIVERY', label: '🚚 Delivery', icon: '🚚' }
]

export default function RestaurantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    loadOrdersGuarded()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/restaurant/orders')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setOrders(data.data)
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
  }

  // Prevent duplicate concurrent loads (simple in-flight guard)
  const inFlightRef = useRef(false)

  const loadOrdersGuarded = async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      await loadOrders()
    } finally {
      inFlightRef.current = false
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/restaurant/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const result = await response.json()
      if (response.ok && result.success) {
        setOrders(prev =>
          prev.map(order =>
            order.id === orderId
              ? { ...order, status: newStatus as Order['status'], updatedAt: new Date().toISOString() }
              : order
          )
        )
      } else {
        setError(result.error || 'Failed to update order status')
      }
    } catch (err) {
      setError('Network error while updating order status')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status)
    return statusConfig || ORDER_STATUSES[0]
  }

    const getOrderTypeIcon = (type: string, isKitchen?: boolean) => {
    if (isKitchen) return '👩‍🍳'
    const typeConfig = ORDER_TYPES.find(t => t.value === type)
    return typeConfig?.icon || '📋'
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.includes(searchTerm) ||
      order.tableNumber?.includes(searchTerm)

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesType = typeFilter === 'all' || order.orderType === typeFilter
    const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter

    return matchesSearch && matchesStatus && matchesType && matchesPayment
  })

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage)

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <BusinessTypeRoute requiredBusinessType="restaurant">
        <ContentLayout
          title="Order Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Restaurant', href: '/restaurant' },
            { label: 'Orders', isActive: true }
          ]}
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading orders...</p>
            </div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    )
  }

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="Order Management"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Restaurant', href: '/restaurant' },
          { label: 'Orders', isActive: true }
        ]}
      >
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="card p-3 sm:p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <span className="text-xl sm:text-2xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary">Total Orders</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">{orders.length}</p>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <span className="text-xl sm:text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary">Preparing</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {orders.filter(o => o.status === 'PREPARING').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <span className="text-xl sm:text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary">Ready</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === 'READY').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <span className="text-xl sm:text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary">Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  {formatCurrency(orders.reduce((sum, o) => sum + o.totalAmount, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-primary">
              Orders ({filteredOrders.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={loadOrdersGuarded} variant="outline" disabled={loading}>
              🔄 Refresh
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-red-400">❌</span>
              <span className="text-red-800 dark:text-red-200">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card p-3 sm:p-4 mb-6 bg-white dark:bg-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Search Orders
              </label>
              <Input
                type="text"
                placeholder="Order #, customer, phone, table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-primary dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                {ORDER_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Order Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-primary dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Types</option>
                {ORDER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Payment Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Payment
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-primary dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Payments</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setTypeFilter('all')
                  setPaymentFilter('all')
                  setCurrentPage(1)
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {paginatedOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-primary mb-2">No orders found</h3>
            <p className="text-secondary">
              {orders.length === 0
                ? "No orders have been placed yet"
                : "Try adjusting your search criteria"
              }
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden bg-white dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Order Details
                    </th>
                    <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="page-background divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedOrders.map((order) => {
                    const statusConfig = getStatusBadge(order.status)
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-xl sm:text-2xl mr-3">
                              {getOrderTypeIcon(order.orderType, (order as any).isKitchenTicket || ((order.orderType as any) === 'KITCHEN_TICKET'))}
                            </span>
                            <div>
                              <div className="text-sm font-medium text-primary">
                                {order.orderNumber}
                              </div>
                              <div className="text-sm text-secondary">
                                {formatTime(order.createdAt)}
                              </div>
                              {order.tableNumber && (
                                <div className="text-xs text-secondary">
                                  Table {order.tableNumber}
                                </div>
                              )}
                              {/* Show customer info on mobile since Customer column is hidden */}
                              <div className="sm:hidden mt-1 text-xs text-secondary">
                                {order.customerName || 'Walk-in'}
                                {order.customerPhone && (
                                  <div>{order.customerPhone}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-primary">
                            {order.customerName || 'Walk-in'}
                          </div>
                          {order.customerPhone && (
                            <div className="text-sm text-secondary">
                              {order.customerPhone}
                            </div>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-3 sm:px-6 py-4">
                          <div className="text-sm text-primary">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-secondary max-w-xs truncate">
                            {order.items.map(item =>
                              `${item.quantity}x ${item.productName || item.product?.name || 'Unknown Item'}`
                            ).join(', ')}
                          </div>
                          {order.notes && (
                            <div className="text-xs text-blue-600 mt-1">
                              📝 {order.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-primary">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          <div className="text-xs text-secondary">
                            {order.paymentStatus === 'PAID' ? '✅ Paid' :
                             order.paymentStatus === 'PENDING' ? '⏳ Pending' :
                             order.paymentStatus}
                          </div>
                          {/* Show item count on mobile since Items column is hidden */}
                          <div className="md:hidden text-xs text-secondary mt-1">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                          {order.estimatedReadyTime && (
                            <div className="text-xs text-gray-500 mt-1">
                              ⏱️ {order.estimatedReadyTime}
                            </div>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            {order.status === 'PENDING' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Confirm
                              </Button>
                            )}
                            {order.status === 'CONFIRMED' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                                className="bg-orange-600 hover:bg-orange-700"
                              >
                                Start
                              </Button>
                            )}
                            {order.status === 'PREPARING' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'READY')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Ready
                              </Button>
                            )}
                            {order.status === 'READY' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'SERVED')}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                Served
                              </Button>
                            )}
                            {order.status === 'SERVED' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                                className="bg-gray-600 hover:bg-gray-700"
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="page-background px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-secondary">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(startIndex + itemsPerPage, filteredOrders.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredOrders.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <Button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        className="rounded-r-none"
                      >
                        Previous
                      </Button>
                      {[...Array(totalPages)].map((_, i) => (
                        <Button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          variant={currentPage === i + 1 ? "default" : "outline"}
                          className="rounded-none"
                        >
                          {i + 1}
                        </Button>
                      ))}
                      <Button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        className="rounded-l-none"
                      >
                        Next
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ContentLayout>
    </BusinessTypeRoute>
  )
}