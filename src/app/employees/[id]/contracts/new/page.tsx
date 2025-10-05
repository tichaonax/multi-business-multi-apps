'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasPermission } from '@/lib/permission-utils'
import { generateComprehensiveContract, previewContractPDF, downloadComprehensiveContractPDF } from '@/lib/contract-pdf-generator'
import { ContractTemplate } from '@/components/contracts/contract-template'
import { DateInput } from '@/components/ui/date-input'
import { EmployeeContractSelector } from '@/components/contracts/employee-contract-selector'
import { useToastContext } from '@/components/ui/toast'

interface Employee {
  id: string
  employeeNumber: string
  fullName: string
  firstName?: string
  lastName?: string
  email: string | null
  phone?: string
  address?: string | null
  nationalId?: string | null
  jobTitle?: {
    id?: string
    title: string
    department: string | null
    description?: string | null
    responsibilities?: string[]
  }
  compensationType?: {
    id?: string
    name: string
    type: string
    description?: string | null
  }
  primaryBusiness?: {
    id: string
    name: string
    type: string
  }
  supervisor?: {
    id: string
    fullName: string
    jobTitle: {
      title: string
    }
  } | null
}

interface JobTitle {
  id: string
  title: string
  department: string | null
  description: string | null
  responsibilities: string[]
}

interface CompensationType {
  id: string
  name: string
  type: string
  description: string | null
  frequency?: string
}

interface Business {
  id: string
  name: string
  type: string
  description: string | null
}

interface BenefitType {
  id: string
  name: string
  type: string
  defaultAmount: number | null
  isPercentage: boolean
}

interface ContractFormData {
  jobTitleId: string
  compensationTypeId: string
  baseSalary: string
  salaryFrequency: string
  customResponsibilities: string
  startDate: string
  endDate: string
  probationPeriodMonths: string
  primaryBusinessId: string
  supervisorId: string
  isCommissionBased: boolean
  isSalaryBased: boolean
  benefits: Array<{
    benefitTypeId: string
    amount: string
    isPercentage: boolean
    notes: string
  }>
  notes: string
}

