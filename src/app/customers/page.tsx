'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CustomerGrid } from '@/components/customers/customer-grid'
import { AddCustomerModal } from '@/components/customers/add-customer-modal'
import { Search, Plus, Filter } from 'lucide-react'

export default function CustomersPage() {
  const { data: session } = useSession()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })

  useEffect(() => {
    fetchCustomers()
  }, [searchTerm, selectedType, pagination.page])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (searchTerm) params.append('search', searchTerm)
      if (selectedType !== 'all') params.append('type', selectedType)

      const response = await fetch(`/api/customers?${params}`)
      const data = await response.json()

      if (response.ok) {
        setCustomers(data.customers)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerCreated = () => {
    setShowAddModal(false)
    fetchCustomers()
  }

  return (
    <ContentLayout
      title="Customer Management"
      subtitle="Manage customers across all business divisions"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Customers', isActive: true }
      ]}
      headerActions={
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary" />
              <Input
                placeholder="Search by name, email, phone, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border rounded-md bg-white dark:bg-gray-800 text-primary"
              >
                <option value="all">All Types</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="BUSINESS">Business</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="USER">User</option>
                <option value="GOVERNMENT">Government</option>
                <option value="NGO">NGO</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Grid */}
        <CustomerGrid
          customers={customers}
          loading={loading}
          onRefresh={fetchCustomers}
        />

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="card p-4 flex justify-between items-center">
            <div className="text-sm text-secondary">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} customers
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Add Customer Modal */}
        {showAddModal && (
          <AddCustomerModal
            onClose={() => setShowAddModal(false)}
            onCustomerCreated={handleCustomerCreated}
          />
        )}
      </div>
    </ContentLayout>
  )
}
