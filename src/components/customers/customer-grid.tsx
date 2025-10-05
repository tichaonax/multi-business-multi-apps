'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Mail, Phone, MapPin, CreditCard, ShoppingBag, User } from 'lucide-react'
import { CustomerDetailModal } from './customer-detail-modal'

interface Customer {
  id: string
  customerNumber: string
  type: string
  fullName: string
  companyName?: string
  primaryEmail?: string
  primaryPhone: string
  address?: string
  city?: string
  isActive: boolean
  divisionAccounts: any[]
  linkedUser?: any
  linkedEmployee?: any
  _count: {
    divisionAccounts: number
    laybys: number
    creditApplications: number
  }
}

interface CustomerGridProps {
  customers: Customer[]
  loading: boolean
  onRefresh: () => void
}

export function CustomerGrid({ customers, loading, onRefresh }: CustomerGridProps) {
  const router = useRouter()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="card p-12 text-center">
        <User className="h-12 w-12 text-secondary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-primary mb-2">No customers found</h3>
        <p className="text-secondary">Try adjusting your search or filters</p>
      </div>
    )
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      INDIVIDUAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      BUSINESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      EMPLOYEE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      USER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      GOVERNMENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      NGO: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedCustomer(customer)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-primary mb-1">
                  {customer.fullName}
                </h3>
                <p className="text-sm text-secondary">{customer.customerNumber}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(customer.type)}`}>
                {customer.type}
              </span>
            </div>

            {/* Company Name */}
            {customer.companyName && (
              <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                <Building2 className="h-4 w-4" />
                <span>{customer.companyName}</span>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              {customer.primaryEmail && (
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{customer.primaryEmail}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Phone className="h-4 w-4" />
                <span>{customer.primaryPhone}</span>
              </div>
              {customer.city && (
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <MapPin className="h-4 w-4" />
                  <span>{customer.city}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Building2 className="h-3 w-3 text-secondary" />
                  <p className="text-lg font-semibold text-primary">
                    {customer._count.divisionAccounts}
                  </p>
                </div>
                <p className="text-xs text-secondary">Accounts</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ShoppingBag className="h-3 w-3 text-secondary" />
                  <p className="text-lg font-semibold text-primary">
                    {customer._count.laybys}
                  </p>
                </div>
                <p className="text-xs text-secondary">Laybys</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CreditCard className="h-3 w-3 text-secondary" />
                  <p className="text-lg font-semibold text-primary">
                    {customer._count.creditApplications}
                  </p>
                </div>
                <p className="text-xs text-secondary">Credit</p>
              </div>
            </div>

            {/* Active Status */}
            {!customer.isActive && (
              <div className="mt-4 text-center">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Inactive
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customerId={selectedCustomer.id}
          onClose={() => setSelectedCustomer(null)}
          onUpdate={onRefresh}
        />
      )}
    </>
  )
}
