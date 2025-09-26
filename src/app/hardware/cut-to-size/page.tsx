'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useState, useEffect } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'hardware-demo-business'

interface CutOrder {
  id: string
  customerName: string
  material: string
  dimensions: string
  quantity: number
  cost: number
  status: 'pending' | 'in_progress' | 'completed' | 'ready'
  dueDate: string
  createdAt: string
}

function HardwareCutToSizeContent() {
  const [orders, setOrders] = useState<CutOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // Sample cut-to-size orders
  const sampleOrders: CutOrder[] = [
    {
      id: '1',
      customerName: 'John Smith Construction',
      material: '2x4 Pine Lumber',
      dimensions: '8ft lengths cut to 6ft 3in',
      quantity: 12,
      cost: 48.50,
      status: 'completed',
      dueDate: '2024-01-15',
      createdAt: '2024-01-10'
    },
    {
      id: '2',
      customerName: 'Sarah Wilson',
      material: '3/4" Plywood',
      dimensions: '4x8 sheet cut to (3) 2x8 pieces',
      quantity: 1,
      cost: 25.00,
      status: 'ready',
      dueDate: '2024-01-16',
      createdAt: '2024-01-12'
    },
    {
      id: '3',
      customerName: 'ABC Contractors',
      material: 'Pressure Treated 4x4',
      dimensions: '12ft cut to (4) 3ft posts',
      quantity: 3,
      cost: 72.00,
      status: 'in_progress',
      dueDate: '2024-01-18',
      createdAt: '2024-01-14'
    }
  ]

  useEffect(() => {
    setOrders(sampleOrders)
  }, [])

  const stats = {
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    inProgress: orders.filter(o => o.status === 'in_progress').length,
    readyForPickup: orders.filter(o => o.status === 'ready').length,
    totalRevenue: orders.reduce((sum, order) => sum + order.cost, 0)
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Orders', value: stats.pendingOrders.toString(), icon: '⏳', color: 'text-orange-600' },
          { label: 'In Progress', value: stats.inProgress.toString(), icon: '🔨', color: 'text-blue-600' },
          { label: 'Ready for Pickup', value: stats.readyForPickup.toString(), icon: '✅', color: 'text-green-600' },
          { label: 'Today\'s Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: '💰', color: 'text-purple-600' }
        ].map((stat, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className="text-3xl opacity-20">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-3 border border-orange-200 dark:border-orange-800">
          <div className="text-orange-600 font-medium text-sm">📏 Precision Cutting</div>
          <div className="text-xs text-orange-600 dark:text-orange-400">Accurate measurements & cuts</div>
        </div>
        <div className="card p-3 border border-orange-200 dark:border-orange-800">
          <div className="text-orange-600 font-medium text-sm">📋 Order Tracking</div>
          <div className="text-xs text-orange-600 dark:text-orange-400">Real-time status updates</div>
        </div>
        <div className="card p-3 border border-orange-200 dark:border-orange-800">
          <div className="text-orange-600 font-medium text-sm">💼 Contractor Discounts</div>
          <div className="text-xs text-orange-600 dark:text-orange-400">Volume pricing available</div>
        </div>
        <div className="card p-3 border border-orange-200 dark:border-orange-800">
          <div className="text-orange-600 font-medium text-sm">📞 Rush Orders</div>
          <div className="text-xs text-orange-600 dark:text-orange-400">Same-day service available</div>
        </div>
      </div>

      {/* Orders Management */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-primary">Cut-to-Size Orders</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <span>➕</span>
              New Cut Order
            </button>
          </div>
        </div>

        {/* Orders Grid - Mobile Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="card p-4 sm:p-6 hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-primary">{order.customerName}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  order.status === 'ready' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  order.status === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div>
                  <strong className="text-primary">Material:</strong>
                  <p className="text-secondary">{order.material}</p>
                </div>
                <div>
                  <strong className="text-primary">Specifications:</strong>
                  <p className="text-secondary">{order.dimensions}</p>
                </div>
                <div className="flex justify-between">
                  <span><strong>Quantity:</strong> {order.quantity}</span>
                  <span><strong>Cost:</strong> ${order.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span><strong>Due:</strong> {new Date(order.dueDate).toLocaleDateString()}</span>
                  <span className="text-xs text-secondary">Order #{order.id}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                  📋 Details
                </button>
                {order.status === 'ready' && (
                  <button className="flex-1 text-center px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                    ✅ Mark Picked Up
                  </button>
                )}
                {order.status === 'pending' && (
                  <button className="flex-1 text-center px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700">
                    🔨 Start Cutting
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✂️</div>
            <h3 className="text-lg font-semibold text-primary mb-2">No cut orders found</h3>
            <p className="text-secondary mb-4">Create your first custom cutting order to get started.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              ➕ Create First Order
            </button>
          </div>
        )}
      </div>

      {/* Services & Capabilities */}
      <div className="card p-6">
        <h3 className="font-semibold text-primary mb-4">Cut-to-Size Services & Capabilities</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-semibold text-primary mb-3">🪵 Lumber Cutting</h4>
            <ul className="space-y-1 text-sm text-secondary">
              <li>• Dimensional lumber (2x4, 2x6, 2x8, etc.)</li>
              <li>• Pressure treated lumber</li>
              <li>• Hardwood boards</li>
              <li>• Trim and molding</li>
              <li>• Precision cuts to 1/16"</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary mb-3">📋 Sheet Materials</h4>
            <ul className="space-y-1 text-sm text-secondary">
              <li>• Plywood (1/4" to 3/4")</li>
              <li>• OSB and particle board</li>
              <li>• MDF and hardboard</li>
              <li>• Drywall sheets</li>
              <li>• Custom panel sizing</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary mb-3">🔧 Special Services</h4>
            <ul className="space-y-1 text-sm text-secondary">
              <li>• Angle cuts and bevels</li>
              <li>• Dadoes and rabbets</li>
              <li>• Rip cuts for width</li>
              <li>• Cross cuts for length</li>
              <li>• Rush same-day service</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HardwareCutToSizePage() {
  return (
    <BusinessProvider businessId={BUSINESS_ID}>
      <BusinessTypeRoute requiredBusinessType="hardware">
        <ContentLayout
          title="✂️ Cut-to-Size Services"
          subtitle="Custom cutting and measurement services for lumber and materials"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Hardware Store', href: '/hardware' },
            { label: 'Cut-to-Size', isActive: true }
          ]}
        >
          <HardwareCutToSizeContent />
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}