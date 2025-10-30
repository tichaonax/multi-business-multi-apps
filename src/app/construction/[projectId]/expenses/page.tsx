'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DateInput } from '@/components/ui/date-input'
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'

interface Project {
  id: string
  name: string
  description: string
}

interface Transaction {
  id: string
  transactionType: string
  amount: number
  description: string
  createdAt: string
  status: string
  recipientPerson?: {
    id: string
    fullName: string
    phone: string
    email: string
  }
  stage?: {
    id: string
    name: string
    status: string
  }
  personalExpense?: {
    id: string
    amount: number
    description: string
    date: string
    category: string
  }
  projectContractor?: {
    person: {
      id: string
      fullName: string
      phone: string
      email: string
    }
  }
}

export default function ProjectExpensesPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const { format: globalDateFormat } = useDateFormat()
  
  const [project, setProject] = useState<Project | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [contractors, setContractors] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const customAlert = useAlert()
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [showStatusModal, setShowStatusModal] = useState<{ transactionId: string, currentStatus: string } | null>(null)
  const [showEditModal, setShowEditModal] = useState<Transaction | null>(null)
  const [showContractorModal, setShowContractorModal] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    transactionType: 'project_expense',
    paymentCategory: '',
    stageId: '',
    paymentMethod: '',
    referenceNumber: '',
    notes: ''
  })
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    description: '',
    contractorId: '',
    stageId: '',
    transactionType: 'contractor_payment',
    paymentMethod: '',
    referenceNumber: '',
    notes: ''
  })
  const [contractorForm, setContractorForm] = useState({
    fullName: '',
    phone: '',
    nationalId: '',
    email: '',
    address: '',
    role: '',
    notes: '',
    idFormatTemplateId: ''
  })
  const [showStageModal, setShowStageModal] = useState(false)
  const [stageForm, setStageForm] = useState({
    name: '',
    description: '',
    estimatedAmount: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchTransactions()
    }
  }, [projectId])
  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/construction/projects/${projectId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch project')
      }
      const data = await response.json()
      setProject(data)
    } catch (error) {
      console.error('Error fetching project:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/construction/projects/${projectId}/transactions`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/personal/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchStages = async () => {
    try {
      const response = await fetch(`/api/construction/projects/${projectId}/stages`)
      if (response.ok) {
        const data = await response.json()
        setStages(data)
      }
    } catch (error) {
      console.error('Error fetching stages:', error)
    }
  }

  const fetchContractors = async () => {
    try {
      const response = await fetch(`/api/construction/projects/${projectId}/contractors`)
      if (response.ok) {
        const data = await response.json()
        setContractors(data)
      }
    } catch (error) {
      console.error('Error fetching contractors:', error)
    }
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseForm.amount || !expenseForm.description) return
    
    setSubmitting(true)
    try {
      // First create a personal expense
      const expenseResponse = await fetch('/api/personal/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description,
          category: expenseForm.category || 'Other',
          date: expenseForm.date,
          paymentType: 'project'
        })
      })

      if (!expenseResponse.ok) {
        throw new Error('Failed to create personal expense')
      }

      const personalExpense = await expenseResponse.json()

      // Then create the project transaction
      const transactionResponse = await fetch(`/api/construction/projects/${projectId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalExpenseId: personalExpense.id,
          stageId: expenseForm.stageId || null,
          transactionType: expenseForm.transactionType,
          paymentCategory: expenseForm.paymentCategory || null,
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description,
          paymentMethod: expenseForm.paymentMethod || null,
          referenceNumber: expenseForm.referenceNumber || null,
          notes: expenseForm.notes || null
        })
      })

      if (transactionResponse.ok) {
        setExpenseForm({
          amount: '',
          description: '',
          category: '',
          date: new Date().toISOString().split('T')[0],
          transactionType: 'project_expense',
          paymentCategory: '',
          stageId: '',
          paymentMethod: '',
          referenceNumber: '',
          notes: ''
        })
        setShowExpenseModal(false)
        fetchTransactions() // Refresh transactions
      } else {
        const error = await transactionResponse.json()
        await customAlert({ title: 'Create expense failed', description: error.error || 'Failed to create project expense' })
      }
    } catch (error) {
      console.error('Error creating expense:', error)
      await customAlert({ title: 'Create expense failed', description: 'Failed to create expense' })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm.amount || !paymentForm.description || !paymentForm.contractorId) return
    
    setSubmitting(true)
    try {
      // First create a personal expense
      const expenseResponse = await fetch('/api/personal/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          description: paymentForm.description,
          category: 'Contractor Payment',
          date: new Date().toISOString().split('T')[0],
          paymentType: 'contractor',
          contractorId: paymentForm.contractorId
        })
      })

      if (!expenseResponse.ok) {
        throw new Error('Failed to create personal expense')
      }

      const personalExpense = await expenseResponse.json()

      // Then create the project transaction
      const transactionResponse = await fetch(`/api/construction/projects/${projectId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalExpenseId: personalExpense.id,
          projectContractorId: paymentForm.contractorId,
          stageId: paymentForm.stageId || null,
          transactionType: paymentForm.transactionType,
          amount: parseFloat(paymentForm.amount),
          description: paymentForm.description,
          paymentMethod: paymentForm.paymentMethod || null,
          referenceNumber: paymentForm.referenceNumber || null,
          notes: paymentForm.notes || null
        })
      })

      if (transactionResponse.ok) {
        setPaymentForm({
          amount: '',
          description: '',
          contractorId: '',
          stageId: '',
          transactionType: 'contractor_payment',
          paymentMethod: '',
          referenceNumber: '',
          notes: ''
        })
        setShowPaymentModal(false)
        fetchTransactions() // Refresh transactions
      } else {
        const error = await transactionResponse.json()
        await customAlert({ title: 'Record payment failed', description: error.error || 'Failed to record payment' })
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      await customAlert({ title: 'Record payment failed', description: 'Failed to record payment' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleContractorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractorForm.fullName || !contractorForm.phone || !contractorForm.nationalId) return
    
    setSubmitting(true)
    try {
      // Create person first
      const personResponse = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: contractorForm.fullName,
          phone: contractorForm.phone,
          nationalId: contractorForm.nationalId,
          email: contractorForm.email || null,
          address: contractorForm.address || null,
          notes: contractorForm.notes || null,
          idFormatTemplateId: contractorForm.idFormatTemplateId || null
        })
      })

      if (!personResponse.ok) {
        const error = await personResponse.json()
        await customAlert({ title: 'Create person failed', description: error.error || 'Failed to create person' })
        return
      }

      const person = await personResponse.json()

      // Then assign person to project as contractor
      const contractorResponse = await fetch(`/api/construction/projects/${projectId}/contractors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: person.id,
          role: contractorForm.role || null,
          isPrimary: false
        })
      })

      if (contractorResponse.ok) {
        const newContractor = await contractorResponse.json()
        
  // Update contractors list first
  await fetchContractors()
        
        // Then select the new contractor and close modal
        setPaymentForm({ ...paymentForm, contractorId: newContractor.id })
        
        // Reset form and close modal
        setContractorForm({
          fullName: '',
          phone: '',
          nationalId: '',
          email: '',
          address: '',
          role: '',
          notes: '',
          idFormatTemplateId: ''
        })
        setShowContractorModal(false)
        
  // Show success message
  await customAlert({ title: 'Contractor added', description: `Contractor "${newContractor.persons.fullName}" has been added to the project and selected for payment.` })
      } else {
        const error = await contractorResponse.json()
        await customAlert({ title: 'Assign failed', description: error.error || 'Failed to assign contractor to project' })
      }
    } catch (error) {
      console.error('Error creating contractor:', error)
      await customAlert({ title: 'Create contractor failed', description: 'Failed to create contractor' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stageForm.name) return
    
    setSubmitting(true)
    try {
      const response = await fetch(`/api/construction/projects/${projectId}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stageForm.name,
          description: stageForm.description || null,
          estimatedAmount: stageForm.estimatedAmount ? parseFloat(stageForm.estimatedAmount) : null,
          startDate: stageForm.startDate || null,
          endDate: stageForm.endDate || null
        })
      })

      if (response.ok) {
        const newStage = await response.json()
        
        // Update stages list first
        await fetchStages()
        
  // Then select the new stage and close modal
        setPaymentForm({ ...paymentForm, stageId: newStage.id })
        
        // Reset form and close modal
        setStageForm({
          name: '',
          description: '',
          estimatedAmount: '',
          startDate: '',
          endDate: ''
        })
        setShowStageModal(false)
        
  // Show success message
  await customAlert({ title: 'Stage added', description: `Project stage "${newStage.name}" has been added and selected.` })
      } else {
        const error = await response.json()
        await customAlert({ title: 'Create stage failed', description: error.error || 'Failed to create project stage' })
      }
    } catch (error) {
      console.error('Error creating stage:', error)
      await customAlert({ title: 'Create stage failed', description: 'Failed to create project stage' })
    } finally {
      setSubmitting(false)
    }
  }

  const updateTransactionStatus = async (transactionId: string, newStatus: string) => {
    setUpdatingStatus(transactionId)
    try {
      const response = await fetch(`/api/construction/projects/${projectId}/transactions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          status: newStatus
        })
      })

      if (response.ok) {
        fetchTransactions() // Refresh transactions
        setShowStatusModal(null)
      } else {
        const error = await response.json()
        await customAlert({ title: 'Update failed', description: error.error || 'Failed to update status' })
      }
    } catch (error) {
      console.error('Error updating transaction status:', error)
      await customAlert({ title: 'Update failed', description: 'Failed to update transaction status' })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const getStatusActions = (transaction: Transaction) => {
    const { id, status } = transaction
    const actions = []

    if (status === 'pending') {
      actions.push(
        <button
          key="mark-paid"
          onClick={() => setShowStatusModal({ transactionId: id, currentStatus: status })}
          className="text-green-600 hover:text-green-800 text-sm font-medium"
          disabled={updatingStatus === id}
        >
          {updatingStatus === id ? 'Updating...' : 'Mark as Paid'}
        </button>
      )
    }

    if (status === 'pending' || status === 'approved') {
      actions.push(
        <button
          key="cancel"
          onClick={() => updateTransactionStatus(id, 'cancelled')}
          className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
          disabled={updatingStatus === id}
        >
          Cancel
        </button>
      )
    }

    return actions
  }

  if (loading) {
    return (
      <BusinessTypeRoute requiredBusinessType="construction">
        <ContentLayout title="Loading...">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    )
  }

  if (!project) {
    return (
      <BusinessTypeRoute requiredBusinessType="construction">
        <ContentLayout title="Project Not Found">
          <div className="text-center py-12">
            <p className="text-secondary mb-4">The requested project could not be found.</p>
            <Link href="/construction" className="btn-primary">
              Back to Projects
            </Link>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'contractor_payment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'deposit':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'project_expense':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return formatDateByFormat(dateString, globalDateFormat)
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (activeTab === 'all') return true
    if (activeTab === 'payments') return transaction.transactionType === 'contractor_payment' || transaction.transactionType === 'deposit'
    if (activeTab === 'expenses') return transaction.transactionType === 'project_expense'
    return true
  })

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <BusinessTypeRoute requiredBusinessType="construction">
      <ContentLayout
        title={`${project.name} - Expenses`}
        subtitle="Manage project expenses, contractor payments, and cost tracking"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Construction', href: '/construction' },
          { label: project.name, href: `/construction/${projectId}` },
          { label: 'Expenses', isActive: true }
        ]}
        headerActions={
          <div className="flex space-x-2">
            <button 
              className="btn-primary"
              onClick={() => {
                setShowExpenseModal(true)
                fetchCategories()
                fetchStages()
              }}
            >
              Add Expense
            </button>
            <button 
              className="btn-secondary"
              onClick={() => {
                setShowPaymentModal(true)
                fetchContractors()
                fetchStages()
              }}
            >
              Record Payment
            </button>
            <button
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Back
            </button>
          </div>
        }
      >
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-sm font-medium text-secondary">Total Transactions</div>
            <div className="text-2xl font-bold text-primary">{transactions.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-secondary">Contractor Payments</div>
            <div className="text-2xl font-bold text-blue-600">
              {transactions.filter(t => t.transactionType === 'contractor_payment' || t.transactionType === 'deposit').length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-secondary">Project Expenses</div>
            <div className="text-2xl font-bold text-orange-600">
              {transactions.filter(t => t.transactionType === 'project_expense').length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-secondary">Total Amount</div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'all', name: 'All Transactions' },
                { id: 'payments', name: 'Contractor Payments' },
                { id: 'expenses', name: 'Project Expenses' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-secondary hover:text-primary hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Recipient/Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-secondary">
                      No transactions found for this project.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr 
                      key={transaction.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => setShowEditModal(transaction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(transaction.transactionType)}`}>
                          {transaction.transactionType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-primary">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {transaction.recipientPerson?.fullName || 
                         transaction.projectContractor?.persons?.fullName || 
                         transaction.stage?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex space-x-2">
                          {getStatusActions(transaction)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Expense Modal */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
            <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleExpenseSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-primary">Add Project Expense</h3>
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Amount *
                      </label>
                      <input
                        type="number"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <DateInput
                      value={expenseForm.date}
                      onChange={(date) => setExpenseForm({ ...expenseForm, date })}
                      label="Date"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., Materials, Equipment rental"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Category
                      </label>
                      <select
                        value={expenseForm.category}
                        onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select category...</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.name}>
                            {category.emoji} {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Payment Category
                      </label>
                      <select
                        value={expenseForm.paymentCategory}
                        onChange={(e) => setExpenseForm({ ...expenseForm, paymentCategory: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select type...</option>
                        <option value="materials">Materials</option>
                        <option value="fuel">Fuel</option>
                        <option value="equipment">Equipment</option>
                        <option value="labor">Labor</option>
                        <option value="permits">Permits</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Project Stage
                    </label>
                    <select
                      value={expenseForm.stageId}
                      onChange={(e) => setExpenseForm({ ...expenseForm, stageId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">No specific stage</option>
                      {stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Payment Method
                      </label>
                      <select
                        value={expenseForm.paymentMethod}
                        onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select method...</option>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="check">Check</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={expenseForm.referenceNumber}
                        onChange={(e) => setExpenseForm({ ...expenseForm, referenceNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Receipt/Invoice #"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Notes
                    </label>
                    <textarea
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={2}
                      placeholder="Additional notes about this expense"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting || !expenseForm.amount || !expenseForm.description}
                  >
                    {submitting ? 'Adding...' : 'Add Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
            <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
              <form onSubmit={handlePaymentSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-primary">Record Contractor Payment</h3>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Contractor *
                    </label>
                    <select
                      value={paymentForm.contractorId}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') {
                          setShowContractorModal(true)
                        } else {
                          setPaymentForm({ ...paymentForm, contractorId: e.target.value })
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Select contractor...</option>
                      {contractors.map((contractor) => (
                        <option key={contractor.id} value={contractor.id}>
                          {contractor.persons.fullName} - {contractor.role || 'No role specified'}
                        </option>
                      ))}
                      <option value="ADD_NEW" className="font-semibold text-blue-600">+ Add New Contractor</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Amount *
                      </label>
                      <input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Payment Type
                      </label>
                      <select
                        value={paymentForm.transactionType}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transactionType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="contractor_payment">Payment</option>
                        <option value="deposit">Deposit</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., Weekly payment, Deposit for materials"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Project Stage
                    </label>
                    <select
                      value={paymentForm.stageId}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') {
                          setShowStageModal(true)
                        } else {
                          setPaymentForm({ ...paymentForm, stageId: e.target.value })
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">No specific stage</option>
                      {stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                      <option value="ADD_NEW" className="font-semibold text-blue-600">+ Add New Stage</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Payment Method
                      </label>
                      <select
                        value={paymentForm.paymentMethod}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select method...</option>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="check">Check</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={paymentForm.referenceNumber}
                        onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Transaction/Check #"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Notes
                    </label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={2}
                      placeholder="Additional notes about this payment"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting || !paymentForm.amount || !paymentForm.description || !paymentForm.contractorId}
                  >
                    {submitting ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Status Update Confirmation Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
            <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-primary">Update Transaction Status</h3>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <p className="text-sm text-secondary mb-6">
                Are you sure you want to mark this transaction as paid? This action confirms that the payment has been completed.
              </p>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(null)}
                  className="btn-secondary"
                  disabled={updatingStatus === showStatusModal.transactionId}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => updateTransactionStatus(showStatusModal.transactionId, 'paid')}
                  className="btn-primary"
                  disabled={updatingStatus === showStatusModal.transactionId}
                >
                  {updatingStatus === showStatusModal.transactionId ? 'Updating...' : 'Mark as Paid'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
            <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-primary">Transaction Details</h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Transaction Type
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(showEditModal.transactionType)}`}>
                        {showEditModal.transactionType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Status
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(showEditModal.status)}`}>
                        {showEditModal.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Amount
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-primary font-medium">
                      {formatCurrency(showEditModal.amount)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Date
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-primary">
                      {formatDate(showEditModal.createdAt)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Description
                  </label>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-primary">
                    {showEditModal.description}
                  </div>
                </div>

                {showEditModal.projectContractor && (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Contractor
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-primary font-medium">
                            {showEditModal.projectContractor.persons?.fullName || 'Unknown Contractor'}
                          </div>
                          {showEditModal.projectContractor.persons?.email && (
                            <div className="text-secondary text-sm">
                              {showEditModal.projectContractor.persons.email}
                            </div>
                          )}
                          {showEditModal.projectContractor.persons?.phone && (
                            <div className="text-secondary text-sm">
                              {formatPhoneNumberForDisplay(showEditModal.projectContractor.persons.phone)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // TODO: Navigate to contractor details page
                            window.open(`/construction/${projectId}/contractors/${showEditModal.projectContractor?.id}`, '_blank')
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showEditModal.recipientPerson && (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Recipient
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <div className="text-primary font-medium">
                        {showEditModal.recipientPerson.fullName}
                      </div>
                      {showEditModal.recipientPerson.email && (
                        <div className="text-secondary text-sm">
                          {showEditModal.recipientPerson.email}
                        </div>
                      )}
                      {showEditModal.recipientPerson.phone && (
                        <div className="text-secondary text-sm">
                          {formatPhoneNumberForDisplay(showEditModal.recipientPerson.phone)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showEditModal.stage && (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Project Stage
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-primary">
                      {showEditModal.stage.name}
                    </div>
                  </div>
                )}

                {showEditModal.personalExpense && (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Personal Expense Details
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <div className="text-primary">
                        Category: {showEditModal.personalExpense.category}
                      </div>
                      <div className="text-secondary text-sm">
                        Date: {formatDate(showEditModal.personalExpense.date)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
                {showEditModal.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowStatusModal({ transactionId: showEditModal.id, currentStatus: showEditModal.status })
                      setShowEditModal(null)
                    }}
                    className="btn-primary"
                  >
                    Mark as Paid
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Contractor Modal */}
        {showContractorModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
            <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleContractorSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-primary">Add New Contractor</h3>
                  <button
                    type="button"
                    onClick={() => setShowContractorModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={contractorForm.fullName}
                      onChange={(e) => setContractorForm({ ...contractorForm, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Enter contractor's full name"
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <PhoneNumberInput
                      value={contractorForm.phone}
                      onChange={(fullPhoneNumber) => setContractorForm({ ...contractorForm, phone: fullPhoneNumber })}
                      label="Phone"
                      required
                    />
                    <NationalIdInput
                      value={contractorForm.nationalId}
                      templateId={contractorForm.idFormatTemplateId}
                      onChange={(nationalId, templateId) => setContractorForm({ 
                        ...contractorForm, 
                        nationalId,
                        idFormatTemplateId: templateId || contractorForm.idFormatTemplateId
                      })}
                      onTemplateChange={(templateId) => setContractorForm({ ...contractorForm, idFormatTemplateId: templateId })}
                      label="National ID"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={contractorForm.email}
                      onChange={(e) => setContractorForm({ ...contractorForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="contractor@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Role/Specialty
                    </label>
                    <input
                      type="text"
                      value={contractorForm.role}
                      onChange={(e) => setContractorForm({ ...contractorForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., Electrician, Plumber, General Contractor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Address
                    </label>
                    <textarea
                      value={contractorForm.address}
                      onChange={(e) => setContractorForm({ ...contractorForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={2}
                      placeholder="Contractor's address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Notes
                    </label>
                    <textarea
                      value={contractorForm.notes}
                      onChange={(e) => setContractorForm({ ...contractorForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={2}
                      placeholder="Additional notes about this contractor"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowContractorModal(false)}
                    className="btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting || !contractorForm.fullName || !contractorForm.phone || !contractorForm.nationalId}
                  >
                    {submitting ? 'Adding...' : 'Add Contractor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Stage Modal */}
        {showStageModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
            <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800 border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleStageSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-primary">Add New Project Stage</h3>
                  <button
                    type="button"
                    onClick={() => setShowStageModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Stage Name *
                    </label>
                    <input
                      type="text"
                      value={stageForm.name}
                      onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., Foundation, Framing, Roofing"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Description
                    </label>
                    <textarea
                      value={stageForm.description}
                      onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={2}
                      placeholder="Brief description of this project stage"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Estimated Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={stageForm.estimatedAmount}
                      onChange={(e) => setStageForm({ ...stageForm, estimatedAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-4">
                    <DateInput
                      value={stageForm.startDate}
                      onChange={(date) => setStageForm({ ...stageForm, startDate: date })}
                      label="Start Date"
                      placeholder="Select start date"
                      showCountrySelector={false}
                    />

                    <DateInput
                      value={stageForm.endDate}
                      onChange={(date) => setStageForm({ ...stageForm, endDate: date })}
                      label="End Date"
                      placeholder="Select end date"
                      showCountrySelector={false}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowStageModal(false)}
                    className="btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting || !stageForm.name}
                  >
                    {submitting ? 'Adding...' : 'Add Stage'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </ContentLayout>
    </BusinessTypeRoute>
  )
}