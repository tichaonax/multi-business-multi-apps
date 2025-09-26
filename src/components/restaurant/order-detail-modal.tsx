'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  total: number
}

interface Order {
  id: string
  orderNumber: string
  status?: string
  totalAmount: number
  subtotal: number
  taxAmount: number
  tipAmount: number
  tableNumber?: string | number
  customerName?: string
  customerPhone?: string
  items: OrderItem[]
  notes?: string
  createdAt: string
  updatedAt: string
  paymentStatus?: string
  paymentMethod?: string
  orderType?: string
  estimatedReadyTime?: string
  customerEmail?: string
  businessId?: string
  business?: {
    businessName: string
    businessType: string
  }
  user?: {
    name: string
    email: string
  }
}

interface OrderDetailModalProps {
  orderId: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (updatedOrder: Order) => void
}

export function OrderDetailModal({ orderId, isOpen, onClose, onUpdate }: OrderDetailModalProps) {
  const { data: session } = useSession()
  const { format: globalDateFormat } = useDateFormat()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const fetchInFlightRef = useRef(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    status: '',
    customerName: '',
    customerPhone: '',
    tableNumber: '',
    notes: ''
  })

  const currentUser = session?.user as any

  // Helper function to check if editing is allowed
  const canEdit = () => {
    if (!currentUser || !order) return false
    if (!hasPermission(currentUser, 'canManageOrders' as any, order.businessId)) return false
    if (isSystemAdmin(currentUser)) return true

    // Check if user has access to this order's business
    const userBusinessIds = (currentUser.businessMemberships || []).map((m: any) => m.businessId)
    return order.businessId && userBusinessIds.includes(order.businessId)
  }

  const isEditAllowed = canEdit()

  // Helper function to format dates according to global settings
  const formatDate = (dateString: string) => formatDateByFormat(dateString, globalDateFormat)
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const formattedDate = formatDateByFormat(dateString, globalDateFormat)
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return `${formattedDate} ${formattedTime}`
  }

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder()
    }
  }, [isOpen, orderId])

  useEffect(() => {
    if (order) {
      setEditForm({
        status: order.status || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        tableNumber: order.tableNumber ? String(order.tableNumber) : '',
        notes: order.notes || ''
      })
    }
  }, [order])

  const fetchOrder = async () => {
    if (!orderId) return

    try {
      if (fetchInFlightRef.current) return
      fetchInFlightRef.current = true
      setLoading(true)
      const response = await fetch(`/api/restaurant/orders/${orderId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setOrder(result.data)
        } else {
          console.error('Invalid response format:', result)
        }
      } else {
        console.error('Failed to fetch order details:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
      fetchInFlightRef.current = false
    }
  }

  if (!isOpen) return null

  const handleSave = async () => {
    if (!isEditAllowed || !order) return

    try {
      setLoading(true)
      const response = await fetch(`/api/restaurant/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          customerName: editForm.customerName,
          customerPhone: editForm.customerPhone,
          tableNumber: editForm.tableNumber,
          notes: editForm.notes
        })
      })

      if (response.ok) {
        const updatedOrder = await response.json()
        setOrder(updatedOrder)
        onUpdate?.(updatedOrder)
        setIsEditing(false)
      } else {
        console.error('Failed to update order')
      }
    } catch (error) {
      console.error('Error updating order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (order) {
      setEditForm({
        status: order.status || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        tableNumber: order.tableNumber ? String(order.tableNumber) : '',
        notes: order.notes || ''
      })
    }
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
      case 'preparing': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
      case 'ready': return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="card max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">
              {isEditing ? 'Edit Order' : 'Order Details'}
            </h2>
            <div className="flex gap-2">
              {!isEditing && isEditAllowed && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-primary bg-blue-600 hover:bg-blue-700"
                >
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-secondary">Loading order details...</div>
            </div>
          ) : !order ? (
            <div className="text-red-600 dark:text-red-400 text-center py-8">
              Failed to load order details
            </div>
          ) : (
            <>
              {/* Order Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Order Number</h3>
                  <p className="text-lg font-bold text-primary">#{order.orderNumber}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Status</h3>
                  {isEditing ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 text-sm font-medium rounded ${getStatusColor(order.status)}`}>
                      {order.status || 'Unknown'}
                    </span>
                  )}
                </div>
              </div>

              {/* Customer Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Customer Name</h3>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.customerName}
                      onChange={(e) => setEditForm({...editForm, customerName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Customer name"
                    />
                  ) : (
                    <p className="text-primary">{order.customerName || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Table Number</h3>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.tableNumber}
                      onChange={(e) => setEditForm({...editForm, tableNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Table number"
                    />
                  ) : (
                    <p className="text-primary">{order.tableNumber || 'Not assigned'}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-medium text-primary mb-3">Order Items</h3>
                <div className="space-y-2">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="flex-1">
                        <p className="font-medium text-primary">{item.name}</p>
                        <p className="text-sm text-secondary">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                      </div>
                      <p className="font-medium text-primary">${item.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Total */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-secondary">Subtotal:</span>
                    <span className="text-primary">${(order.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {(order.taxAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Tax:</span>
                      <span className="text-primary">${(order.taxAmount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(order.tipAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Tip:</span>
                      <span className="text-primary">${(order.tipAmount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span className="text-primary">Total:</span>
                    <span className="text-primary">${(order.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-sm font-medium text-secondary mb-1">Notes</h3>
                {isEditing ? (
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Order notes..."
                  />
                ) : (
                  <p className="text-primary">{order.notes || 'No notes'}</p>
                )}
              </div>

              {/* Business Information */}
              {order.business && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-700 rounded-md">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Business</h3>
                  <p className="text-blue-900 dark:text-blue-100">{order.business.businessName}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 capitalize">{order.business.businessType}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-xs text-secondary">
                  <div>
                    <span className="block">Created</span>
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block">Last Modified</span>
                    <span>{formatDateTime(order.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Permission Messages */}
              {!isEditAllowed && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border border-yellow-200 dark:border-yellow-700 rounded-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-yellow-600 dark:text-yellow-400">🔒</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Access Restricted
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        You don't have permission to edit this order or it belongs to a business you don't have access to.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}