'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert } from '@/components/ui/confirm-modal'
import { hasPermission } from '@/lib/permission-utils'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface BenefitType {
  id: string
  name: string
  description: string | null
  type: 'allowance' | 'insurance' | 'time_off' | 'bonus'
  defaultAmount: number | null
  isPercentage: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    employeeBenefits: number
    contractBenefits: number
  }
}

interface CompensationType {
  id: string
  name: string
  type: 'salary' | 'commission' | 'hourly' | 'contract'
  description: string | null
  baseAmount: number | null
  commissionPercentage: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    employees: number
    contracts: number
  }
}

interface BenefitFormData {
  name: string
  description: string
  type: 'allowance' | 'insurance' | 'time_off' | 'bonus'
  defaultAmount: string
  isPercentage: boolean
}

interface CompensationFormData {
  name: string
  type: 'salary' | 'commission' | 'hourly' | 'contract'
  description: string
  baseAmount: string
  commissionPercentage: string
}

export default function BenefitsPage() {
  const { data: session } = useSession()
  const customAlert = useAlert()
  const { format: globalDateFormat } = useDateFormat()
  const [benefitTypes, setBenefitTypes] = useState<BenefitType[]>([])
  const [compensationTypes, setCompensationTypes] = useState<CompensationType[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('benefits')
  
  // Modal states
  const [showBenefitModal, setShowBenefitModal] = useState(false)
  const [showCompensationModal, setShowCompensationModal] = useState(false)
  const [editingBenefit, setEditingBenefit] = useState<BenefitType | null>(null)
  const [editingCompensation, setEditingCompensation] = useState<CompensationType | null>(null)

  // Form states
  const [benefitForm, setBenefitForm] = useState<BenefitFormData>({
    name: '',
    description: '',
    type: 'allowance',
    defaultAmount: '',
    isPercentage: false
  })

  const [compensationForm, setCompensationForm] = useState<CompensationFormData>({
    name: '',
    type: 'salary',
    description: '',
    baseAmount: '',
    commissionPercentage: ''
  })

  // Search and filter states
  const [benefitSearch, setBenefitSearch] = useState('')
  const [benefitTypeFilter, setBenefitTypeFilter] = useState('')
  const [compensationSearch, setCompensationSearch] = useState('')
  const [compensationTypeFilter, setCompensationTypeFilter] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)

  const currentUser = session?.user as any
  const canManageBenefits = currentUser && hasPermission(currentUser, 'canManageBenefitTypes')
  const canManageCompensation = currentUser && hasPermission(currentUser, 'canManageCompensationTypes')
  const canViewBenefits = currentUser && (canManageBenefits || hasPermission(currentUser, 'canViewEmployees'))

  useEffect(() => {
    if (canViewBenefits) {
      fetchData()
    }
  }, [canViewBenefits, includeInactive])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (includeInactive) {
        params.append('includeInactive', 'true')
      }

      const [benefitsRes, compensationRes] = await Promise.all([
        fetch(`/api/benefit-types?${params}`),
        fetch(`/api/compensation-types?${params}`)
      ])

      if (benefitsRes.ok) setBenefitTypes(await benefitsRes.json())
      if (compensationRes.ok) setCompensationTypes(await compensationRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Benefit Management Functions
  const openBenefitModal = (benefit?: BenefitType) => {
    if (benefit) {
      setEditingBenefit(benefit)
      setBenefitForm({
        name: benefit.name,
        description: benefit.description || '',
        type: benefit.type,
        defaultAmount: benefit.defaultAmount?.toString() || '',
        isPercentage: benefit.isPercentage
      })
    } else {
      setEditingBenefit(null)
      setBenefitForm({
        name: '',
        description: '',
        type: 'allowance',
        defaultAmount: '',
        isPercentage: false
      })
    }
    setShowBenefitModal(true)
  }

  const closeBenefitModal = () => {
    setShowBenefitModal(false)
    setEditingBenefit(null)
    setBenefitForm({
      name: '',
      description: '',
      type: 'allowance',
      defaultAmount: '',
      isPercentage: false
    })
  }

  const handleBenefitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!benefitForm.name.trim()) {
      await customAlert({ title: 'Name required', description: 'Benefit name is required' })
      return
    }

    try {
      const url = editingBenefit ? `/api/benefit-types/${editingBenefit.id}` : '/api/benefit-types'
      const method = editingBenefit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...benefitForm,
          defaultAmount: benefitForm.defaultAmount ? parseFloat(benefitForm.defaultAmount) : null
        })
      })

      if (response.ok) {
        fetchData()
        closeBenefitModal()
      } else {
        const error = await response.json()
        await customAlert({ title: 'Save failed', description: error.error || 'Failed to save benefit type' })
      }
    } catch (error) {
      console.error('Error saving benefit type:', error)
      await customAlert({ title: 'Save failed', description: 'Failed to save benefit type' })
    }
  }

  // Compensation Management Functions
  const openCompensationModal = (compensation?: CompensationType) => {
    if (compensation) {
      setEditingCompensation(compensation)
      setCompensationForm({
        name: compensation.name,
        type: compensation.type,
        description: compensation.description || '',
        baseAmount: compensation.baseAmount?.toString() || '',
        commissionPercentage: compensation.commissionPercentage?.toString() || ''
      })
    } else {
      setEditingCompensation(null)
      setCompensationForm({
        name: '',
        type: 'salary',
        description: '',
        baseAmount: '',
        commissionPercentage: ''
      })
    }
    setShowCompensationModal(true)
  }

  const closeCompensationModal = () => {
    setShowCompensationModal(false)
    setEditingCompensation(null)
    setCompensationForm({
      name: '',
      type: 'salary',
      description: '',
      baseAmount: '',
      commissionPercentage: ''
    })
  }

  const handleCompensationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!compensationForm.name.trim()) {
      await customAlert({ title: 'Name required', description: 'Compensation type name is required' })
      return
    }

    try {
      const url = editingCompensation ? `/api/compensation-types/${editingCompensation.id}` : '/api/compensation-types'
      const method = editingCompensation ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...compensationForm,
          baseAmount: compensationForm.baseAmount ? parseFloat(compensationForm.baseAmount) : null,
          commissionPercentage: compensationForm.commissionPercentage ? parseFloat(compensationForm.commissionPercentage) : null
        })
      })

      if (response.ok) {
        fetchData()
        closeCompensationModal()
      } else {
        const error = await response.json()
        await customAlert({ title: 'Save failed', description: error.error || 'Failed to save compensation type' })
      }
    } catch (error) {
      console.error('Error saving compensation type:', error)
      await customAlert({ title: 'Save failed', description: 'Failed to save compensation type' })
    }
  }

  const toggleBenefitStatus = async (benefit: BenefitType) => {
    try {
      const response = await fetch(`/api/benefit-types/${benefit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: benefit.name,
          description: benefit.description,
          type: benefit.type,
          defaultAmount: benefit.defaultAmount,
          isPercentage: benefit.isPercentage,
          isActive: !benefit.isActive
        })
      })

      if (response.ok) {
        fetchData()
      } else {
        const error = await response.json()
        await customAlert({ title: 'Update failed', description: error.error || 'Failed to update benefit status' })
      }
    } catch (error) {
      console.error('Error updating benefit status:', error)
      await customAlert({ title: 'Update failed', description: 'Failed to update benefit status' })
    }
  }

  const toggleCompensationStatus = async (compensation: CompensationType) => {
    try {
      const response = await fetch(`/api/compensation-types/${compensation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: compensation.name,
          type: compensation.type,
          description: compensation.description,
          baseAmount: compensation.baseAmount,
          commissionPercentage: compensation.commissionPercentage,
          isActive: !compensation.isActive
        })
      })

      if (response.ok) {
        fetchData()
      } else {
        const error = await response.json()
        await customAlert({ title: 'Update failed', description: error.error || 'Failed to update compensation status' })
      }
    } catch (error) {
      console.error('Error updating compensation status:', error)
      await customAlert({ title: 'Update failed', description: 'Failed to update compensation status' })
    }
  }

  // Filter data
  const filteredBenefits = benefitTypes.filter(benefit => {
    const matchesSearch = benefit.name.toLowerCase().includes(benefitSearch.toLowerCase()) ||
                         benefit.description?.toLowerCase().includes(benefitSearch.toLowerCase())
    const matchesType = !benefitTypeFilter || benefit.type === benefitTypeFilter
    return matchesSearch && matchesType
  })

  const filteredCompensation = compensationTypes.filter(comp => {
    const matchesSearch = comp.name.toLowerCase().includes(compensationSearch.toLowerCase()) ||
                         comp.description?.toLowerCase().includes(compensationSearch.toLowerCase())
    const matchesType = !compensationTypeFilter || comp.type === compensationTypeFilter
    return matchesSearch && matchesType
  })

  if (!session) {
    return (
      <ContentLayout title="Benefits & Compensation">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to view benefits and compensation.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!canViewBenefits) {
    return (
      <ContentLayout title="Benefits & Compensation">
        <div className="text-center py-8">
          <p className="text-secondary">You don't have permission to view benefits and compensation.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Benefits & Compensation Management"
      subtitle="Manage employee benefit types and compensation structures"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin', href: '/admin' },
        { label: 'Benefits & Compensation', isActive: true }
      ]}
      headerActions={
        <div className="flex space-x-3">
          {canManageBenefits && (
            <button onClick={() => openBenefitModal()} className="btn-secondary">
              <span className="mr-2">+</span>
              Add Benefit Type
            </button>
          )}
          {canManageCompensation && (
            <button onClick={() => openCompensationModal()} className="btn-primary">
              <span className="mr-2">+</span>
              Add Compensation Type
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Common Filters */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('benefits')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'benefits'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Benefit Types ({benefitTypes.length})
              </button>
              <button
                onClick={() => setActiveTab('compensation')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'compensation'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Compensation Types ({compensationTypes.length})
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-secondary">Include inactive</span>
              </label>
              <button 
                onClick={fetchData}
                className="btn-secondary"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Benefits Tab */}
        {activeTab === 'benefits' && (
          <div className="space-y-6">
            {/* Benefits Search */}
            <div className="card p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Search Benefits
                  </label>
                  <input
                    type="text"
                    value={benefitSearch}
                    onChange={(e) => setBenefitSearch(e.target.value)}
                    placeholder="🔍 Search by name or description..."
                    className="input w-full px-4 py-2.5 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Benefit Type
                  </label>
                  <select
                    value={benefitTypeFilter}
                    onChange={(e) => setBenefitTypeFilter(e.target.value)}
                    className="input w-full px-4 py-2.5 text-base"
                  >
                    <option value="">All Types</option>
                    <option value="allowance">Allowance</option>
                    <option value="insurance">Insurance</option>
                    <option value="time_off">Time Off</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Benefits Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['allowance', 'insurance', 'time_off', 'bonus'].map(type => (
                <div key={type} className="card p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 dark:text-blue-300 text-sm font-semibold">
                        {type === 'allowance' ? '💰' : type === 'insurance' ? '🏥' : type === 'time_off' ? '🏖️' : '🎁'}
                      </span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {filteredBenefits.filter(b => b.type === type).length}
                      </p>
                      <p className="text-sm text-secondary capitalize">{type.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Benefits List */}
            <div className="card">
              {loading ? (
                <div className="p-8 text-center">
                  <p className="text-secondary">Loading benefits...</p>
                </div>
              ) : filteredBenefits.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-secondary">No benefits found matching your criteria.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredBenefits.map((benefit) => (
                    <div key={benefit.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-primary">{benefit.name}</h3>
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded capitalize">
                              {benefit.type.replace('_', ' ')}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                              benefit.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200' 
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                            }`}>
                              {benefit.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          {benefit.description && (
                            <p className="text-sm text-secondary mb-3">{benefit.description}</p>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-secondary">Default Amount:</span>
                              <p className="text-primary">
                                {benefit.defaultAmount 
                                  ? (benefit.isPercentage ? `${benefit.defaultAmount}%` : formatCurrency(benefit.defaultAmount))
                                  : 'Not set'
                                }
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-secondary">Usage:</span>
                              <p className="text-primary">
                                {benefit._count.employeeBenefits} employees, {benefit._count.contractBenefits} contracts
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-secondary">Created:</span>
                              <p className="text-primary">{formatDateByFormat(benefit.createdAt, globalDateFormat)}</p>
                            </div>
                          </div>
                        </div>

                        {canManageBenefits && (
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => openBenefitModal(benefit)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleBenefitStatus(benefit)}
                              className={`${
                                benefit.isActive 
                                  ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300' 
                                  : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                              }`}
                            >
                              {benefit.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compensation Tab */}
        {activeTab === 'compensation' && (
          <div className="space-y-6">
            {/* Compensation Search */}
            <div className="card p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Search Compensation Types
                  </label>
                  <input
                    type="text"
                    value={compensationSearch}
                    onChange={(e) => setCompensationSearch(e.target.value)}
                    placeholder="🔍 Search by name or description..."
                    className="input w-full px-4 py-2.5 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Compensation Type
                  </label>
                  <select
                    value={compensationTypeFilter}
                    onChange={(e) => setCompensationTypeFilter(e.target.value)}
                    className="input w-full px-4 py-2.5 text-base"
                  >
                    <option value="">All Types</option>
                    <option value="salary">Salary</option>
                    <option value="commission">Commission</option>
                    <option value="hourly">Hourly</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Compensation Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['salary', 'commission', 'hourly', 'contract'].map(type => (
                <div key={type} className="card p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-green-600 dark:text-green-300 text-sm font-semibold">
                        {type === 'salary' ? '💵' : type === 'commission' ? '📈' : type === 'hourly' ? '⏰' : '📋'}
                      </span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {filteredCompensation.filter(c => c.type === type).length}
                      </p>
                      <p className="text-sm text-secondary capitalize">{type}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Compensation List */}
            <div className="card">
              {loading ? (
                <div className="p-8 text-center">
                  <p className="text-secondary">Loading compensation types...</p>
                </div>
              ) : filteredCompensation.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-secondary">No compensation types found matching your criteria.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCompensation.map((compensation) => (
                    <div key={compensation.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-primary">{compensation.name}</h3>
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded capitalize">
                              {compensation.type}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                              compensation.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200' 
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                            }`}>
                              {compensation.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          {compensation.description && (
                            <p className="text-sm text-secondary mb-3">{compensation.description}</p>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-secondary">Base Amount:</span>
                              <p className="text-primary">{formatCurrency(compensation.baseAmount)}</p>
                            </div>
                            <div>
                              <span className="font-medium text-secondary">Commission %:</span>
                              <p className="text-primary">
                                {compensation.commissionPercentage ? `${compensation.commissionPercentage}%` : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-secondary">Usage:</span>
                              <p className="text-primary">
                                {compensation._count.employees} employees, {compensation._count.contracts} contracts
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-secondary">Created:</span>
                              <p className="text-primary">{formatDateByFormat(compensation.createdAt, globalDateFormat)}</p>
                            </div>
                          </div>
                        </div>

                        {canManageCompensation && (
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => openCompensationModal(compensation)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleCompensationStatus(compensation)}
                              className={`${
                                compensation.isActive 
                                  ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300' 
                                  : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                              }`}
                            >
                              {compensation.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Benefit Modal */}
      {showBenefitModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
          <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg bg-white dark:bg-gray-800 rounded-md shadow-lg border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-primary mb-4">
                {editingBenefit ? 'Edit Benefit Type' : 'Create New Benefit Type'}
              </h3>
              
              <form onSubmit={handleBenefitSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={benefitForm.name}
                    onChange={(e) => setBenefitForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input w-full px-4 py-2.5 text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Type *
                  </label>
                  <select
                    value={benefitForm.type}
                    onChange={(e) => setBenefitForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="input w-full px-4 py-2.5 text-base"
                    required
                  >
                    <option value="allowance">Allowance</option>
                    <option value="insurance">Insurance</option>
                    <option value="time_off">Time Off</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={benefitForm.description}
                    onChange={(e) => setBenefitForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="input w-full px-4 py-2.5 text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Default Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={benefitForm.defaultAmount}
                      onChange={(e) => setBenefitForm(prev => ({ ...prev, defaultAmount: e.target.value }))}
                      className="input w-full px-4 py-2.5 text-base"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={benefitForm.isPercentage}
                        onChange={(e) => setBenefitForm(prev => ({ ...prev, isPercentage: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      <span className="text-sm text-secondary">Percentage</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={closeBenefitModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingBenefit ? 'Update' : 'Create'} Benefit Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Compensation Modal */}
      {showCompensationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
          <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg bg-white dark:bg-gray-800 rounded-md shadow-lg border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-primary mb-4">
                {editingCompensation ? 'Edit Compensation Type' : 'Create New Compensation Type'}
              </h3>
              
              <form onSubmit={handleCompensationSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={compensationForm.name}
                    onChange={(e) => setCompensationForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input w-full px-4 py-2.5 text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Type *
                  </label>
                  <select
                    value={compensationForm.type}
                    onChange={(e) => setCompensationForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="input w-full px-4 py-2.5 text-base"
                    required
                  >
                    <option value="salary">Salary</option>
                    <option value="commission">Commission</option>
                    <option value="hourly">Hourly</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={compensationForm.description}
                    onChange={(e) => setCompensationForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="input w-full px-4 py-2.5 text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Base Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={compensationForm.baseAmount}
                      onChange={(e) => setCompensationForm(prev => ({ ...prev, baseAmount: e.target.value }))}
                      className="input w-full px-4 py-2.5 text-base"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Commission %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={compensationForm.commissionPercentage}
                      onChange={(e) => setCompensationForm(prev => ({ ...prev, commissionPercentage: e.target.value }))}
                      className="input w-full px-4 py-2.5 text-base"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={closeCompensationModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingCompensation ? 'Update' : 'Create'} Compensation Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}