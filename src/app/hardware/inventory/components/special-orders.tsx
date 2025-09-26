'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface SpecialOrder {
  id: string
  orderNumber: string
  customerName: string
  customerType: 'retail' | 'contractor'
  productName: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  supplier: string
  estimatedArrival: string
  status: 'ORDERED' | 'SHIPPED' | 'ARRIVED' | 'COMPLETED'
  notes?: string
  depositAmount?: number
  depositPaid: boolean
}

interface HardwareSpecialOrdersProps {
  businessId: string
}

export function HardwareSpecialOrders({ businessId }: HardwareSpecialOrdersProps) {
  const { formatCurrency, formatDate } = useBusinessContext()
  const [specialOrders, setSpecialOrders] = useState<SpecialOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sampleOrders: SpecialOrder[] = [
      {
        id: 'so1',
        orderNumber: 'SO-2024-001',
        customerName: 'ABC Construction',
        customerType: 'contractor',
        productName: 'Custom Steel I-Beam 20ft',
        quantity: 8,
        unit: 'each',
        unitPrice: 245.99,
        totalPrice: 1967.92,
        supplier: 'MetalWorks Inc.',
        estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ORDERED',
        notes: 'Custom length and specifications provided',
        depositAmount: 590.38,
        depositPaid: true
      },
      {
        id: 'so2',
        orderNumber: 'SO-2024-002',
        customerName: 'Johnson Electrical',
        customerType: 'contractor',
        productName: '500MCM Aluminum Wire 1000ft',
        quantity: 2,
        unit: 'reel',
        unitPrice: 1289.99,
        totalPrice: 2579.98,
        supplier: 'Electrical Supply Co.',
        estimatedArrival: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'SHIPPED',
        depositAmount: 774.00,
        depositPaid: true
      }
    ]

    setSpecialOrders(sampleOrders)
    setLoading(false)
  }, [businessId])

  const getStatusConfig = (status: string) => {
    const configs = {
      ORDERED: { color: 'bg-blue-100 text-blue-800', icon: '📋' },
      SHIPPED: { color: 'bg-yellow-100 text-yellow-800', icon: '🚛' },
      ARRIVED: { color: 'bg-green-100 text-green-800', icon: '📦' },
      COMPLETED: { color: 'bg-gray-100 text-gray-800', icon: '✅' }
    }
    return configs[status as keyof typeof configs] || configs.ORDERED
  }

  if (loading) {
    return <div className="animate-pulse">Loading special orders...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Special Orders</h2>
          <p className="text-sm text-gray-600 mt-1">Custom orders and supplier coordination</p>
        </div>
        <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
          Create Special Order
        </button>
      </div>

      <div className="space-y-4">
        {specialOrders.map((order) => {
          const statusConfig = getStatusConfig(order.status)

          return (
            <div key={order.id} className="bg-white border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{order.orderNumber}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.icon} {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Customer: <span className="font-medium">{order.customerName}</span>
                    <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      {order.customerType}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-600">
                    {formatCurrency(order.totalPrice)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Est. arrival: {formatDate(new Date(order.estimatedArrival))}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">{order.productName}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <div className="font-medium">{order.quantity} {order.unit}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Unit Price:</span>
                    <div className="font-medium">{formatCurrency(order.unitPrice)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Supplier:</span>
                    <div className="font-medium">{order.supplier}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Deposit:</span>
                    <div className={`font-medium ${order.depositPaid ? 'text-green-600' : 'text-red-600'}`}>
                      {order.depositAmount ? formatCurrency(order.depositAmount) : 'None'}
                      {order.depositAmount && (order.depositPaid ? ' ✓ Paid' : ' Pending')}
                    </div>
                  </div>
                </div>

                {order.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-gray-600 text-sm">Notes:</span>
                    <div className="text-sm text-gray-800 mt-1">{order.notes}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {order.status === 'ORDERED' && 'Waiting for supplier confirmation'}
                  {order.status === 'SHIPPED' && 'In transit from supplier'}
                  {order.status === 'ARRIVED' && 'Ready for customer pickup'}
                  {order.status === 'COMPLETED' && 'Order completed'}
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                    Contact Customer
                  </button>
                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">🛠️ Special Order Process</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Custom Items:</strong> Products not in regular inventory</p>
          <p>• <strong>Deposit Required:</strong> 30% deposit for orders over $500</p>
          <p>• <strong>Lead Times:</strong> Varies by supplier, typically 1-4 weeks</p>
          <p>• <strong>Contractor Priority:</strong> Faster processing for contractor accounts</p>
        </div>
      </div>
    </div>
  )
}