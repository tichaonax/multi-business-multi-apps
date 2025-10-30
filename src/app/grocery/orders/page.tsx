'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

interface Order {
  id: string
  orderNumber: string
  customerName?: string
  customerInfo?: any
  orderType: string
  status: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  paymentStatus: string
  paymentMethod?: string
  notes?: string
  createdAt: string
  updatedAt: string
  items: any[]
  attributes?: any
}

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'PROCESSING', label: 'Processing', color: 'bg-orange-100 text-orange-800' },
  { value: 'READY', label: 'Ready', color: 'bg-green-100 text-green-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
]

const PAYMENT_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PAID', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'PARTIALLY_PAID', label: 'Partial', color: 'bg-orange-100 text-orange-800' },
  { value: 'REFUNDED', label: 'Refunded', color: 'bg-purple-100 text-purple-800' },
  { value: 'FAILED', label: 'Failed', color: 'bg-red-100 text-red-800' }
]

export default function GroceryOrdersPage() {
  const customAlert = useAlert()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        businessId: BUSINESS_ID,
        includeItems: 'true'
      })

      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      if (paymentFilter !== 'all') {
        params.set('paymentStatus', paymentFilter)
      }

      const response = await fetch(`/api/universal/orders?${params}`)
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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/universal/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          await loadOrders()
        } else {
          await customAlert({ title: 'Update Failed', description: 'Failed to update order status' })
        }
      } else {
        await customAlert({ title: 'Update Failed', description: 'Failed to update order status' })
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      await customAlert({ title: 'Update Error', description: 'Error updating order status' })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = ORDER_STATUSES.find(s => s.value === status)
    return statusInfo ? (
      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    )
  }

  const getPaymentBadge = (paymentStatus: string) => {
    const statusInfo = PAYMENT_STATUSES.find(s => s.value === paymentStatus)
    return statusInfo ? (
      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">{paymentStatus}</Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getCustomerName = (order: Order) => {
    return order.attributes?.customerInfo?.name ||
           order.customerName ||
           'Walk-in Customer'
  }

  return (
    <BusinessTypeRoute requiredBusinessType="grocery">
      <ContentLayout
        title="Grocery Store Orders"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Grocery', href: '/grocery' },
          { label: 'Orders', isActive: true }
        ]}
      >
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-green-600">{orders.length}</p>
                </div>
                <div className="text-2xl">🛒</div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      orders
                        .filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString())
                        .reduce((sum, o) => sum + o.totalAmount, 0)
                    )}
                  </p>
                </div>
                <div className="text-2xl">💰</div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Orders</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {orders.filter(o => o.status === 'PENDING').length}
                  </p>
                </div>
                <div className="text-2xl">⏳</div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {orders.filter(o =>
                      o.status === 'COMPLETED' &&
                      new Date(o.createdAt).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
                <div className="text-2xl">✅</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Statuses</option>
                  {ORDER_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Payment Statuses</option>
                  {PAYMENT_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button onClick={loadOrders} className="bg-green-600 hover:bg-green-700">
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>

              {loading ? (
                <div className="text-center py-8">Loading orders...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">{error}</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🛒</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No orders found</h4>
                  <p className="text-gray-600">Orders will appear here when customers make purchases</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold">{order.orderNumber}</h4>
                            {getStatusBadge(order.status)}
                            {getPaymentBadge(order.paymentStatus)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Customer: {getCustomerName(order)} •
                            Created: {new Date(order.createdAt).toLocaleString()}
                          </div>
                          {order.attributes?.customerInfo?.loyaltyNumber && (
                            <div className="text-sm text-green-600">
                              Loyalty: {order.attributes.customerInfo.loyaltyNumber} ({order.attributes.customerInfo.tier})
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.paymentMethod}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">Items:</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {order.items.map((item, index) => (
                            <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                              <div className="font-medium">
                                {item.productVariant?.product?.name || `Item ${item.productVariantId}`}
                              </div>
                              <div className="text-gray-600">
                                Qty: {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
                              </div>
                              {item.attributes?.organicCertified && (
                                <div className="text-green-600 text-xs">🌱 Organic</div>
                              )}
                              {item.attributes?.snapEligible && (
                                <div className="text-blue-600 text-xs">🎫 SNAP Eligible</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-3 border-t">
                        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'PROCESSING')}
                              disabled={order.status === 'PROCESSING'}
                            >
                              Process
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}