export default function NewContractPage() {
  const { data: session } = useSession()
  const currentUser = session?.user as any
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  const [compensationTypes, setCompensationTypes] = useState<CompensationType[]>([])
  const [benefitTypes, setBenefitTypes] = useState<BenefitType[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [contractCreated, setContractCreated] = useState(false)
  const [createdContract, setCreatedContract] = useState<any>(null)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [umbrellaBusinessData, setUmbrellaBusinessData] = useState<any>(null)

  const [formData, setFormData] = useState<ContractFormData>({
    jobTitleId: '',
    compensationTypeId: '',
    baseSalary: '',
    salaryFrequency: 'monthly',
    customResponsibilities: '',
    startDate: '',
    endDate: '',
    probationPeriodMonths: '3',
    primaryBusinessId: '',
    supervisorId: '',
    isCommissionBased: false,
    isSalaryBased: true,
    benefits: [],
    notes: ''
  })

  // Keep track of the contract we prefilled from so we can show a readonly reference
  const [previousContract, setPreviousContract] = useState<any>(null)

  // Copy mode state
  const [copyMode, setCopyMode] = useState(false)
  const [selectedSourceEmployee, setSelectedSourceEmployee] = useState<any>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)

  const canCreateEmployeeContracts = currentUser && hasPermission(currentUser, 'canCreateEmployeeContracts')
  const toast = useToastContext()

  const validateForm = () => {
    const errors: {[key: string]: string} = {}

    if (!formData.jobTitleId) errors.jobTitleId = 'Job Title is required'
    if (!formData.compensationTypeId) errors.compensationTypeId = 'Compensation Type is required'
    if (!formData.baseSalary) errors.baseSalary = 'Base Salary is required'
    if (formData.baseSalary && parseFloat(formData.baseSalary) <= 0) errors.baseSalary = 'Base Salary must be greater than 0'
    if (!formData.startDate) errors.startDate = 'Start Date is required'

    // Check if supervisor is required based on job title and available employees
    const selectedJobTitle = jobTitles.find(jt => jt.id === formData.jobTitleId)
    const availableSupervisors = employees.filter(emp => emp.id !== employeeId)
    const isManagementRole = selectedJobTitle?.title.toLowerCase().includes('manager') ||
                              selectedJobTitle?.title.toLowerCase().includes('director') ||
                              selectedJobTitle?.title.toLowerCase().includes('ceo') ||
                              selectedJobTitle?.title.toLowerCase().includes('chief') ||
                              selectedJobTitle?.title.toLowerCase().includes('head') ||
                              selectedJobTitle?.level?.toLowerCase().includes('senior') ||
                              selectedJobTitle?.department?.toLowerCase() === 'executive'

    // Require supervisor unless: 1) No other employees exist, OR 2) This is a top-level management position
    if (!formData.supervisorId && availableSupervisors.length > 0 && !isManagementRole) {
      errors.supervisorId = 'Supervisor is required for non-management positions'
    }

    // Validate benefits
    formData.benefits.forEach((benefit, index) => {
      if (benefit.benefitTypeId && !benefit.amount) {
        errors[`benefit_${index}_amount`] = 'Amount is required when benefit type is selected'
      }
      if (benefit.amount && parseFloat(benefit.amount) <= 0) {
        errors[`benefit_${index}_amount`] = 'Benefit amount must be greater than 0'
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const getInputClassName = (fieldName: string) => {
    const hasError = validationErrors[fieldName]
    return `input w-full ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`
  }

  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const updated = { ...prev }
        delete updated[fieldName]
        return updated
      })
    }
  }

  // Function to copy contract template from another employee
  const copyContractTemplate = async (contractId: string) => {
    try {
      setLoadingTemplate(true)
      const response = await fetch(`/api/contracts/template/${contractId}`)
      const result = await response.json()

      if (result.success) {
        const template = result.data

        // Populate form with template data
        setFormData(prev => ({
          ...prev,
          jobTitleId: template.jobTitleId,
          compensationTypeId: template.compensationTypeId,
          baseSalary: template.baseSalary,
          customResponsibilities: template.customResponsibilities || '',
          probationPeriodMonths: template.probationPeriodMonths?.toString() || '3',
          primaryBusinessId: template.primaryBusinessId,
          supervisorId: template.supervisorId,
          isCommissionBased: template.isCommissionBased,
          isSalaryBased: template.isSalaryBased,
          benefits: template.benefits || [],
          notes: template.notes || '',
          // Reset employee-specific fields
          startDate: '',
          endDate: ''
        }))

        // Store reference to template source
        setPreviousContract({
          ...template.templateMetadata,
          sourceEmployee: template.sourceEmployee
        })

        console.log('Contract template copied successfully from:', template.sourceEmployee.fullName)
      } else {
        console.error('Failed to copy contract template:', result.error)
      }
    } catch (error) {
      console.error('Error copying contract template:', error)
    } finally {
      setLoadingTemplate(false)
    }
  }

  const getAvailableBenefitTypes = (currentIndex: number) => {
    const selectedBenefitIds = formData.benefits
      .map((benefit, index) => index !== currentIndex ? benefit.benefitTypeId : null)
      .filter(id => id !== null && id !== '')
    
    return benefitTypes.filter(type => !selectedBenefitIds.includes(type.id))
  }

  useEffect(() => {
    if (canCreateEmployeeContracts && employeeId) {
      fetchData()
    }
  }, [canCreateEmployeeContracts, employeeId])

  useEffect(() => {
    // Fetch umbrella business data
    const fetchUmbrellaBusinessData = async () => {
      try {
        const response = await fetch('/api/admin/umbrella-business')
        if (response.ok) {
          const data = await response.json()
          setUmbrellaBusinessData(data)
        }
      } catch (error) {
        console.error('Error fetching umbrella business data:', error)
      }
    }

    fetchUmbrellaBusinessData()
  }, [])

  useEffect(() => {
    if (employee) {
      // Pre-populate form with employee data but do not overwrite fields that are already populated
      setFormData(prev => ({
        ...prev,
        jobTitleId: prev.jobTitleId || employee.jobTitle?.id || '',
        compensationTypeId: prev.compensationTypeId || employee.compensationType?.id || '',
        primaryBusinessId: prev.primaryBusinessId || employee.primaryBusiness?.id || '',
        supervisorId: prev.supervisorId || employee.supervisor?.id || '',
        startDate: prev.startDate || new Date().toISOString().split('T')[0]
      }))
    }
  }, [employee])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [
        employeeRes,
        jobTitlesRes,
        compensationTypesRes,
        benefitTypesRes,
        businessesRes,
        employeesRes
      ] = await Promise.all([
        fetch(`/api/employees/${employeeId}`),
        fetch('/api/job-titles'),
        fetch('/api/compensation-types'),
        fetch('/api/benefit-types'),
        fetch('/api/businesses'),
        fetch('/api/employees')
      ])

      // Parse all responses into variables so we can prefill form based on latest contract
      let employeeData: any = null
      let jobTitlesData: any = []
      let compensationTypesData: any = []
      let benefitTypesData: any = []
      let businessesDataList: any = []
      let employeesDataList: any = []

      if (employeeRes.ok) employeeData = await employeeRes.json()
      if (jobTitlesRes.ok) jobTitlesData = await jobTitlesRes.json()
      if (compensationTypesRes.ok) compensationTypesData = await compensationTypesRes.json()
      if (benefitTypesRes.ok) benefitTypesData = await benefitTypesRes.json()
      if (businessesRes.ok) {
        const b = await businessesRes.json()
        businessesDataList = b.businesses || b
      }
      if (employeesRes.ok) {
        const em = await employeesRes.json()
        employeesDataList = em.employees || em
      }

      // Apply fetched data to state
      if (employeeData) setEmployee(employeeData)
      if (jobTitlesData) setJobTitles(jobTitlesData)
      if (compensationTypesData) setCompensationTypes(compensationTypesData)
      if (benefitTypesData) setBenefitTypes(benefitTypesData)
      if (businessesDataList) setBusinesses(businessesDataList)
      if (employeesDataList) setEmployees(employeesDataList)

      // Prefill form from latest contract if available
      if (employeeData && Array.isArray(employeeData.contracts) && employeeData.contracts.length > 0) {
        prefillFromLatestContract(employeeData.contracts, benefitTypesData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const prefillFromLatestContract = (contracts: any[], benefitTypesList: any[]) => {
    if (!contracts || contracts.length === 0) return

    // Find latest contract by createdAt (contracts from API are ordered desc but be defensive)
    const sorted = [...contracts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const latest = sorted[0]
    if (!latest) return

    // Build benefits for form from latest contract benefits or pdfGenerationData
    const benefitsSource = Array.isArray(latest.benefits) && latest.benefits.length > 0
      ? latest.benefits
      : ((latest as any).pdfGenerationData && Array.isArray((latest as any).pdfGenerationData.benefits))
        ? (latest as any).pdfGenerationData.benefits
        : []

    const mappedBenefits = (benefitsSource || []).map((b: any) => {
      // Try to find matching benefit type id by name if id not present
      let benefitTypeId = b.benefitType?.id || b.benefitTypeId || ''
      if (!benefitTypeId && b.benefitType && b.benefitType.name) {
        const match = benefitTypesList.find((t: any) => t.name === b.benefitType.name)
        if (match) benefitTypeId = match.id
      }

      return {
        benefitTypeId: benefitTypeId || '',
        amount: (b.amount != null) ? String(b.amount) : '',
        isPercentage: !!b.isPercentage,
        notes: b.notes || ''
      }
    })

    setFormData(prev => ({
      ...prev,
      // Only override if fields are not already set
      jobTitleId: prev.jobTitleId || (latest.jobTitles && latest.jobTitles[0]?.id) || prev.jobTitleId,
      compensationTypeId: prev.compensationTypeId || prev.compensationTypeId || '',
      baseSalary: prev.baseSalary || (latest.baseSalary != null ? String(latest.baseSalary) : prev.baseSalary),
      salaryFrequency: prev.salaryFrequency || (latest._computed?.frequency || prev.salaryFrequency),
      supervisorId: prev.supervisorId || (latest.employees_employee_contracts_supervisorIdToemployees?.id || prev.supervisorId),
      primaryBusinessId: prev.primaryBusinessId || (latest.businesses_employee_contracts_primaryBusinessIdTobusinesses?.id || prev.primaryBusinessId),
      isCommissionBased: typeof prev.isCommissionBased === 'boolean' ? prev.isCommissionBased : !!latest.isCommissionBased,
      isSalaryBased: typeof prev.isSalaryBased === 'boolean' ? prev.isSalaryBased : (latest.isSalaryBased !== undefined ? !!latest.isSalaryBased : true),
      benefits: mappedBenefits.length > 0 ? mappedBenefits : prev.benefits,
      customResponsibilities: prev.customResponsibilities || latest.customResponsibilities || prev.customResponsibilities,
      notes: prev.notes || (latest.notes ? String(latest.notes) : prev.notes)
    }))

    // Store the latest contract info for readonly UI reference and to send when creating
    try {
      setPreviousContract({ id: latest.id, baseSalary: latest.baseSalary ?? (latest._computed && latest._computed.monthlySalary), contractNumber: latest.contractNumber })
    } catch (err) {
      // ignore
    }
  }

  const addBenefit = () => {
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, {
        benefitTypeId: '',
        amount: '',
        isPercentage: false,
        notes: ''
      }]
    }))
  }

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }))
  }

  const updateBenefit = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map((benefit, i) => 
        i === index ? { ...benefit, [field]: value } : benefit
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)
      const pdfContractData = buildContractPDFData('download')

      // Debug logging
      console.log('📋 Frontend: About to send contract data:', {
        hasPdfData: !!pdfContractData,
        pdfDataKeys: pdfContractData ? Object.keys(pdfContractData).slice(0, 5) : 'none',
        businessName: pdfContractData?.businessName,
        employeeName: pdfContractData?.employeeName
      })
      
      const response = await fetch(`/api/employees/${employeeId}/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
              // If we prefilling from a previous contract, include its id so server can track the linkage
              previousContractId: previousContract?.id || null,
          supervisorId: formData.supervisorId || null,
          baseSalary: parseFloat(formData.baseSalary),
          probationPeriodMonths: formData.probationPeriodMonths ? parseInt(formData.probationPeriodMonths) : null,
          benefits: formData.benefits.map(benefit => ({
            ...benefit,
            amount: parseFloat(benefit.amount)
          })).filter(benefit => benefit.benefitTypeId && benefit.amount),
          businessAssignments: employee?.employeeBusinessAssignments?.map(assignment => ({
            businessId: assignment.businessId,
            businessName: assignment.business?.name || '',
            businessType: assignment.business?.type || '',
            isPrimary: assignment.isPrimary,
            role: assignment.role || '',
            startDate: assignment.startDate
          })) || [],
          pdfContractData: pdfContractData,
          notes: `[SALARY_FREQUENCY:${formData.salaryFrequency}]${formData.notes ? '\n\n' + formData.notes : ''}`
        })
      })

      if (response.ok) {
        const newContract = await response.json()
        setCreatedContract(newContract)
        setContractCreated(true)
        
        // Show success message but stay on page for PDF download
        toast.push(`Contract created successfully! Contract #${newContract.contractNumber || 'New Contract'}. You can now download the PDF or view all contracts.`)
      } else {
        const error = await response.json()
        toast.push(error.error || 'Failed to create contract')
      }
    } catch (error) {
      console.error('Error creating contract:', error)
      toast.push('Failed to create contract')
    } finally {
      setSaving(false)
    }
  }

  const buildContractData = () => {
    if (!employee || !formData.baseSalary) return null

    const selectedBusiness = businesses.find(b => b.id === formData.primaryBusinessId)
    const jobTitle = jobTitles.find(jt => jt.id === formData.jobTitleId) || employee.jobTitle || { title: 'Unknown', department: null, description: null, responsibilities: [] }
    const supervisor = employees.find(emp => emp.id === formData.supervisorId) || employee.supervisor
    const compensationType = compensationTypes.find(ct => ct.id === formData.compensationTypeId) || employee.compensationType || { name: 'Unknown', type: 'Unknown', description: null }
    const benefits = formData.benefits.filter(b => b.benefitTypeId && b.amount).map(benefit => ({
      benefitType: benefitTypes.find(bt => bt.id === benefit.benefitTypeId)!,
      amount: parseFloat(benefit.amount),
      isPercentage: benefit.isPercentage,
      notes: benefit.notes
    }))
    
    return {
      contractNumber: 'DRAFT',
      version: 1,
      employee: {
        fullName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        email: employee.email,
        phone: employee.phone || '',
        address: employee.address,
        nationalId: employee.nationalId,
        driverLicenseNumber: null
      },
      jobTitle,
      compensationType,
      business: selectedBusiness || {
        name: employee.primaryBusiness?.name || '_________________________________',
        type: employee.primaryBusiness?.type || 'unknown'
      },
      supervisor,
      baseSalary: parseFloat(formData.baseSalary || '0'),
      isCommissionBased: formData.isCommissionBased,
      isSalaryBased: formData.isSalaryBased,
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      probationPeriodMonths: formData.probationPeriodMonths ? parseInt(formData.probationPeriodMonths) : null,
      benefits,
      customResponsibilities: formData.customResponsibilities,
      notes: formData.notes,
      businessAssignments: employee.employeeBusinessAssignments?.map(assignment => ({
        businessId: assignment.businessId,
        businessName: assignment.business?.name || selectedBusiness?.name || '',
        businessType: assignment.business?.type || selectedBusiness?.type || '',
        isPrimary: assignment.isPrimary,
        role: assignment.role || '',
        startDate: assignment.startDate
      })) || [{
        businessId: selectedBusiness?.id || '',
        businessName: selectedBusiness?.name || '',
        businessType: selectedBusiness?.type || '',
        isPrimary: true,
        role: '',
        startDate: formData.startDate
      }],
      umbrellaBusinessName: umbrellaBusinessData?.umbrellaBusinessName || 'Demo Umbrella Company'
    }
  }

  const buildContractPDFData = (type: 'preview' | 'download') => {
    const data = buildContractData()
    if (!data) return null

    return {
      date: new Date().toISOString(),
      employeeName: data.employee.fullName,
      employeeAddress: data.employee.address || '',
      employeeAddressLine2: '',
      employeePhone: data.employee.phone || '',
      employeeEmail: data.employee.email || '',
      employeeNumber: data.employee.employeeNumber || '',
      nationalId: data.employee.nationalId || '',
      driverLicenseNumber: data.employee.driverLicenseNumber || '',
      jobTitle: data.jobTitle.title,
      department: data.jobTitle.department || '',
      contractDuration: 'permanent',
      contractStartDate: data.startDate,
      contractEndDate: data.endDate || '',
      basicSalary: data.baseSalary,
      livingAllowance: 0,
      commission: 0,
      isCommissionBased: data.isCommissionBased || false,
      isSalaryBased: data.isSalaryBased !== false,
      compensationType: data.compensationType?.name || '',
      benefits: data.benefits.map(benefit => ({
        benefitTypeId: benefit.benefitType.id,
        name: benefit.benefitType.name,
        amount: benefit.amount,
        isPercentage: benefit.isPercentage,
        type: benefit.benefitType.type,
        notes: benefit.notes || ''
      })),
      specialDuties: '',
      responsibilities: data.jobTitle.responsibilities || [],
      customResponsibilities: data.customResponsibilities || '',
      businessName: data.business.name,
      businessType: data.business.type || '',
      businessAddress: data.business.address || '',
      businessPhone: data.business.phone || '',
      businessEmail: data.business.email || '',
      businessRegistrationNumber: data.business.registrationNumber || '',
      supervisorName: data.supervisor?.fullName || '',
      supervisorTitle: data.supervisor?.jobTitle?.title || '',
      probationPeriodMonths: data.probationPeriodMonths || undefined,
      contractNumber: type === 'preview' ? 'DRAFT' : `CON-${data.employee.employeeNumber}-${new Date().getFullYear()}`,
      version: 1,
      notes: data.notes || '',
      // Umbrella business fields - these will be fetched from settings
      umbrellaBusinessName: umbrellaBusinessData?.umbrellaBusinessName || 'Demo Umbrella Company',
      umbrellaBusinessAddress: '',
      umbrellaBusinessPhone: '',
      umbrellaBusinessEmail: '',
      umbrellaBusinessRegistration: '',
      businessAssignments: data.businessAssignments || [{
        businessId: data.business.id,
        businessName: data.business.name,
        businessType: data.business.type || '',
        isPrimary: true,
        role: '',
        startDate: data.startDate
      }]
    }
  }

  // Single source of truth for contract data
  const contractData = buildContractData()

  const handleGeneratePDF = async () => {
    if (!contractData || !employee) return

    try {
      const pdfData = buildContractPDFData('download')
      if (!pdfData) return

      const pdf = generateComprehensiveContract(pdfData)

      // Save the PDF
      const fileName = `Contract_${pdfData.contractNumber}_v1_${employee.fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.push('Failed to generate PDF')
    }
  }

  const handlePreviewPDF = async () => {
    if (!contractData || !employee) return

    try {
      // Use the flattened PDF data structure for preview
      const pdfData = buildContractPDFData('preview')
      if (!pdfData) return
      
      const pdfUrl = previewContractPDF(pdfData)
      window.open(pdfUrl, '_blank')
    } catch (error) {
      console.error('Error previewing PDF:', error)
      toast.push('Failed to preview PDF')
    }
  }

  if (!session) {
    return (
      <ContentLayout title="New Contract">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to create contracts.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!canCreateEmployeeContracts) {
    return (
      <ContentLayout title="New Contract">
        <div className="text-center py-8">
          <p className="text-secondary">You don't have permission to create employee contracts.</p>
        </div>
      </ContentLayout>
    )
  }

  if (loading) {
    return (
      <ContentLayout title="New Contract">
        <div className="text-center py-8">
          <p className="text-secondary">Loading...</p>
        </div>
      </ContentLayout>
    )
  }

  if (!employee) {
    return (
      <ContentLayout title="New Contract">
        <div className="text-center py-8">
          <p className="text-secondary">Employee not found.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title={`New Contract for ${employee.fullName}`}
      subtitle="Create a new employment contract"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Employees', href: '/employees' },
        { label: employee.fullName, href: `/employees/${employeeId}` },
        { label: 'New Contract', isActive: true }
      ]}
      headerActions={
        <button
          type="button"
          onClick={() => router.push(`/employees/${employeeId}`)}
          className="btn-secondary"
        >
          ← Back to Employee
        </button>
      }
    >
      {/* Success Banner */}
      {contractCreated && createdContract && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-green-600 dark:text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                Contract Created Successfully!
              </h3>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Contract #{createdContract.contractNumber} has been created for {employee?.fullName}. 
                You can now download the PDF or preview it below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-center">
        <button
          type="button"
          onClick={() => {
            const form = document.querySelector('form') as HTMLFormElement;
            if (form) {
              // Trigger form submission directly
              const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
              form.dispatchEvent(submitEvent);
            }
          }}
          className="btn-primary text-lg px-8 py-3"
          disabled={saving}
        >
          📄 Create Contract
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary"
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          {contractData && (
            <>
              <button
                type="button"
                onClick={handlePreviewPDF}
                className="btn-secondary"
              >
                Preview PDF
              </button>
              <button
                type="button"
                onClick={handleGeneratePDF}
                className="btn-primary"
              >
                Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Copy Mode Toggle */}
      <div className="mb-6 card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">Contract Creation Mode</h3>
            <p className="text-sm text-secondary">Choose how to create this contract</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="contractMode"
                value="new"
                checked={!copyMode}
                onChange={() => {
                  setCopyMode(false)
                  setSelectedSourceEmployee(null)
                  setPreviousContract(null)
                }}
                className="text-blue-600"
              />
              <span className="text-sm">Create New</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="contractMode"
                value="copy"
                checked={copyMode}
                onChange={() => setCopyMode(true)}
                className="text-blue-600"
              />
              <span className="text-sm">Copy from Employee</span>
            </label>
          </div>
        </div>

        {/* Employee Contract Selector */}
        {copyMode && (
          <div className="mt-4 border-t pt-4">
            <EmployeeContractSelector
              onEmployeeSelect={setSelectedSourceEmployee}
              onContractSelect={copyContractTemplate}
              selectedEmployeeId={selectedSourceEmployee?.id}
              excludeEmployeeId={employeeId}
              selectedEmployee={selectedSourceEmployee}
              onClearSelection={() => {
                setSelectedSourceEmployee(null)
                setPreviousContract(null)
              }}
            />
            {loadingTemplate && (
              <div className="mt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-sm text-secondary mt-2">Loading contract template...</p>
              </div>
            )}
          </div>
        )}

        {/* Template Source Info */}
        {previousContract && previousContract.sourceEmployee && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">📋</span>
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Template copied from: {previousContract.sourceEmployee.fullName}
              </span>
              <span className="text-xs text-blue-600">
                ({previousContract.sourceEmployee.isActive ? 'Active' : 'Inactive'})
              </span>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Original Contract: {previousContract.originalContractNumber} •
              Created: {new Date(previousContract.createdAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hidden field for PDF contract data */}
            <input 
              type="hidden" 
              name="pdfContractData" 
              value={contractData ? JSON.stringify(buildContractPDFData('download')) : ''} 
            />
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Employment Details</h3>
              {previousContract && (
                <p className="text-sm text-secondary mb-3">
                  Previous base salary: {previousContract.baseSalary != null ? ('$' + Number(previousContract.baseSalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '—'}
                  {previousContract.contractNumber ? ` — Contract #${previousContract.contractNumber}` : ''}
                </p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Job Title *
                  </label>
                  <select
                    value={formData.jobTitleId}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, jobTitleId: e.target.value }))
                      clearFieldError('jobTitleId')
                    }}
                    className={getInputClassName('jobTitleId')}
                    required
                  >
                    <option value="">Select Job Title</option>
                    {jobTitles.map(jobTitle => (
                      <option key={jobTitle.id} value={jobTitle.id}>
                        {jobTitle.title} {jobTitle.department && `(${jobTitle.department})`}
                      </option>
                    ))}
                  </select>
                  {validationErrors.jobTitleId && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.jobTitleId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Compensation Type *
                  </label>
                  <select
                    value={formData.compensationTypeId}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, compensationTypeId: e.target.value }))
                      clearFieldError('compensationTypeId')
                    }}
                    className={getInputClassName('compensationTypeId')}
                    required
                  >
                    <option value="">Select Compensation Type</option>
                    {compensationTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.type})
                        {type.frequency && ` - ${type.frequency}`}
                      </option>
                    ))}
                  </select>
                  {validationErrors.compensationTypeId && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.compensationTypeId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Base Salary *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.baseSalary}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, baseSalary: e.target.value }))
                          clearFieldError('baseSalary')
                        }}
                        className={getInputClassName('baseSalary')}
                        placeholder="Enter salary amount"
                        required
                      />
                    </div>
                    <div className="w-32">
                      <select
                        value={formData.salaryFrequency}
                        onChange={(e) => setFormData(prev => ({ ...prev, salaryFrequency: e.target.value }))}
                        className="input-field h-full"
                        required
                      >
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                  </div>
                  {validationErrors.baseSalary && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.baseSalary}</p>
                  )}
                  <p className="mt-1 text-xs text-secondary">
                    Select the frequency that matches how you're entering the salary amount
                  </p>
                </div>

                <div>
                  {(() => {
                    const selectedJobTitle = jobTitles.find(jt => jt.id === formData.jobTitleId)
                    const availableSupervisors = employees.filter(emp => emp.id !== employeeId)
                    const isManagementRole = selectedJobTitle?.title.toLowerCase().includes('manager') ||
                                              selectedJobTitle?.title.toLowerCase().includes('director') ||
                                              selectedJobTitle?.title.toLowerCase().includes('ceo') ||
                                              selectedJobTitle?.title.toLowerCase().includes('chief') ||
                                              selectedJobTitle?.title.toLowerCase().includes('head') ||
                                              selectedJobTitle?.level?.toLowerCase().includes('senior') ||
                                              selectedJobTitle?.department?.toLowerCase() === 'executive'

                    return (
                      <>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Supervisor {!isManagementRole && availableSupervisors.length > 0 && '*'}
                          {isManagementRole && (
                            <span className="text-xs text-green-600 dark:text-green-400 ml-2">(Optional for management roles)</span>
                          )}
                          {availableSupervisors.length === 0 && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">(No other employees available)</span>
                          )}
                        </label>
                        <select
                          value={formData.supervisorId}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, supervisorId: e.target.value }))
                            clearFieldError('supervisorId')
                          }}
                          className={getInputClassName('supervisorId')}
                          required={!isManagementRole && availableSupervisors.length > 0}
                        >
                          <option value="">
                            {availableSupervisors.length === 0
                              ? "No supervisors available"
                              : isManagementRole
                                ? "No supervisor (reports to board/owner)"
                                : "Select Supervisor"}
                          </option>
                          {availableSupervisors.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.fullName} - {emp.jobTitle?.title || 'No Title'}
                            </option>
                          ))}
                        </select>
                        {validationErrors.supervisorId && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.supervisorId}</p>
                        )}
                      </>
                    )
                  })()}
                </div>

                <div>
                  <DateInput
                    label="Start Date *"
                    value={formData.startDate}
                    onChange={(isoDate, countryCode) => {
                      setFormData(prev => ({ ...prev, startDate: isoDate }))
                      clearFieldError('startDate')
                    }}
                    required
                    error={validationErrors.startDate}
                    className="w-full"
                  />
                </div>

                <div>
                  <DateInput
                    label="End Date (Optional)"
                    value={formData.endDate}
                    onChange={(isoDate, countryCode) => {
                      setFormData(prev => ({ ...prev, endDate: isoDate }))
                    }}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Probation Period (Months)
                  </label>
                  <input
                    type="number"
                    value={formData.probationPeriodMonths}
                    onChange={(e) => setFormData(prev => ({ ...prev, probationPeriodMonths: e.target.value }))}
                    className="input w-full"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isSalaryBased}
                      onChange={(e) => setFormData(prev => ({ ...prev, isSalaryBased: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm text-secondary">Salary Based</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isCommissionBased}
                      onChange={(e) => setFormData(prev => ({ ...prev, isCommissionBased: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm text-secondary">Commission Based</span>
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-secondary mb-2">
                  Additional Responsibilities
                </label>
                <textarea
                  value={formData.customResponsibilities}
                  onChange={(e) => setFormData(prev => ({ ...prev, customResponsibilities: e.target.value }))}
                  rows={4}
                  className="input w-full"
                  placeholder="Any additional responsibilities beyond the standard job title requirements..."
                />
              </div>
            </div>

            {/* Benefits Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">Benefits</h3>
                <button
                  type="button"
                  onClick={addBenefit}
                  className="btn-secondary text-sm"
                >
                  + Add Benefit
                </button>
              </div>

              {formData.benefits.map((benefit, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Benefit Type
                    </label>
                    <select
                      value={benefit.benefitTypeId}
                      onChange={(e) => updateBenefit(index, 'benefitTypeId', e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Select Benefit</option>
                      {benefit.benefitTypeId && !getAvailableBenefitTypes(index).find(t => t.id === benefit.benefitTypeId) && (
                        <option key={benefit.benefitTypeId} value={benefit.benefitTypeId}>
                          {benefitTypes.find(t => t.id === benefit.benefitTypeId)?.name} (Already selected)
                        </option>
                      )}
                      {getAvailableBenefitTypes(index).map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={benefit.amount}
                      onChange={(e) => {
                        updateBenefit(index, 'amount', e.target.value)
                        clearFieldError(`benefit_${index}_amount`)
                      }}
                      className={getInputClassName(`benefit_${index}_amount`)}
                    />
                    {validationErrors[`benefit_${index}_amount`] && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors[`benefit_${index}_amount`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={benefit.isPercentage}
                        onChange={(e) => updateBenefit(index, 'isPercentage', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      <span className="text-sm text-secondary">Percentage</span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => removeBenefit(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm text-left"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={addBenefit}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm text-left"
                    >
                      + Add Next
                    </button>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={benefit.notes}
                      onChange={(e) => updateBenefit(index, 'notes', e.target.value)}
                      className="input w-full"
                      placeholder="Additional notes about this benefit..."
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Notes Section */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Special Conditions</h3>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="input w-full"
                placeholder="Any special conditions, terms, or notes for this contract..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3">
              {contractCreated ? (
                <>
                  <button
                    type="button"
                    onClick={handleGeneratePDF}
                    className="btn-primary"
                    disabled={!contractData}
                  >
                    📄 Download PDF
                  </button>
                  
                  <button
                    type="button"
                    onClick={handlePreviewPDF}
                    className="btn-secondary"
                    disabled={!contractData}
                  >
                    👁️ Preview PDF
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => router.push(`/employees/${employeeId}?tab=contracts`)}
                    className="btn-secondary"
                  >
                    ← View All Contracts
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/employees/${employeeId}`)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      // Just show the preview without scrolling
                      setShowPreview(true)
                    }}
                    className="btn-secondary"
                    disabled={!contractData}
                  >
                    👁️ Preview Contract
                  </button>
                  
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? 'Creating Contract...' : 'Create Contract'}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        {/* Contract Preview */}
        {showPreview && contractData && (
          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="text-lg font-semibold text-primary mb-4">Contract Preview</h3>
              <div className="overflow-y-auto max-h-96 border border-gray-200 dark:border-gray-700 rounded p-4">
                <ContractTemplate data={contractData} />
              </div>
            </div>
          </div>
        )}
      </div>

    </ContentLayout>
  )
}