// Shared Employee type used across the app to avoid duplicate inline interfaces
export type Benefit = {
  id: string
  amount: number
  isPercentage: boolean
  notes: string | null
  benefitType: {
    name: string
    type: string
  }
}

export type Contract = {
  id: string
  contractNumber: string
  version: number
  status: string
  startDate: string
  endDate: string | null
  baseSalary: number
  isCommissionBased: boolean
  isSalaryBased: boolean
  notes: string | null
  createdAt: string
  benefits: Benefit[]
  // present but may be null for unsigned contracts
  employeeSignedAt: string | null
}

export type DisciplinaryAction = {
  id: string
  type: string
  severity: string
  description: string
  actionTaken: string
  actionDate: string
  followUpDate: string | null
  isResolved: boolean
}

export type JobTitle = {
  id: string
  title: string
  department: string | null
  level: string | null
  description: string | null
  responsibilities: string[]
}

export type CompensationType = {
  id: string
  name: string
  type: string
  description: string | null
}

export type Supervisor = {
  id: string
  fullName: string
  jobTitle: {
    title: string
  }
}

export type BusinessRef = {
  id: string
  name: string
  type: string
}

export type BusinessAssignment = {
  business: BusinessRef
  role: string | null
  isActive: boolean
  // some consumers expect an isPrimary flag
  isPrimary?: boolean
  assignedAt: string
}

export type Subordinate = {
  id: string
  fullName: string
  jobTitle: {
    title: string
  }
}

export type Employee = {
  id: string
  employeeNumber: string
  userId: string | null
  firstName: string
  lastName: string
  fullName: string
  email: string | null
  phone: string
  address: string | null
  dateOfBirth: string | null
  nationalId: string | null
  driverLicense: string | null
  passportNumber: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelation: string | null
  hireDate: string
  employmentStatus: string
  terminationDate: string | null
  terminationReason: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    // optional properties present in some consumers
    isActive?: boolean
    role?: string | null
  } | null
  jobTitle: JobTitle
  compensationType: CompensationType
  supervisor: Supervisor | null
  primaryBusiness: BusinessRef
  businessAssignments: BusinessAssignment[]
  contracts: Contract[]
  // optional cached/current contract used by some UI components
  currentContract?: Contract | null
  disciplinaryActions: DisciplinaryAction[]
  subordinates: Subordinate[]
  _count: {
    subordinates: number
    disciplinaryActions: number
  }
  // optional UI-only / derived fields used in some pages
  currentSalary?: {
    annualSalary: number
    monthlySalary: number
    frequency: string
  }
  totalBenefits?: number
  totalRemuneration?: number
  monthlyRemuneration?: number
}

export default Employee
