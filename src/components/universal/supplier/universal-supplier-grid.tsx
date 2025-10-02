'use client'

import { useState, useEffect } from 'react'
import { UniversalSupplier, UniversalSupplierGridProps, BusinessType } from '@/types/supplier'

// Sample data generator for demo purposes
function generateSampleSuppliers(businessType: BusinessType, businessId: string): UniversalSupplier[] {
  const baseSuppliers = {
    hardware: [
      {
        id: 'hw-s1',
        name: 'Pacific Lumber Supply Co.',
        category: 'Lumber & Building Materials',
        contact: { primaryContact: 'Mike Johnson', phone: '(555) 123-4567', email: 'mike@pacificlumber.com' },
        performance: { onTimeDeliveryPercent: 96.2, qualityScore: 9.1, totalOrders: 156, reliability: 'excellent' as const },
        terms: { paymentTerms: 'net_30' as const, minimumOrder: 1000, leadTimeDays: 5 },
        status: 'active' as const
      },
      {
        id: 'hw-s2',
        name: 'Industrial Fasteners Inc.',
        category: 'Fasteners & Hardware',
        contact: { primaryContact: 'Sarah Wilson', phone: '(555) 234-5678', email: 'sarah@indfasteners.com' },
        performance: { onTimeDeliveryPercent: 94.8, qualityScore: 8.9, totalOrders: 203, reliability: 'excellent' as const },
        terms: { paymentTerms: 'net_15' as const, minimumOrder: 250, leadTimeDays: 2 },
        status: 'active' as const
      },
      {
        id: 'hw-s3',
        name: 'Professional Paint & Tools',
        category: 'Paint & Finishing',
        contact: { primaryContact: 'David Chen', phone: '(555) 345-6789', email: 'david@proppaint.com' },
        performance: { onTimeDeliveryPercent: 89.3, qualityScore: 8.5, totalOrders: 78, reliability: 'good' as const },
        terms: { paymentTerms: 'net_30' as const, minimumOrder: 500, leadTimeDays: 7 },
        status: 'active' as const
      }
    ],
    grocery: [
      {
        id: 'gr-s1',
        name: 'Fresh Farms Co-op',
        category: 'Produce',
        contact: { primaryContact: 'Maria Rodriguez', phone: '(555) 234-5678', email: 'maria@freshfarms.com' },
        performance: { onTimeDeliveryPercent: 94.2, qualityScore: 9.1, totalOrders: 127, reliability: 'excellent' as const },
        terms: { paymentTerms: 'net_30' as const, minimumOrder: 500, leadTimeDays: 2 },
        status: 'active' as const
      }
    ],
    restaurant: [
      {
        id: 'rest-s1',
        name: 'Farm Fresh Ingredients',
        category: 'Fresh Produce',
        contact: { primaryContact: 'Chef Martinez', phone: '(555) 345-6789', email: 'chef@farmfresh.com' },
        performance: { onTimeDeliveryPercent: 97.1, qualityScore: 9.3, totalOrders: 89, reliability: 'excellent' as const },
        terms: { paymentTerms: 'net_15' as const, minimumOrder: 200, leadTimeDays: 1 },
        status: 'active' as const
      }
    ],
    clothing: [
      {
        id: 'cl-s1',
        name: 'Premium Textiles Ltd.',
        category: 'Fabrics & Materials',
        contact: { primaryContact: 'Jessica Kim', phone: '(555) 456-7890', email: 'jessica@premiumtextiles.com' },
        performance: { onTimeDeliveryPercent: 91.5, qualityScore: 8.7, totalOrders: 45, reliability: 'good' as const },
        terms: { paymentTerms: 'net_45' as const, minimumOrder: 1500, leadTimeDays: 14 },
        status: 'active' as const
      }
    ],
    construction: [
      {
        id: 'con-s1',
        name: 'Heavy Equipment Rentals',
        category: 'Equipment & Machinery',
        contact: { primaryContact: 'Tony Smith', phone: '(555) 567-8901', email: 'tony@heavyequip.com' },
        performance: { onTimeDeliveryPercent: 88.9, qualityScore: 8.2, totalOrders: 34, reliability: 'good' as const },
        terms: { paymentTerms: 'net_30' as const, minimumOrder: 2000, leadTimeDays: 3 },
        status: 'active' as const
      }
    ]
  }

  return (baseSuppliers[businessType] || []).map(supplier => ({
    ...supplier,
    businessId,
    businessType,
    code: `SUP-${supplier.id.toUpperCase()}`,
    contact: {
      ...supplier.contact,
      address: {
        street: '123 Business St',
        city: 'Commerce City',
        state: 'CA',
        zipCode: '90210',
        country: 'USA'
      }
    },
    performance: {
      ...supplier.performance,
      totalSpent: Math.floor(Math.random() * 100000) + 10000,
      averageLeadTime: supplier.terms.leadTimeDays,
      issueCount: Math.floor(Math.random() * 5),
      responseTimeHours: Math.floor(Math.random() * 24) + 1
    },
    terms: {
      ...supplier.terms,
      currency: 'USD',
      shippingTerms: 'FOB Origin'
    },
    certifications: [],
    attributes: {},
    tags: [],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
    lastUpdatedBy: 'system'
  }))
}

