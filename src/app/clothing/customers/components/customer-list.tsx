'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth?: string
  segment: 'price' | 'quality' | 'style' | 'conspicuous'
  totalSpent: number
  orderCount: number
  avgOrderValue: number
  lastOrderDate?: string
  createdAt: string
  preferences: {
    sizes: string[]
    colors: string[]
    brands: string[]
    categories: string[]
    priceRange: string
  }
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  notes?: string
  tags: string[]
  status: 'ACTIVE' | 'INACTIVE' | 'VIP' | 'BLACKLISTED'
}

interface ClothingCustomerListProps {
  businessId: string
  selectedSegment: string | null
  onCustomerView: (customerId: string) => void
  onCustomerEdit: (customerId: string) => void
}

export function ClothingCustomerList({
  businessId,
  selectedSegment,
  onCustomerView,
  onCustomerEdit
}: ClothingCustomerListProps) {
  const { formatCurrency, formatDate } = useBusinessContext()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'spent' | 'orders' | 'lastOrder'>('lastOrder')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchCustomers()
  }, [businessId, selectedSegment])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Sample customer data for clothing business
      const sampleCustomers: Customer[] = [
        {
          id: 'cust1',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.j@email.com',
          phone: '+1-555-0123',
          dateOfBirth: '1985-03-15',
          segment: 'style',
          totalSpent: 2450.00,
          orderCount: 15,
          avgOrderValue: 163.33,
          lastOrderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          preferences: {
            sizes: ['M', 'L'],
            colors: ['Black', 'Navy', 'White'],
            brands: ['Zara', 'H&M'],
            categories: ['Tops', 'Dresses'],
            priceRange: 'mid'
          },
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          },
          notes: 'Prefers trendy styles, responsive to email campaigns',
          tags: ['VIP', 'Fashion Forward', 'Email Subscriber'],
          status: 'VIP'
        },
        {
          id: 'cust2',
          firstName: 'Michael',
          lastName: 'Chen',
          email: 'm.chen@email.com',
          phone: '+1-555-0456',
          segment: 'quality',
          totalSpent: 1890.50,
          orderCount: 12,
          avgOrderValue: 157.54,
          lastOrderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 280 * 24 * 60 * 60 * 1000).toISOString(),
          preferences: {
            sizes: ['L', 'XL'],
            colors: ['Navy', 'Gray', 'Brown'],
            brands: ['Levi\'s', 'LL Bean'],
            categories: ['Pants', 'Jackets'],
            priceRange: 'mid'
          },
          notes: 'Values quality over trends, prefers classic styles',
          tags: ['Quality Focused', 'Repeat Customer'],
          status: 'ACTIVE'
        },
        {
          id: 'cust3',
          firstName: 'Emma',
          lastName: 'Rodriguez',
          email: 'emma.r@email.com',
          phone: '+1-555-0789',
          segment: 'conspicuous',
          totalSpent: 3675.25,
          orderCount: 8,
          avgOrderValue: 459.41,
          lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
          preferences: {
            sizes: ['S', 'M'],
            colors: ['Black', 'Red', 'Gold'],
            brands: ['Gucci', 'Prada', 'Louis Vuitton'],
            categories: ['Handbags', 'Shoes', 'Accessories'],
            priceRange: 'luxury'
          },
          notes: 'High-value customer, prefers luxury brands and exclusive items',
          tags: ['VIP', 'Luxury', 'High Spender'],
          status: 'VIP'
        },
        {
          id: 'cust4',
          firstName: 'David',
          lastName: 'Thompson',
          email: 'd.thompson@email.com',
          segment: 'price',
          totalSpent: 234.50,
          orderCount: 8,
          avgOrderValue: 29.31,
          lastOrderDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
          preferences: {
            sizes: ['M'],
            colors: ['Blue', 'Gray'],
            brands: ['Target', 'Walmart Fashion'],
            categories: ['Basic Tees', 'Jeans'],
            priceRange: 'budget'
          },
          notes: 'Price-sensitive, shops during sales',
          tags: ['Budget Conscious', 'Sale Shopper'],
          status: 'ACTIVE'
        },
        {
          id: 'cust5',
          firstName: 'Lisa',
          lastName: 'Park',
          email: 'lisa.park@email.com',
          phone: '+1-555-0321',
          segment: 'style',
          totalSpent: 1245.80,
          orderCount: 18,
          avgOrderValue: 69.21,
          lastOrderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 320 * 24 * 60 * 60 * 1000).toISOString(),
          preferences: {
            sizes: ['XS', 'S'],
            colors: ['Pink', 'Purple', 'White'],
            brands: ['ASOS', 'Forever 21'],
            categories: ['Dresses', 'Tops'],
            priceRange: 'mid'
          },
          notes: 'Frequent purchaser, follows fashion trends',
          tags: ['Trendsetter', 'Frequent Buyer'],
          status: 'ACTIVE'
        }
      ]

      setCustomers(sampleCustomers)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSegmentConfig = (segment: string) => {
    const configs = {
      price: { label: 'Price', color: 'bg-red-100 text-red-800', icon: '💰' },
      quality: { label: 'Quality', color: 'bg-blue-100 text-blue-800', icon: '⭐' },
      style: { label: 'Style', color: 'bg-purple-100 text-purple-800', icon: '👗' },
      conspicuous: { label: 'Status', color: 'bg-green-100 text-green-800', icon: '💎' }
    }
    return configs[segment as keyof typeof configs] || configs.price
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800' },
      VIP: { label: 'VIP', color: 'bg-yellow-100 text-yellow-800' },
      INACTIVE: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
      BLACKLISTED: { label: 'Blacklisted', color: 'bg-red-100 text-red-800' }
    }
    return configs[status as keyof typeof configs] || configs.ACTIVE
  }

  // Filter and sort customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchTerm === '' ||
      customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSegment = !selectedSegment || customer.segment === selectedSegment
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus

    return matchesSearch && matchesSegment && matchesStatus
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      case 'spent':
        return b.totalSpent - a.totalSpent
      case 'orders':
        return b.orderCount - a.orderCount
      case 'lastOrder':
        return new Date(b.lastOrderDate || 0).getTime() - new Date(a.lastOrderDate || 0).getTime()
      default:
        return 0
    }
  })

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load customers: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="🔍 Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="lastOrder">Last Order</option>
            <option value="name">Name</option>
            <option value="spent">Total Spent</option>
            <option value="orders">Order Count</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="VIP">VIP</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="space-y-4">
        {paginatedCustomers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Customers Found</h3>
            <p className="text-gray-600">No customers match your current filters.</p>
          </div>
        ) : (
          paginatedCustomers.map((customer) => {
            const segmentConfig = getSegmentConfig(customer.segment)
            const statusConfig = getStatusConfig(customer.status)

            return (
              <div key={customer.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {customer.firstName[0]}{customer.lastName[0]}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${segmentConfig.color}`}>
                          {segmentConfig.icon} {segmentConfig.label}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-1">{customer.email}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Total: {formatCurrency(customer.totalSpent)}</span>
                        <span>Orders: {customer.orderCount}</span>
                        <span>Avg: {formatCurrency(customer.avgOrderValue)}</span>
                        {customer.lastOrderDate && (
                          <span>Last: {formatDate(new Date(customer.lastOrderDate))}</span>
                        )}
                      </div>

                      {/* Preferences */}
                      {customer.preferences.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-xs text-gray-500">Sizes:</span>
                          {customer.preferences.sizes.slice(0, 3).map((size) => (
                            <span key={size} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                              {size}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Tags */}
                      {customer.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {customer.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCustomerView(customer.id)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onCustomerEdit(customer.id)}
                      className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="px-3 py-1 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}