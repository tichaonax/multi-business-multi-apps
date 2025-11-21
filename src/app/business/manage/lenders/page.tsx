'use client'

import { BusinessProtectedRoute } from '@/components/auth/business-protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'
import Link from 'next/link'

interface Lender {
  id: string
  fullName: string
  email?: string
  phone: string
  nationalId?: string
  address?: string
  notes?: string
  lenderType: 'individual' | 'bank'
  activeLoansCount: number
  totalOutstanding: number
  isActive: boolean
  createdAt: string
  // Bank-specific fields
  bankRegistrationNo?: string
  swiftCode?: string
  swiftCodeShort?: string
  branchCode?: string
  city?: string
  country?: string
  alternatePhones?: string[]
}

export default function LendersManagementPage() {
  const customAlert = useAlert()
  const [lenders, setLenders] = useState<Lender[]>([])
  const [filteredLenders, setFilteredLenders] = useState<Lender[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedLender, setSelectedLender] = useState<Lender | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'bank'>('all')

  const [newLender, setNewLender] = useState({
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    address: '',
    lenderType: 'individual' as 'individual' | 'bank',
    notes: '',
    // Bank-specific fields
    bankRegistrationNo: '',
    swiftCode: '',
    swiftCodeShort: '',
    branchCode: '',
    city: '',
    country: ''
  })

  useEffect(() => {
    fetchLenders()
  }, [])

  useEffect(() => {
    // Apply filters
    let filtered = lenders

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(lender =>
        lender.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lender.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lender.phone.includes(searchTerm) ||
        lender.nationalId.includes(searchTerm)
      )
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(lender => lender.lenderType === filterType)
    }

    setFilteredLenders(filtered)
  }, [searchTerm, filterType, lenders])

  const fetchLenders = async () => {
    try {
      const response = await fetch('/api/business/lenders', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setLenders(Array.isArray(data) ? data : [])
        setFilteredLenders(Array.isArray(data) ? data : [])
      } else if (response.status === 403) {
        await customAlert({
          title: 'Access Denied',
          description: 'You do not have permission to view lenders. Only admins, managers, and owners can access this page.'
        })
      }
    } catch (error) {
      console.error('Failed to fetch lenders:', error)
      setLenders([])
      setFilteredLenders([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLender = async (e: React.FormEvent) => {
    e.preventDefault()

    // Different validation based on lender type
    if (newLender.lenderType === 'bank') {
      if (!newLender.fullName || !newLender.phone || !newLender.bankRegistrationNo || !newLender.address || !newLender.city || !newLender.country) {
        await customAlert({ title: 'Validation', description: 'Bank name, phone, registration number, address, city, and country are required for banks' })
        return
      }
    } else {
      if (!newLender.fullName || !newLender.phone || !newLender.nationalId) {
        await customAlert({ title: 'Validation', description: 'Full name, phone, and national ID are required for individuals' })
        return
      }
    }

    try {
      const response = await fetch('/api/business/lenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newLender)
      })

      if (response.ok) {
        await fetchLenders()
        setShowCreateModal(false)
        setNewLender({
          fullName: '',
          email: '',
          phone: '',
          nationalId: '',
          address: '',
          lenderType: 'individual',
          notes: '',
          bankRegistrationNo: '',
          swiftCode: '',
          swiftCodeShort: '',
          branchCode: '',
          city: '',
          country: ''
        })
        await customAlert({ title: 'Success', description: 'Lender created successfully!' })
      } else {
        const error = await response.json()
        await customAlert({
          title: 'Create lender failed',
          description: error.error || 'Failed to create lender'
        })
      }
    } catch (error) {
      console.error('Error creating lender:', error)
      await customAlert({ title: 'Create lender failed', description: 'Error creating lender' })
    }
  }

  const handleEditLender = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLender) return

    try {
      const response = await fetch(`/api/business/lenders/${selectedLender.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: selectedLender.fullName,
          email: selectedLender.email,
          phone: selectedLender.phone,
          nationalId: selectedLender.nationalId,
          address: selectedLender.address,
          lenderType: selectedLender.lenderType,
          notes: selectedLender.notes,
          // Bank-specific fields
          bankRegistrationNo: selectedLender.bankRegistrationNo,
          swiftCode: selectedLender.swiftCode,
          swiftCodeShort: selectedLender.swiftCodeShort,
          branchCode: selectedLender.branchCode,
          city: selectedLender.city,
          country: selectedLender.country
        })
      })

      if (response.ok) {
        await fetchLenders()
        setShowEditModal(false)
        setSelectedLender(null)
        await customAlert({ title: 'Success', description: 'Lender updated successfully!' })
      } else {
        const error = await response.json()
        await customAlert({
          title: 'Update lender failed',
          description: error.error || 'Failed to update lender'
        })
      }
    } catch (error) {
      console.error('Error updating lender:', error)
      await customAlert({ title: 'Update lender failed', description: 'Error updating lender' })
    }
  }

  const handleDeleteLender = async (lender: Lender) => {
    if (lender.activeLoansCount > 0) {
      await customAlert({
        title: 'Cannot delete',
        description: `This lender has ${lender.activeLoansCount} active loan(s). Please settle all loans before deleting.`
      })
      return
    }

    try {
      const response = await fetch(`/api/business/lenders/${lender.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchLenders()
        await customAlert({ title: 'Success', description: 'Lender deleted successfully!' })
      } else {
        const error = await response.json()
        await customAlert({
          title: 'Delete lender failed',
          description: error.error || 'Failed to delete lender'
        })
      }
    } catch (error) {
      console.error('Error deleting lender:', error)
      await customAlert({ title: 'Delete lender failed', description: 'Error deleting lender' })
    }
  }

  const openEditModal = (lender: Lender) => {
    setSelectedLender({ ...lender })
    setShowEditModal(true)
  }

  return (
    <BusinessProtectedRoute requiredPermission="canAccessFinancialData">
      <ContentLayout
        title="👥 Lenders Management"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Business Management', href: '/business/manage' },
          { label: 'Lenders', isActive: true }
        ]}
        headerActions={
          <div className="flex gap-3">
            <Link
              href="/business/manage/loans"
              className="btn-secondary"
            >
              💰 View Loans
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              ➕ Add New Lender
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">Total Lenders</h3>
              <p className="text-3xl font-bold text-blue-600">{lenders.length}</p>
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">Individuals</h3>
              <p className="text-3xl font-bold text-green-600">
                {lenders.filter(l => l.lenderType === 'individual').length}
              </p>
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">Banks</h3>
              <p className="text-3xl font-bold text-purple-600">
                {lenders.filter(l => l.lenderType === 'bank').length}
              </p>
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">Active Loans</h3>
              <p className="text-3xl font-bold text-orange-600">
                {lenders.reduce((sum, l) => sum + l.activeLoansCount, 0)}
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or national ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-secondary hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('individual')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    filterType === 'individual'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-secondary hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Individuals
                </button>
                <button
                  onClick={() => setFilterType('bank')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    filterType === 'bank'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-secondary hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Banks
                </button>
              </div>
            </div>
          </div>

          {/* Lenders Table */}
          <div className="card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-primary">
                Lenders List {filteredLenders.length !== lenders.length && `(${filteredLenders.length} of ${lenders.length})`}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">ID/Registration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Active Loans</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Outstanding</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-secondary">
                        Loading lenders...
                      </td>
                    </tr>
                  ) : filteredLenders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-secondary">
                        {searchTerm || filterType !== 'all'
                          ? 'No lenders found matching your filters.'
                          : 'No lenders found. Create your first lender to get started!'}
                      </td>
                    </tr>
                  ) : (
                    filteredLenders.map(lender => (
                      <tr
                        key={lender.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-primary">{lender.fullName}</div>
                          {lender.email && (
                            <div className="text-sm text-secondary">{lender.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            lender.lenderType === 'bank'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {lender.lenderType === 'bank' ? '🏦 Bank' : '👤 Individual'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">
                          {lender.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">
                          {lender.lenderType === 'bank' ? lender.bankRegistrationNo : lender.nationalId}
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className={`font-medium ${
                            lender.activeLoansCount > 0 ? 'text-orange-600' : 'text-gray-500'
                          }`}>
                            {lender.activeLoansCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-primary">
                          ${lender.totalOutstanding.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(lender)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLender(lender)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create Lender Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-primary mb-4">Add New Lender</h2>
              <form onSubmit={handleCreateLender} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Lender Type *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="lenderType"
                        value="individual"
                        checked={newLender.lenderType === 'individual'}
                        onChange={(e) => setNewLender({...newLender, lenderType: 'individual'})}
                        className="mr-2"
                      />
                      👤 Individual
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="lenderType"
                        value="bank"
                        checked={newLender.lenderType === 'bank'}
                        onChange={(e) => setNewLender({...newLender, lenderType: 'bank'})}
                        className="mr-2"
                      />
                      🏦 Bank
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    💡 <strong>Individual:</strong> Private person providing loans (family, friends, investors).
                    <strong className="ml-2">Bank:</strong> Financial institution or credit provider.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newLender.fullName}
                    onChange={(e) => setNewLender({...newLender, fullName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newLender.email}
                    onChange={(e) => setNewLender({...newLender, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={newLender.phone}
                    onChange={(e) => setNewLender({...newLender, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1234567890"
                    required
                  />
                </div>

                {/* Conditional fields based on lender type */}
                {newLender.lenderType === 'individual' ? (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      National ID *
                    </label>
                    <input
                      type="text"
                      value={newLender.nationalId}
                      onChange={(e) => setNewLender({...newLender, nationalId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="63-123456A78"
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Bank Registration No *
                      </label>
                      <input
                        type="text"
                        value={newLender.bankRegistrationNo}
                        onChange={(e) => setNewLender({...newLender, bankRegistrationNo: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="REG123456"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          SWIFT Code (11-char)
                        </label>
                        <input
                          type="text"
                          value={newLender.swiftCode}
                          onChange={(e) => setNewLender({...newLender, swiftCode: e.target.value.toUpperCase()})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="ZBCOZWHXXXX"
                          maxLength={11}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Branch Code
                        </label>
                        <input
                          type="text"
                          value={newLender.branchCode}
                          onChange={(e) => setNewLender({...newLender, branchCode: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="001"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={newLender.city}
                          onChange={(e) => setNewLender({...newLender, city: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Harare"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Country *
                        </label>
                        <input
                          type="text"
                          value={newLender.country}
                          onChange={(e) => setNewLender({...newLender, country: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Zimbabwe"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Address {newLender.lenderType === 'bank' ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    value={newLender.address}
                    onChange={(e) => setNewLender({...newLender, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={newLender.lenderType === 'bank' ? "ZB House, 21 Natal Road" : "123 Main St"}
                    required={newLender.lenderType === 'bank'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Notes
                  </label>
                  <textarea
                    value={newLender.notes}
                    onChange={(e) => setNewLender({...newLender, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional information..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-secondary bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Create Lender
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Lender Modal */}
        {showEditModal && selectedLender && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-primary mb-4">Edit Lender</h2>
              <form onSubmit={handleEditLender} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Lender Type *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="editLenderType"
                        value="individual"
                        checked={selectedLender.lenderType === 'individual'}
                        onChange={(e) => setSelectedLender({...selectedLender, lenderType: 'individual'})}
                        className="mr-2"
                      />
                      👤 Individual
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="editLenderType"
                        value="bank"
                        checked={selectedLender.lenderType === 'bank'}
                        onChange={(e) => setSelectedLender({...selectedLender, lenderType: 'bank'})}
                        className="mr-2"
                      />
                      🏦 Bank
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    💡 <strong>Individual:</strong> Private person providing loans (family, friends, investors).
                    <strong className="ml-2">Bank:</strong> Financial institution or credit provider.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={selectedLender.fullName}
                    onChange={(e) => setSelectedLender({...selectedLender, fullName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={selectedLender.email || ''}
                    onChange={(e) => setSelectedLender({...selectedLender, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={selectedLender.phone}
                    onChange={(e) => setSelectedLender({...selectedLender, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Conditional fields based on lender type */}
                {selectedLender.lenderType === 'individual' ? (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      National ID *
                    </label>
                    <input
                      type="text"
                      value={selectedLender.nationalId || ''}
                      onChange={(e) => setSelectedLender({...selectedLender, nationalId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Bank Registration No *
                      </label>
                      <input
                        type="text"
                        value={selectedLender.bankRegistrationNo || ''}
                        onChange={(e) => setSelectedLender({...selectedLender, bankRegistrationNo: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          SWIFT Code (11-char)
                        </label>
                        <input
                          type="text"
                          value={selectedLender.swiftCode || ''}
                          onChange={(e) => setSelectedLender({...selectedLender, swiftCode: e.target.value.toUpperCase()})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={11}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Branch Code
                        </label>
                        <input
                          type="text"
                          value={selectedLender.branchCode || ''}
                          onChange={(e) => setSelectedLender({...selectedLender, branchCode: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={selectedLender.city || ''}
                          onChange={(e) => setSelectedLender({...selectedLender, city: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Country *
                        </label>
                        <input
                          type="text"
                          value={selectedLender.country || ''}
                          onChange={(e) => setSelectedLender({...selectedLender, country: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Address {selectedLender.lenderType === 'bank' ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    value={selectedLender.address || ''}
                    onChange={(e) => setSelectedLender({...selectedLender, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={selectedLender.lenderType === 'bank'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Notes
                  </label>
                  <textarea
                    value={selectedLender.notes || ''}
                    onChange={(e) => setSelectedLender({...selectedLender, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                {selectedLender.activeLoansCount > 0 && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      ⚠️ This lender has {selectedLender.activeLoansCount} active loan(s) with ${selectedLender.totalOutstanding.toFixed(2)} outstanding.
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setSelectedLender(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-secondary bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Update Lender
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </ContentLayout>
    </BusinessProtectedRoute>
  )
}
