'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { DateInput } from '@/components/ui/date-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { hasUserPermission, getAvailableBusinessTypesForProjects, canCreateProjectsForBusinessType } from '@/lib/permission-utils'
import { ProjectCreationModal } from '@/components/projects/project-creation-modal'
import { PersonRegistrationForm } from '@/components/construction/person-registration-form'
import { CategorySelector } from '@/components/personal/category-selector'
import { SubcategoryCreator } from '@/components/personal/subcategory-creator'
import { useAlert } from '@/components/ui/confirm-modal'

interface Category {
  id: string
  name: string
  emoji: string
  color: string
}

interface Project {
  id: string
  name: string
  description?: string
  businessType?: string
  projectType?: {
    id: string
    name: string
    businessType: string
  }
}

interface ProjectType {
  id: string
  name: string
  description?: string
  businessType: string
  isActive: boolean
  isSystem: boolean
}

interface Contractor {
  id: string
  name: string
  projectId: string | null
  email?: string
  phone?: string
  nationalId?: string
  idTemplateId?: string
  createdAt?: string
  person?: {
    id: string
    fullName: string
    email?: string
    phone?: string
    nationalId?: string
    idTemplateId?: string
    isActive: boolean
  }
}

interface Recipient {
  id: string
  name: string
  type: 'business' | 'person'
  subtype: string
  description?: string
  identifier: string
}

interface Loan {
  id: string
  loanNumber: string
  principalAmount: number
  remainingBalance: number
  interestRate: number
  lenderType: string
  borrowerBusiness: {
    name: string
  }
  lenderBusiness?: {
    name: string
  }
  status: string
}