export function UniversalSupplierGrid({
  businessId,
  businessType,
  suppliers: propSuppliers,
  loading = false,
  onSupplierEdit,
  onSupplierView,
  onSupplierDelete,
  onCreateOrder,
  showActions = true,
  layout = 'table',
  allowSearch = true,
  allowFiltering = true,
  allowSorting = true,
  showBusinessSpecificFields = true,
  customFields = []
}: UniversalSupplierGridProps) {
  const [suppliers, setSuppliers] = useState<UniversalSupplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<UniversalSupplier[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<keyof UniversalSupplier | 'performance.onTimeDeliveryPercent' | 'performance.qualityScore'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Initialize suppliers (use prop suppliers or generate sample data)
  useEffect(() => {
    if (propSuppliers) {
      setSuppliers(propSuppliers)
    } else {
      // Generate sample data for demo
      const sampleSuppliers = generateSampleSuppliers(businessType, businessId)
      setSuppliers(sampleSuppliers)
    }
  }, [propSuppliers, businessType, businessId])

  // Apply filters and search
  useEffect(() => {
    let filtered = [...suppliers]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact.primaryContact.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(supplier => supplier.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(supplier => supplier.category === categoryFilter)
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      // Handle nested fields
      if (sortField === 'performance.onTimeDeliveryPercent') {
        aValue = a.performance.onTimeDeliveryPercent
        bValue = b.performance.onTimeDeliveryPercent
      } else if (sortField === 'performance.qualityScore') {
        aValue = a.performance.qualityScore
        bValue = b.performance.qualityScore
      } else {
        aValue = a[sortField as keyof UniversalSupplier]
        bValue = b[sortField as keyof UniversalSupplier]
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })

    setFilteredSuppliers(filtered)
  }, [suppliers, searchTerm, statusFilter, categoryFilter, sortField, sortDirection])

  const handleSort = (field: keyof UniversalSupplier) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getReliabilityColor = (reliability: string) => {
    const colors = {
      excellent: 'text-green-600',
      good: 'text-blue-600',
      fair: 'text-yellow-600',
      poor: 'text-red-600'
    }
    return colors[reliability as keyof typeof colors] || 'text-gray-600'
  }

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const getBusinessSpecificIcon = (businessType: BusinessType) => {
    const icons = {
      hardware: '🔧',
      grocery: '🛒',
      restaurant: '🍽️',
      clothing: '👕',
      construction: '🏗️'
    }
    return icons[businessType] || '🏢'
  }

  const categories = [...new Set(suppliers.map(s => s.category))]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading suppliers...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {(allowSearch || allowFiltering) && (
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border">
          {allowSearch && (
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search suppliers, categories, or contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {allowFiltering && (
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredSuppliers.length} of {suppliers.length} suppliers
          {getBusinessSpecificIcon(businessType)} {businessType.charAt(0).toUpperCase() + businessType.slice(1)}
        </span>
        {allowSorting && (
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as keyof UniversalSupplier)}
              className="text-sm border-gray-300 rounded"
            >
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="performance.onTimeDeliveryPercent">On-Time Delivery</option>
              <option value="performance.qualityScore">Quality Score</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="text-blue-600 hover:text-blue-800"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}
      </div>

      {/* Supplier Grid/Table */}
      {layout === 'table' ? (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-900">Supplier</th>
                  <th className="text-left p-3 font-medium text-gray-900">Contact</th>
                  <th className="text-left p-3 font-medium text-gray-900">Performance</th>
                  <th className="text-left p-3 font-medium text-gray-900">Terms</th>
                  <th className="text-left p-3 font-medium text-gray-900">Status</th>
                  {showActions && <th className="text-left p-3 font-medium text-gray-900">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-gray-500 text-xs">{supplier.code}</div>
                        <div className="text-gray-500 text-xs">{supplier.category}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-gray-900">{supplier.contact.primaryContact}</div>
                      <div className="text-gray-500 text-xs">{supplier.contact.phone}</div>
                      <div className="text-gray-500 text-xs">{supplier.contact.email}</div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center text-xs">
                          <span className="text-gray-600">On-Time:</span>
                          <span className="ml-1 font-medium text-green-600">
                            {supplier.performance.onTimeDeliveryPercent}%
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          <span className="text-gray-600">Quality:</span>
                          <span className="ml-1 font-medium text-blue-600">
                            {supplier.performance.qualityScore}/10
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          <span className="text-gray-600">Rating:</span>
                          <span className={`ml-1 font-medium capitalize ${getReliabilityColor(supplier.performance.reliability)}`}>
                            {supplier.performance.reliability}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1 text-xs">
                        <div className="text-gray-600">
                          Payment: <span className="text-gray-900">{supplier.terms.paymentTerms.replace('_', ' ')}</span>
                        </div>
                        <div className="text-gray-600">
                          Min Order: <span className="text-gray-900">{formatCurrency(supplier.terms.minimumOrder)}</span>
                        </div>
                        <div className="text-gray-600">
                          Lead Time: <span className="text-gray-900">{supplier.terms.leadTimeDays} days</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(supplier.status)}`}>
                        {supplier.status}
                      </span>
                    </td>
                    {showActions && (
                      <td className="p-3">
                        <div className="flex gap-1">
                          {onSupplierView && (
                            <button
                              onClick={() => onSupplierView(supplier)}
                              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                            >
                              View
                            </button>
                          )}
                          {onSupplierEdit && (
                            <button
                              onClick={() => onSupplierEdit(supplier)}
                              className="text-green-600 hover:text-green-800 text-xs px-2 py-1"
                            >
                              Edit
                            </button>
                          )}
                          {onCreateOrder && (
                            <button
                              onClick={() => onCreateOrder(supplier)}
                              className="text-purple-600 hover:text-purple-800 text-xs px-2 py-1"
                            >
                              Order
                            </button>
                          )}
                          {onSupplierDelete && (
                            <button
                              onClick={() => onSupplierDelete(supplier)}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Card layout
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{supplier.name}</h4>
                  <p className="text-sm text-gray-600">{supplier.category}</p>
                  <p className="text-xs text-gray-500">{supplier.code}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(supplier.status)}`}>
                  {supplier.status}
                </span>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div>
                  <span className="font-medium">{supplier.contact.primaryContact}</span>
                  <div className="text-gray-600 text-xs">{supplier.contact.phone}</div>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">On-Time:</span>
                  <span className="font-medium text-green-600">{supplier.performance.onTimeDeliveryPercent}%</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Quality:</span>
                  <span className="font-medium text-blue-600">{supplier.performance.qualityScore}/10</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Lead Time:</span>
                  <span className="font-medium">{supplier.terms.leadTimeDays} days</span>
                </div>
              </div>

              {showActions && (
                <div className="flex gap-2 pt-3 border-t">
                  {onSupplierView && (
                    <button
                      onClick={() => onSupplierView(supplier)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      View
                    </button>
                  )}
                  {onCreateOrder && (
                    <button
                      onClick={() => onCreateOrder(supplier)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Order
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-4xl mb-4">{getBusinessSpecificIcon(businessType)}</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first supplier'
            }
          </p>
        </div>
      )}
    </div>
  )
}