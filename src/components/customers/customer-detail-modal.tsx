'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Mail, Phone, MapPin, Building2, User, CreditCard, ShoppingBag, Calendar, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface CustomerDetailModalProps {
  customerId: string
  onClose: () => void
  onUpdate: () => void
}

export function CustomerDetailModal({ customerId, onClose, onUpdate }: CustomerDetailModalProps) {
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const { format: globalDateFormat } = useDateFormat()

  useEffect(() => {
    fetchCustomer()
  }, [customerId])

  const fetchCustomer = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return formatDateByFormat(dateString, globalDateFormat)
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    )
  }

  if (!customer) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-semibold text-primary">{customer.fullName}</h2>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(customer.type)}`}>
                  {customer.type}
                </span>
                {!customer.isActive && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-secondary">{customer.customerNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-secondary hover:text-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-6 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 border-b-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`py-3 border-b-2 font-medium transition-colors ${
                activeTab === 'accounts'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Division Accounts ({customer._count.divisionAccounts})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-3 border-b-2 font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Activity
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="card p-4">
                <h3 className="font-semibold text-primary mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {customer.primaryEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-secondary" />
                      <span className="text-primary">{customer.primaryEmail}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-secondary" />
                    <span className="text-primary">{customer.primaryPhone}</span>
                  </div>
                  {customer.alternatePhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-secondary" />
                      <span className="text-primary">{customer.alternatePhone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-secondary" />
                      <span className="text-primary">{customer.address}, {customer.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              <div className="card p-4">
                <h3 className="font-semibold text-primary mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {customer.dateOfBirth && (
                    <div>
                      <p className="text-sm text-secondary">Date of Birth</p>
                      <p className="text-primary">{formatDate(customer.dateOfBirth)}</p>
                    </div>
                  )}
                  {customer.gender && (
                    <div>
                      <p className="text-sm text-secondary">Gender</p>
                      <p className="text-primary">{customer.gender}</p>
                    </div>
                  )}
                  {customer.nationalId && (
                    <div>
                      <p className="text-sm text-secondary">National ID</p>
                      <p className="text-primary">{customer.nationalId}</p>
                    </div>
                  )}
                  {customer.taxNumber && (
                    <div>
                      <p className="text-sm text-secondary">Tax Number</p>
                      <p className="text-primary">{customer.taxNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Accounts */}
              {(customer.linkedUser || customer.linkedEmployee) && (
                <div className="card p-4">
                  <h3 className="font-semibold text-primary mb-4">Linked Accounts</h3>
                  <div className="space-y-3">
                    {customer.linkedUser && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-secondary" />
                        <span className="text-primary">
                          User: {customer.linkedUser.name} ({customer.linkedUser.email})
                        </span>
                      </div>
                    )}
                    {customer.linkedEmployee && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-secondary" />
                        <span className="text-primary">
                          Employee: {customer.linkedEmployee.fullName} ({customer.linkedEmployee.employeeNumber})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="space-y-4">
              {(!customer.divisionAccounts || customer.divisionAccounts.length === 0) ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-secondary mx-auto mb-4" />
                  <p className="text-secondary">No division accounts yet</p>
                </div>
              ) : (
                customer.divisionAccounts.map((account: any) => (
                  <div key={account.id} className="card p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-primary">{account.businesses.name}</h4>
                        <p className="text-sm text-secondary">{account.divisionCustomerNumber}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        account.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {account.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-secondary">Credit Limit</p>
                        <p className="text-primary font-medium">${account.creditLimit}</p>
                      </div>
                      <div>
                        <p className="text-secondary">Total Spent</p>
                        <p className="text-primary font-medium">${account.totalSpent}</p>
                      </div>
                      <div>
                        <p className="text-secondary">Loyalty Points</p>
                        <p className="text-primary font-medium">{account.loyaltyPoints}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="card p-4 text-center">
                  <ShoppingBag className="h-6 w-6 text-secondary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">{customer._count.laybys}</p>
                  <p className="text-sm text-secondary">Laybys</p>
                </div>
                <div className="card p-4 text-center">
                  <CreditCard className="h-6 w-6 text-secondary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">{customer._count.creditApplications}</p>
                  <p className="text-sm text-secondary">Credit Applications</p>
                </div>
                <div className="card p-4 text-center">
                  <Building2 className="h-6 w-6 text-secondary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">{customer._count.divisionAccounts}</p>
                  <p className="text-sm text-secondary">Active Accounts</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
