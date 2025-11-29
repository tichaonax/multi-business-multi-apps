// Payee Types for Expense Account Payments

import type { PayeeType } from './expense-account'

// Base Payee Interface
export interface Payee {
  id: string
  type: PayeeType
  name: string
  displayName: string
  identifier?: string // Employee number, national ID, email, etc.
  isActive: boolean
}

// User Payee
export interface UserPayee extends Payee {
  type: 'USER'
  email: string
  role: string
}

// Employee Payee
export interface EmployeePayee extends Payee {
  type: 'EMPLOYEE'
  employeeNumber: string
  fullName: string
  nationalId: string
  email?: string | null
  phone: string
  jobTitle?: string
  primaryBusiness?: {
    id: string
    name: string
  }
}

// Person Payee (Contractor/Individual)
export interface PersonPayee extends Payee {
  type: 'PERSON'
  fullName: string
  nationalId?: string | null
  phone: string
  email?: string | null
  address?: string | null
}

// Business Payee
export interface BusinessPayee extends Payee {
  type: 'BUSINESS'
  businessName: string
  businessType: string
  description?: string | null
}

// Union type for all payee types
export type AnyPayee = UserPayee | EmployeePayee | PersonPayee | BusinessPayee

// Payee Reference (used when selecting a payee in forms)
export interface PayeeReference {
  type: PayeeType
  id: string
  name: string
  identifier?: string
}

// Individual Payee Creation Input (for on-the-fly creation)
export interface CreateIndividualPayeeInput {
  fullName: string
  nationalId?: string
  idFormatTemplateId?: string  // ID format template for national ID
  phone?: string
  email?: string
  address?: string
}

// Grouped Payees (for dropdown/selector UI)
export interface GroupedPayees {
  users: UserPayee[]
  employees: EmployeePayee[]
  persons: PersonPayee[]
  businesses: BusinessPayee[]
}

// Helper type guards
export function isUserPayee(payee: AnyPayee): payee is UserPayee {
  return payee.type === 'USER'
}

export function isEmployeePayee(payee: AnyPayee): payee is EmployeePayee {
  return payee.type === 'EMPLOYEE'
}

export function isPersonPayee(payee: AnyPayee): payee is PersonPayee {
  return payee.type === 'PERSON'
}

export function isBusinessPayee(payee: AnyPayee): payee is BusinessPayee {
  return payee.type === 'BUSINESS'
}

// Helper function to format payee display name
export function formatPayeeDisplayName(payee: AnyPayee): string {
  switch (payee.type) {
    case 'USER':
      return `${payee.name} (${payee.email})`
    case 'EMPLOYEE':
      return `${payee.fullName} - ${payee.employeeNumber}`
    case 'PERSON':
      return payee.nationalId
        ? `${payee.fullName} (${payee.nationalId})`
        : payee.fullName
    case 'BUSINESS':
      return `${payee.businessName} [${payee.businessType}]`
  }
}

// Helper function to get payee identifier
export function getPayeeIdentifier(payee: AnyPayee): string | undefined {
  switch (payee.type) {
    case 'USER':
      return payee.email
    case 'EMPLOYEE':
      return payee.employeeNumber
    case 'PERSON':
      return payee.nationalId || payee.phone
    case 'BUSINESS':
      return payee.businessType
  }
}

export default Payee