export default function NewExpensePage() {
  const customAlert = useAlert()
  const { data: session } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [projectContractors, setProjectContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<number>(0)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [sourcePage, setSourcePage] = useState<'dashboard' | 'personal'>('personal')
  const [availableBusinessTypes, setAvailableBusinessTypes] = useState<Array<{value: string, label: string}>>([])

  // Loan-related state
  const [recipients, setRecipients] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [availableBalance, setAvailableBalance] = useState<number>(0)

  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [showNewContractorForm, setShowNewContractorForm] = useState(false)
  const [showNewPersonForm, setShowNewPersonForm] = useState(false)
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)

  // New category system state
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [showSubcategoryCreator, setShowSubcategoryCreator] = useState(false)
  const [selectedCategoryForCreator, setSelectedCategoryForCreator] = useState<{
    id: string;
    name: string;
    emoji: string;
  } | null>(null)
  const [newProject, setNewProject] = useState({ name: '', description: '' })
  const [newContractor, setNewContractor] = useState({
    name: '',
    email: '',
    phone: '',
    phoneCountryCode: '',
    description: '',
    nationalId: '',
    idTemplateId: ''
  })
  const [newCategory, setNewCategory] = useState({ name: '', emoji: '💰', color: '#3B82F6' })

  // Check if user has permission to add personal expenses
  if (!session?.user || !hasUserPermission(session.user, 'canAddPersonalExpenses')) {
    return (
      <ProtectedRoute>
        <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-4">Access Denied</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">
            You don't have permission to add personal expenses. Please contact your administrator to request the "Add Expenses" permission.
          </p>
          <Link
            href="/personal"
            className="btn-secondary"
          >
            ← Back to Personal Finance
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    paymentType: 'category', // 'category', 'project', 'contractor', 'loan'
    businessType: 'personal', // business type for project filtering
    projectType: 'generic', // only generic projects are supported
    projectTypeId: '', // for creating new generic projects
    projectId: '',
    contractorId: '',
    projectSubType: 'expense', // 'expense' for general, 'contractor' for contractor payment
    notes: '',
    date: new Date().toISOString().split('T')[0],
    // Loan-related fields
    loanType: 'createNew', // 'createNew', 'existing'
    recipientType: 'business', // 'business', 'person', 'employee'
    loanId: '',
    interestRate: '0',
    terms: '',
    dueDate: ''
  })

  useEffect(() => {
    // Detect source page from URL params or referrer
    const urlParams = new URLSearchParams(window.location.search)
    const sourceParam = urlParams.get('source')

    if (sourceParam === 'dashboard') {
      setSourcePage('dashboard')
    } else if (sourceParam === 'personal') {
      setSourcePage('personal')
    } else {
      // Fall back to checking document referrer
      const referrer = document.referrer
      if (referrer.includes('/dashboard')) {
        setSourcePage('dashboard')
      } else {
        setSourcePage('personal')
      }
    }

    // Set available business types based on user permissions
    if (session?.user) {
      const businessTypes = getAvailableBusinessTypesForProjects(session.user as any)
      setAvailableBusinessTypes(businessTypes)
    }

    // Fetch balance
    fetchBalance()

    // Fetch categories
    fetch('/api/personal/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data)
        } else {
          console.error('Categories API returned non-array:', data)
          setCategories([])
        }
      })
      .catch((error) => {
        console.error('Failed to fetch categories:', error)
        setCategories([])
      })

    // Generic projects will be fetched when business type is selected

    // Fetch project types
    fetch('/api/project-types')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProjectTypes(data)
        } else {
          console.error('Project types API returned non-array:', data)
          setProjectTypes([])
        }
      })
      .catch((error) => {
        console.error('Failed to fetch project types:', error)
        setProjectTypes([])
      })

    // Fetch contractors from global persons API
    fetch('/api/persons?isActive=true')
      .then(res => res.json())
      .then(data => {
        // Ensure data is an array and map to contractor format
        if (Array.isArray(data)) {
          const contractorData = data.map(person => ({
            id: person.id,
            name: person.fullName,
            projectId: null, // Global contractors don't have specific project assignments
            email: person.email,
            phone: person.phone,
            nationalId: person.nationalId,
            idTemplateId: person.idFormatTemplateId,
            createdAt: person.createdAt,
            person: person,
            constructionProject: null
          }))
          setContractors(contractorData)
        } else {
          console.warn('Persons API returned non-array:', data)
          setContractors([])
        }
      })
      .catch((error) => {
        console.warn('Failed to fetch contractors:', error)
        setContractors([])
      })

  }, [])

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true)
      const response = await fetch('/api/personal/budget')
      if (response.ok) {
        const data = await response.json()
        setBalance(data.balance || 0)
      } else {
        console.error('Failed to fetch balance')
        setBalance(0)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance(0)
    } finally {
      setBalanceLoading(false)
    }
  }

  // Load projects when business type changes
  useEffect(() => {
    if (formData.businessType && formData.paymentType === 'project') {
      // Fetch generic projects for the selected business type
      fetch(`/api/projects?businessType=${formData.businessType}`)
        .then(res => {
          if (!res.ok) {
            // Handle error responses (403, 500, etc.)
            return res.json().then(errorData => {
              console.error(`Failed to fetch projects (${res.status}):`, errorData.error || 'Unknown error')
              setProjects([])
              return []
            })
          }
          return res.json()
        })
        .then(data => {
          if (data && Array.isArray(data)) {
            setProjects(data)
          } else if (data && data.length !== undefined) {
            // Handle empty array case
            setProjects(data)
          } else {
            console.error('Generic projects API returned unexpected format:', data)
            setProjects([])
          }
        })
        .catch((error) => {
          console.error('Failed to fetch generic projects:', error)
          setProjects([])
        })
    } else {
      setProjects([])
    }
  }, [formData.businessType, formData.paymentType])

  // Filter project types by business type
  const getFilteredProjectTypes = () => {
    return projectTypes.filter(pt =>
      pt.businessType === formData.businessType && pt.isActive
    )
  }

  // Legacy construction function removed - using generic project contractors only

  // Load project contractors when project changes
  useEffect(() => {
    if (formData.paymentType === 'project' && formData.projectId && formData.projectSubType === 'contractor') {
      // Load contractors for generic projects
      loadGenericProjectContractors(formData.projectId)
    } else {
      setProjectContractors([])
    }
  }, [formData.paymentType, formData.projectId, formData.projectSubType])

  // Load loan recipients and existing loans when loan payment type is selected
  useEffect(() => {
    if (formData.paymentType === 'loan') {
      // Load available recipients (businesses and persons)
      fetch('/api/business/available-borrowers')
        .then(res => res.json())
        .then(data => {
          setRecipients(Array.isArray(data) ? data : [])
        })
        .catch(err => {
          console.error('Failed to load loan recipients:', err)
          setRecipients([])
        })

      // Load active employees
      fetch('/api/employees')
        .then(res => res.json())
        .then(data => {
          // API returns { employees: [...], pagination: {...} }
          const employeeList = data.employees || []
          const activeEmployees = (Array.isArray(employeeList) ? employeeList : []).filter((emp: any) => emp.isActive)
          setEmployees(activeEmployees)
        })
        .catch(err => {
          console.error('Failed to load employees:', err)
          setEmployees([])
        })

      // Load existing loans
      fetch('/api/business/loans')
        .then(res => res.json())
        .then(data => {
          setLoans(Array.isArray(data) ? data : [])
        })
        .catch(err => {
          console.error('Failed to load existing loans:', err)
          setLoans([])
        })

      // Set available balance same as regular balance for now
      setAvailableBalance(balance)
    }
  }, [formData.paymentType, balance])

  // Load contractors for generic projects
  const loadGenericProjectContractors = async (projectId: string) => {
    if (!projectId) {
      setProjectContractors([])
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/contractors`)
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          const projectContractorData = data.map(pc => ({
            id: pc.id,
            name: pc.persons?.fullName || 'Unknown',
            projectId: pc.projectId,
            email: pc.persons?.email,
            phone: pc.persons?.phone,
            nationalId: pc.persons?.nationalId,
            idTemplateId: pc.persons?.idFormatTemplateId,
            createdAt: pc.createdAt,
            person: pc.person
          }))
          setProjectContractors(projectContractorData)
        } else {
          setProjectContractors([])
        }
      } else {
        console.error('Failed to fetch generic project contractors')
        setProjectContractors([])
      }
    } catch (error) {
      console.error('Error fetching generic project contractors:', error)
      setProjectContractors([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.amount || !formData.description) return

    // Validate project payments
      if (formData.paymentType === 'project') {
      if (!formData.projectId) {
        void customAlert({ title: 'Missing project', description: 'Please select a project for project payments' })
        return
      }
      // Only require contractor for contractor sub-payments
      if (formData.projectSubType === 'contractor' && !formData.contractorId) {
        void customAlert({ title: 'Missing contractor', description: 'Please select a contractor for contractor payments' })
        return
      }
      // For generic projects, require project type selection
      if (!formData.projectTypeId) {
        void customAlert({ title: 'Missing project type', description: 'Please select a project type for project payments' })
        return
      }
    }

    setLoading(true)
    setError('') // Clear any previous errors

    try {
      const response = await fetch('/api/personal/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(formData.amount),
          description: formData.description,
          categoryId: categoryId || undefined, // NEW: Send categoryId
          subcategoryId: subcategoryId || undefined, // NEW: Send subcategoryId
          category: formData.category || 'General', // Keep for backward compatibility
          date: formData.date,
          paymentType: formData.paymentType,
          businessType: formData.businessType || null,
          projectType: formData.projectType || null,
          projectId: formData.projectId || null,
          contractorId: formData.contractorId || null,
          projectSubType: formData.projectSubType || null,
          notes: formData.notes || null
        })
      })

      if (response.ok) {
        // Refresh balance after successful expense creation
        await fetchBalance()
        // Use replace instead of push to prevent back button from returning to form
        router.replace(sourcePage === 'dashboard' ? '/dashboard' : '/personal')
      } else {
        // Handle different error response types
        let errorMessage = 'Failed to create expense'

        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (parseError) {
          // If response isn't JSON, use status-based error message
          if (response.status === 400) {
            errorMessage = 'Invalid expense data. Please check your input and try again.'
          } else if (response.status === 403) {
            errorMessage = 'You do not have permission to create expenses.'
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later.'
          }
        }

        setError(errorMessage)
        console.error('Failed to create expense:', errorMessage)
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.')
      console.error('Error creating expense:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleCreateContractor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContractor.name || !newContractor.nationalId) {
      void customAlert({ title: 'Missing contractor info', description: 'Please provide contractor name and national ID' })
      return
    }

    // For project payments, require a project. For contractor payments, project is optional
      if (formData.paymentType === 'project' && !formData.projectId) {
      void customAlert({ title: 'Missing project', description: 'Please select a project first' })
      return
    }

    try {
      const contractorData = {
        name: newContractor.name,
        email: newContractor.email,
        phone: newContractor.phone,
        phoneCountryCode: newContractor.phoneCountryCode,
        description: newContractor.description,
        nationalId: newContractor.nationalId,
        idTemplateId: newContractor.idTemplateId
      }

      // Only include projectId if this is for a project payment (not direct contractor payment)
      if (formData.paymentType === 'project' && formData.projectId) {
        contractorData.projectId = formData.projectId
      }

      const response = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: contractorData.name,
          email: contractorData.email,
          phone: contractorData.phone,
          nationalId: contractorData.nationalId,
          idFormatTemplateId: contractorData.idTemplateId,
          notes: contractorData.description
        })
      })

      if (response.ok) {
        const createdPerson = await response.json()
        // Map person to contractor format
        const contractorFormat = {
          id: createdPerson.id,
          name: createdPerson.fullName,
          projectId: null,
          email: createdPerson.email,
          phone: createdPerson.phone,
          nationalId: createdPerson.nationalId,
          idTemplateId: createdPerson.idFormatTemplateId,
          createdAt: createdPerson.createdAt,
          person: createdPerson,
          constructionProject: null
        }
        setContractors([...contractors, contractorFormat])
        setFormData({...formData, contractorId: createdPerson.id})
        setNewContractor({ name: '', email: '', phone: '', phoneCountryCode: '', description: '', nationalId: '', idTemplateId: '' })
        setShowNewContractorForm(false)
      } else {
        console.error('Failed to create contractor')
          void customAlert({ title: 'Error', description: 'Failed to create contractor' })
      }
    } catch (error) {
      console.error('Error creating contractor:', error)
        void customAlert({ title: 'Error', description: 'Error creating contractor' })
    }
  }


  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.name || !newCategory.emoji) return

    try {
      const response = await fetch('/api/personal/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      })

      if (response.ok) {
        const category = await response.json()
        setCategories([...categories, category])
        setFormData({...formData, category: category.id}) // Auto-select the new category
        setNewCategory({ name: '', emoji: '💰', color: '#3B82F6' })
        setShowNewCategoryForm(false)
      }
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  const selectedCategory = categories.find(cat => cat.id === formData.category)

  // Use appropriate contractor list based on payment type
  const getContractorsForPaymentType = () => {
    if (formData.paymentType === 'contractor') {
      // Show all active contractors for direct contractor payments (person.id)
      return (Array.isArray(contractors) ? contractors : []).filter(c =>
        c.person?.isActive === true
      )
    } else if (formData.paymentType === 'project') {
      // Show project-specific contractors for project payments (projectContractor.id)
      return (Array.isArray(projectContractors) ? projectContractors : []).filter(c =>
        c.person?.isActive === true
      )
    }
    return []
  }

  const filteredContractors = getContractorsForPaymentType()

  // Helper function to check if user has insufficient funds
  const hasInsufficientFunds = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0 || balanceLoading) {
      return false
    }
    const expenseAmount = parseFloat(formData.amount)
    return balance < expenseAmount
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Add New Expense</h1>
          <Link
            href={sourcePage === 'dashboard' ? '/dashboard' : '/personal'}
            className="btn-secondary text-sm sm:text-base whitespace-nowrap"
          >
            {sourcePage === 'dashboard' ? '← Back to Dashboard' : '← Back to Personal'}
          </Link>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      type="button"
                      onClick={() => setError('')}
                      className="inline-flex text-red-400 hover:text-red-600"
                    >
                      <span className="sr-only">Dismiss</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Amount ($) *
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />

                  {/* Available Funds Display */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {balanceLoading ? (
                        'Loading available funds...'
                      ) : (
                        `Available Funds: $${balance.toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {/* Balance Preview */}
                  {formData.amount && parseFloat(formData.amount) > 0 && !balanceLoading && (
                    <div className="text-sm">
                      {(() => {
                        const expenseAmount = parseFloat(formData.amount)
                        const remainingBalance = balance - expenseAmount
                        const hasInsufficientFunds = remainingBalance < 0

                        return (
                          <div className={`flex justify-between items-center p-2 rounded ${
                            hasInsufficientFunds
                              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                              : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                          }`}>
                            <span>Balance after expense:</span>
                            <span className="font-medium">
                              ${remainingBalance.toFixed(2)}
                              {hasInsufficientFunds && (
                                <span className="ml-2 text-red-600 dark:text-red-400">⚠️ Insufficient Funds</span>
                              )}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <DateInput
                value={formData.date}
                onChange={(date) => setFormData({...formData, date})}
                label="Date"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What was this expense for?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="category"
                    checked={formData.paymentType === 'category'}
                    onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                    className="mr-3 flex-shrink-0"
                  />
                  <div>
                    <div className="font-medium text-sm sm:text-base">💰 Category Expense</div>
                    <div className="text-xs sm:text-sm text-gray-500">Regular categorized expenses</div>
                  </div>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="project"
                    checked={formData.paymentType === 'project'}
                    onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                    className="mr-3 flex-shrink-0"
                  />
                  <div>
                    <div className="font-medium text-sm sm:text-base">🏗️ Project Payment</div>
                    <div className="text-xs sm:text-sm text-gray-500">Materials, labor, or contractor payments for projects</div>
                  </div>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="contractor"
                    checked={formData.paymentType === 'contractor'}
                    onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                    className="mr-3 flex-shrink-0"
                  />
                  <div>
                    <div className="font-medium text-sm sm:text-base">👷 Individual Contractor</div>
                    <div className="text-xs sm:text-sm text-gray-500">Direct payment to contractor (not tied to a project)</div>
                  </div>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="loan"
                    checked={formData.paymentType === 'loan'}
                    onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                    className="mr-3 flex-shrink-0"
                  />
                  <div>
                    <div className="font-medium text-sm sm:text-base">🏦 Business Loan</div>
                    <div className="text-xs sm:text-sm text-gray-500">Loan to or from businesses</div>
                  </div>
                </label>
              </div>
            </div>

            {formData.paymentType === 'category' && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Category *
                </label>
                <CategorySelector
                  onCategoryChange={(catId, subId) => {
                    setCategoryId(catId)
                    setSubcategoryId(subId)
                  }}
                  initialCategoryId={categoryId}
                  initialSubcategoryId={subcategoryId}
                  onCreateSubcategory={(categoryInfo) => {
                    setSelectedCategoryForCreator(categoryInfo)
                    setShowSubcategoryCreator(true)
                  }}
                  showCreateButton={hasUserPermission(session?.user, 'canCreateExpenseSubcategories')}
                  required={true}
                  disabled={loading}
                />
              </div>
            )}

            {formData.paymentType === 'project' && (
              <div className="space-y-4">
                {/* Business Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type *
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({...formData, businessType: e.target.value, projectId: '', projectTypeId: ''})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select business type</option>
                    {availableBusinessTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.value === 'personal' && '🏠 '}
                        {type.value === 'construction' && '🏗️ '}
                        {type.value === 'restaurant' && '🍽️ '}
                        {type.value === 'grocery' && '🛒 '}
                        {type.value === 'clothing' && '👕 '}
                        {type.value === 'hardware' && '🔧 '}
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project Type Selection - only enhanced projects supported */}

                {/* Project Type Selection for Projects */}
                {formData.businessType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Type *
                    </label>
                    <select
                      value={formData.projectTypeId}
                      onChange={(e) => setFormData({...formData, projectTypeId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select project type</option>
                      {getFilteredProjectTypes().map(projectType => (
                        <option key={projectType.id} value={projectType.id}>
                          {projectType.name} {projectType.isSystem ? '(System)' : '(Custom)'}
                        </option>
                      ))}
                    </select>
                    {formData.projectTypeId && (
                      <div className="mt-2 text-sm text-gray-600">
                        {(() => {
                          const selectedType = projectTypes.find(pt => pt.id === formData.projectTypeId)
                          return selectedType?.description && (
                            <p className="italic">{selectedType.description}</p>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Project Selection */}
                {formData.businessType && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Project *
                      </label>
                      {hasUserPermission(session?.user, 'canAddPersonalExpenses') && (
                        <button
                          type="button"
                          onClick={() => setShowNewProjectForm(true)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          + Create New Project
                        </button>
                      )}
                    </div>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a project</option>
                      {Array.isArray(projects) && projects.map(project => (
                        <option key={project.id} value={project.id}>
                          ⚡ {project.name}
                          {project.projectType && ` (${project.project_types.name})`}
                          {project.business && ` - ${project.businesses.name}`}
                          {!project.business && ' - Personal'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Project Sub-Type Selection */}
                {formData.projectId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Category *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="projectSubType"
                          value="expense"
                          checked={formData.projectSubType === 'expense'}
                          onChange={(e) => setFormData({...formData, projectSubType: e.target.value, contractorId: ''})}
                          className="mr-3 flex-shrink-0"
                        />
                        <div>
                          <div className="font-medium text-sm sm:text-base">🛒 General Project Expense</div>
                          <div className="text-xs sm:text-sm text-gray-500">Materials, supplies, fuel, equipment</div>
                        </div>
                      </label>
                      <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="projectSubType"
                          value="contractor"
                          checked={formData.projectSubType === 'contractor'}
                          onChange={(e) => setFormData({...formData, projectSubType: e.target.value})}
                          className="mr-3 flex-shrink-0"
                        />
                        <div>
                          <div className="font-medium text-sm sm:text-base">👷 Contractor Payment</div>
                          <div className="text-xs sm:text-sm text-gray-500">Payment to specific project contractor</div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contractor Selection for Individual Contractor Payments */}
            {formData.paymentType === 'contractor' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Contractor *
                  </label>
                  {hasUserPermission(session?.user, 'canManagePersonalContractors') && (
                    <button
                      type="button"
                      onClick={() => setShowNewContractorForm(true)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Create New Contractor
                    </button>
                  )}
                </div>
                <select
                  value={formData.contractorId}
                  onChange={(e) => setFormData({...formData, contractorId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a contractor</option>
                  {filteredContractors.map(contractor => (
                    <option key={contractor.id} value={contractor.id}>
                      👷 {contractor.person?.fullName || contractor.name || 'Unnamed Contractor'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Contractor Selection for Project Contractor Payments */}
            {formData.paymentType === 'project' && formData.projectSubType === 'contractor' && formData.projectId && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Project Contractor *
                  </label>
                  {hasUserPermission(session?.user, 'canManagePersonalContractors') && (
                    <button
                      type="button"
                      onClick={() => setShowNewContractorForm(true)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Contractor to Project
                    </button>
                  )}
                </div>
                <select
                  value={formData.contractorId}
                  onChange={(e) => setFormData({...formData, contractorId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a project contractor</option>
                  {Array.isArray(projectContractors) && projectContractors.map(contractor => (
                    <option key={contractor.id} value={contractor.id}>
                      👷 {contractor.persons?.fullName || contractor.name || 'Unnamed Contractor'}
                      {contractor.persons?.phone && ` (${contractor.persons.phone})`}
                    </option>
                  ))}
                </select>
                {projectContractors.length === 0 && formData.projectId && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      💡 No contractors assigned to this project yet. You can add contractors to the project or create a general project expense instead.
                    </p>
                  </div>
                )}
              </div>
            )}

            {formData.paymentType === 'loan' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Loan Type *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="loanType"
                        value="createNew"
                        checked={formData.loanType === 'createNew'}
                        onChange={(e) => setFormData({...formData, loanType: e.target.value, loanId: ''})}
                        className="mr-2"
                      />
                      <span className="text-sm sm:text-base">Create New Loan (lend money)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="loanType"
                        value="existing"
                        checked={formData.loanType === 'existing'}
                        onChange={(e) => setFormData({...formData, loanType: e.target.value})}
                        className="mr-2"
                      />
                      <span className="text-sm sm:text-base">Payment on Existing Loan</span>
                    </label>
                  </div>
                </div>

                {formData.loanType === 'createNew' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          💰 Available Balance
                        </span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${availableBalance.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                        This is the maximum amount you can lend
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Loan Recipient Type *
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="recipientType"
                            value="business"
                            checked={formData.recipientType === 'business'}
                            onChange={(e) => setFormData({...formData, recipientType: e.target.value as 'business' | 'person' | 'employee', loanId: ''})}
                            className="mr-2"
                          />
                          <span className="text-sm sm:text-base">🏢 Business</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="recipientType"
                            value="person"
                            checked={formData.recipientType === 'person'}
                            onChange={(e) => setFormData({...formData, recipientType: e.target.value as 'business' | 'person' | 'employee', loanId: ''})}
                            className="mr-2"
                          />
                          <span className="text-sm sm:text-base">👤 Individual</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="recipientType"
                            value="employee"
                            checked={formData.recipientType === 'employee'}
                            onChange={(e) => setFormData({...formData, recipientType: e.target.value as 'business' | 'person' | 'employee', loanId: ''})}
                            className="mr-2"
                          />
                          <span className="text-sm sm:text-base">👨‍💼 Employee</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Select {formData.recipientType === 'business' ? 'Business' : formData.recipientType === 'employee' ? 'Employee' : 'Individual'} *
                        </label>
                        {formData.recipientType === 'person' && hasUserPermission(session?.user, 'canManagePersonalContractors') && (
                          <button
                            type="button"
                            onClick={() => setShowNewPersonForm(true)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            + Create New Person
                          </button>
                        )}
                      </div>
                      <select
                        value={formData.loanId}
                        onChange={(e) => {
                          setFormData({
                            ...formData, 
                            loanId: e.target.value
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">
                          Select {formData.recipientType === 'business' ? 'business' : formData.recipientType === 'employee' ? 'employee' : 'individual'} to lend money to
                        </option>
                        {formData.recipientType === 'employee' ? (
                          // Show employees
                          Array.isArray(employees) && employees.map(employee => (
                            <option key={employee.id} value={employee.id}>
                              👨‍💼 {employee.fullName} ({employee.jobTitle?.title || 'Employee'})
                              {employee.email && ` - ${employee.email}`}
                            </option>
                          ))
                        ) : (
                          // Show businesses and persons
                          Array.isArray(recipients) && recipients
                            .filter(recipient => recipient.type === formData.recipientType)
                            .map(recipient => (
                            <option key={recipient.id} value={recipient.id}>
                              {recipient.type === 'business' ? '🏢' : '👤'} {recipient.name} ({recipient.subtype})
                              {recipient.description && ` - ${recipient.description}`}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Interest Rate (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.interestRate || '0'}
                          onChange={(e) => setFormData({...formData, interestRate: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.0"
                        />
                      </div>
                      <div>
                        <DateInput
                          label="Due Date"
                          value={formData.dueDate || ''}
                          onChange={(isoDate, countryCode) => setFormData({...formData, dueDate: isoDate})}
                          className=""
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Payment Terms
                      </label>
                      <textarea
                        value={formData.terms || ''}
                        onChange={(e) => setFormData({...formData, terms: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Monthly payments, due in 6 months..."
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {formData.loanType === 'existing' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Existing Loan *
                    </label>
                    <select
                      value={formData.loanId}
                      onChange={(e) => setFormData({...formData, loanId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select an existing loan</option>
                      {Array.isArray(loans) && loans.filter(loan => loan.status === 'active').map(loan => (
                        <option key={loan.id} value={loan.id}>
                          💰 {loan.loanNumber} - To: {loan.borrowerBusiness?.name} (Balance: ${loan.remainingBalance?.toFixed(2) || '0.00'})
                        </option>
                      ))}
                    </select>
                    {formData.loanId && (() => {
                      const selectedLoan = loans.find(loan => loan.id === formData.loanId)
                      if (selectedLoan) {
                        return (
                          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h4 className="font-medium text-primary mb-2">Loan Details</h4>
                            <div className="text-sm text-secondary space-y-1">
                              <div>Principal Amount: ${selectedLoan.principalAmount?.toFixed(2) || '0.00'}</div>
                              <div>Remaining Balance: ${selectedLoan.remainingBalance?.toFixed(2) || '0.00'}</div>
                              <div>Interest Rate: {selectedLoan.interestRate || 0}%</div>
                              <div>Status: <span className="capitalize">{selectedLoan.status}</span></div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                )}
              </div>
            )}

            {(formData.paymentType === 'category' || formData.paymentType === 'project' || formData.paymentType === 'contractor') && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Notes {formData.paymentType === 'category' ? '(optional)' : '*'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={
                    formData.paymentType === 'category'
                      ? "Additional details about this expense..."
                      : formData.paymentType === 'project' && formData.projectSubType === 'contractor'
                      ? "Payment details, invoice number, work completed, hours, etc..."
                      : formData.paymentType === 'project'
                      ? "Item details, quantity, supplier, receipt/invoice number, etc..."
                      : "Payment details, work description, invoice number, etc..."
                  }
                  required={formData.paymentType !== 'category'}
                />
                {formData.paymentType === 'project' && (
                  <div className="mt-2 text-sm text-gray-500">
                    💡 {formData.projectSubType === 'contractor'
                      ? 'Include details about the work performed, hours, completion status, etc.'
                      : 'Include item descriptions, quantities, supplier info, receipt numbers, etc.'}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={loading || hasInsufficientFunds()}
                className={`btn-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasInsufficientFunds()
                    ? 'bg-red-600 hover:bg-red-700 border-red-600'
                    : 'bg-green-600 hover:bg-green-700 border-green-600'
                }`}
              >
                {loading ? (
                  'Creating...'
                ) : hasInsufficientFunds() ? (
                  '⚠️ Insufficient Funds'
                ) : (
                  'Create Expense'
                )}
              </button>
              
              <Link
                href={sourcePage === 'dashboard' ? '/dashboard' : '/personal'}
                className="btn-secondary text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* New Project Modal */}
        <ProjectCreationModal
          isOpen={showNewProjectForm}
          onClose={() => setShowNewProjectForm(false)}
          onSuccess={(createdProject) => {
            setProjects([...projects, createdProject])
            setFormData({...formData, projectId: createdProject.id})
          }}
          defaultBusinessType="personal"
        />

        {/* New Contractor Modal */}
        {showNewContractorForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="card p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-semibold text-primary mb-4">Create New Contractor</h2>
              <form onSubmit={handleCreateContractor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Contractor Name *
                  </label>
                  <input
                    type="text"
                    value={newContractor.name}
                    onChange={(e) => setNewContractor({...newContractor, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contractor name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newContractor.email}
                    onChange={(e) => setNewContractor({...newContractor, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="contractor@email.com"
                  />
                </div>
                {/* Phone Number Field */}
                <PhoneNumberInput
                  value={newContractor.phone}
                  onChange={(fullPhoneNumber, countryCode, localNumber) =>
                    setNewContractor({
                      ...newContractor,
                      phone: fullPhoneNumber,
                      phoneCountryCode: countryCode
                    })
                  }
                  label="Phone Number"
                  placeholder="77 123 4567"
                  required={false}
                />

                {/* National ID Field */}
                <NationalIdInput
                  value={newContractor.nationalId}
                  templateId={newContractor.idTemplateId}
                  onChange={(nationalId, templateId) =>
                    setNewContractor({
                      ...newContractor,
                      nationalId,
                      idTemplateId: templateId || ''
                    })
                  }
                  label="National ID"
                  placeholder="Enter national ID"
                  required={true}
                  showTemplateSelector={true}
                  autoValidate={true}
                />

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={newContractor.description}
                    onChange={(e) => setNewContractor({...newContractor, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Role or specialization"
                    rows={2}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!newContractor.name || !newContractor.nationalId}
                  >
                    Create Contractor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewContractorForm(false)
                      setNewContractor({ name: '', email: '', phone: '', phoneCountryCode: '', description: '', nationalId: '', idTemplateId: '' })
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Person Modal */}
        {showNewPersonForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="card p-4 sm:p-6 w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-visible">
              <h2 className="text-xl font-semibold text-primary mb-4">Create New Person</h2>
              <PersonRegistrationForm
                onSuccess={(createdPerson) => {
                  // Reload recipients to include the new person
                  fetch('/api/business/available-borrowers')
                    .then(res => res.json())
                    .then(data => {
                      setRecipients(data)
                      // Auto-select the newly created person
                      setFormData({...formData, loanId: createdPerson.id})
                    })
                    .catch(console.error)

                  setShowNewPersonForm(false)
                }}
                onCancel={() => setShowNewPersonForm(false)}
              />
            </div>
          </div>
        )}

        {/* Create Category Modal */}
        {showNewCategoryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="card p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-semibold text-primary mb-4">Create New Category</h2>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Groceries, Gas, Rent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Emoji
                  </label>
                  <div className="grid grid-cols-6 gap-2 mb-2">
                    {['💰', '🍽️', '🚗', '💡', '🎬', '🛒', '🏥', '📚', '🏗️', '👕', '🎯', '💼'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCategory({...newCategory, emoji})}
                        className={`p-2 text-xl sm:text-2xl border rounded-md ${newCategory.emoji === emoji ? 'bg-blue-100 dark:bg-blue-800 border-blue-500' : 'border-gray-300 dark:border-gray-600'} dark:text-white`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newCategory.emoji}
                    onChange={(e) => setNewCategory({...newCategory, emoji: e.target.value})}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="💰"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                    className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-md"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!newCategory.name || !newCategory.emoji}
                  >
                    Create Category
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategoryForm(false)
                      setNewCategory({ name: '', emoji: '💰', color: '#3B82F6' })
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Subcategory Creator Modal */}
        {showSubcategoryCreator && selectedCategoryForCreator && (
          <SubcategoryCreator
            categoryId={selectedCategoryForCreator.id}
            categoryName={selectedCategoryForCreator.name}
            categoryEmoji={selectedCategoryForCreator.emoji}
            onSuccess={(newSubcategory) => {
              setShowSubcategoryCreator(false)
              setSubcategoryId(newSubcategory.id)
              // The CategorySelector will refresh automatically
            }}
            onCancel={() => setShowSubcategoryCreator(false)}
            isOpen={showSubcategoryCreator}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}