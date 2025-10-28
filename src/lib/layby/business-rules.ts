/**
 * Business Rules for Layby Management
 *
 * This file defines business-type-specific rules for layby agreements.
 * Each business type has different requirements for deposits, payment schedules,
 * fees, and policies.
 */

import { InstallmentFrequency, LaybyStatus } from '@prisma/client'

// Types
export type BusinessType = 'clothing' | 'hardware' | 'grocery' | 'restaurant' | 'construction' | 'other'

export type RefundPolicy = 'FULL' | 'PARTIAL' | 'NONE'

export type InventoryReservation = 'FULL' | 'PARTIAL' | 'NONE'

export interface LaybyBusinessRule {
  businessType: BusinessType

  // Deposit Requirements
  depositPercent: {
    min: number  // Minimum deposit percentage (0-100)
    max: number  // Maximum deposit percentage (0-100)
    default: number  // Default/recommended deposit percentage
  }

  // Payment Schedule
  installmentFrequency: {
    allowed: InstallmentFrequency[]  // Allowed payment frequencies
    default: InstallmentFrequency  // Default frequency
  }

  // Duration
  maxDurationDays: number  // Maximum layby duration in days

  // Fees
  fees: {
    serviceFeePercent: number  // Service fee as percentage of total (0-100)
    lateFeeAmount: number  // Flat late fee amount
    administrationFeeAmount: number  // Flat admin fee amount
  }

  // Policies
  policies: {
    allowPartialRelease: boolean  // Can items be released in parts?
    inventoryReservation: InventoryReservation  // How to handle inventory
    refundPolicy: RefundPolicy  // Refund policy on cancellation
    cancellationFeePercent: number  // Cancellation fee percentage (0-100)
    requiresApproval: boolean  // Does layby require manager approval?
  }

  // Automation Settings
  automation: {
    autoCompleteOnFullPayment: boolean  // Auto-complete when fully paid
    sendPaymentReminders: boolean  // Send payment reminder notifications
    defaultAfterMissedPayments: number  // Number of missed payments before default
    applyLateFeeAfterDays: number  // Days after due date to apply late fee
  }

  // Validation Rules
  validation: {
    minItemCount: number  // Minimum number of items
    maxItemCount: number  // Maximum number of items (0 = unlimited)
    minTotalAmount: number  // Minimum total amount
    maxTotalAmount: number  // Maximum total amount (0 = unlimited)
  }
}

/**
 * Default rules for clothing businesses
 */
export const clothingBusinessRules: LaybyBusinessRule = {
  businessType: 'clothing',

  depositPercent: {
    min: 20,
    max: 80,
    default: 20
  },

  installmentFrequency: {
    allowed: ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'],
    default: 'FORTNIGHTLY'
  },

  maxDurationDays: 90,

  fees: {
    serviceFeePercent: 0,
    lateFeeAmount: 5.00,
    administrationFeeAmount: 0
  },

  policies: {
    allowPartialRelease: false,  // Hold all items until full payment
    inventoryReservation: 'FULL',
    refundPolicy: 'PARTIAL',  // Keep deposit on cancellation
    cancellationFeePercent: 10,
    requiresApproval: false
  },

  automation: {
    autoCompleteOnFullPayment: true,
    sendPaymentReminders: true,
    defaultAfterMissedPayments: 2,
    applyLateFeeAfterDays: 1
  },

  validation: {
    minItemCount: 1,
    maxItemCount: 20,
    minTotalAmount: 50,
    maxTotalAmount: 5000
  }
}

/**
 * Default rules for hardware businesses
 */
export const hardwareBusinessRules: LaybyBusinessRule = {
  businessType: 'hardware',

  depositPercent: {
    min: 50,
    max: 80,
    default: 50
  },

  installmentFrequency: {
    allowed: ['FORTNIGHTLY', 'MONTHLY'],
    default: 'MONTHLY'
  },

  maxDurationDays: 60,

  fees: {
    serviceFeePercent: 1,
    lateFeeAmount: 10.00,
    administrationFeeAmount: 5.00
  },

  policies: {
    allowPartialRelease: true,  // Can release items as sections are paid
    inventoryReservation: 'FULL',
    refundPolicy: 'FULL',  // Full refund if cancelled within 48hrs
    cancellationFeePercent: 5,
    requiresApproval: false
  },

  automation: {
    autoCompleteOnFullPayment: true,
    sendPaymentReminders: true,
    defaultAfterMissedPayments: 1,
    applyLateFeeAfterDays: 1
  },

  validation: {
    minItemCount: 1,
    maxItemCount: 15,
    minTotalAmount: 100,
    maxTotalAmount: 10000
  }
}

/**
 * Default rules for grocery businesses
 */
export const groceryBusinessRules: LaybyBusinessRule = {
  businessType: 'grocery',

  depositPercent: {
    min: 30,
    max: 70,
    default: 30
  },

  installmentFrequency: {
    allowed: ['WEEKLY', 'FORTNIGHTLY'],
    default: 'WEEKLY'
  },

  maxDurationDays: 30,  // Short for perishables

  fees: {
    serviceFeePercent: 0,
    lateFeeAmount: 2.00,
    administrationFeeAmount: 0
  },

  policies: {
    allowPartialRelease: false,
    inventoryReservation: 'PARTIAL',  // Don't reserve perishables
    refundPolicy: 'PARTIAL',  // Keep deposit
    cancellationFeePercent: 15,
    requiresApproval: false
  },

  automation: {
    autoCompleteOnFullPayment: true,
    sendPaymentReminders: true,
    defaultAfterMissedPayments: 1,
    applyLateFeeAfterDays: 1
  },

  validation: {
    minItemCount: 1,
    maxItemCount: 30,
    minTotalAmount: 50,
    maxTotalAmount: 2000
  }
}

/**
 * Default rules for restaurant businesses
 */
export const restaurantBusinessRules: LaybyBusinessRule = {
  businessType: 'restaurant',

  depositPercent: {
    min: 100,  // Events require full payment
    max: 100,
    default: 100
  },

  installmentFrequency: {
    allowed: ['WEEKLY', 'CUSTOM'],
    default: 'WEEKLY'
  },

  maxDurationDays: 14,  // Short window for events

  fees: {
    serviceFeePercent: 2,
    lateFeeAmount: 20.00,
    administrationFeeAmount: 10.00
  },

  policies: {
    allowPartialRelease: false,
    inventoryReservation: 'NONE',  // Service-based, no inventory
    refundPolicy: 'PARTIAL',  // Keep deposit
    cancellationFeePercent: 25,
    requiresApproval: true  // Events need approval
  },

  automation: {
    autoCompleteOnFullPayment: true,
    sendPaymentReminders: true,
    defaultAfterMissedPayments: 1,
    applyLateFeeAfterDays: 1
  },

  validation: {
    minItemCount: 1,
    maxItemCount: 0,  // Unlimited for catering
    minTotalAmount: 200,
    maxTotalAmount: 0  // Unlimited
  }
}

/**
 * Default rules for construction businesses
 */
export const constructionBusinessRules: LaybyBusinessRule = {
  businessType: 'construction',

  depositPercent: {
    min: 40,
    max: 90,
    default: 40
  },

  installmentFrequency: {
    allowed: ['FORTNIGHTLY', 'MONTHLY', 'CUSTOM'],
    default: 'MONTHLY'
  },

  maxDurationDays: 120,  // Longer for project materials

  fees: {
    serviceFeePercent: 1.5,
    lateFeeAmount: 15.00,
    administrationFeeAmount: 10.00
  },

  policies: {
    allowPartialRelease: true,  // Release materials as paid
    inventoryReservation: 'FULL',
    refundPolicy: 'FULL',
    cancellationFeePercent: 5,
    requiresApproval: true  // Large orders need approval
  },

  automation: {
    autoCompleteOnFullPayment: true,
    sendPaymentReminders: true,
    defaultAfterMissedPayments: 2,
    applyLateFeeAfterDays: 2
  },

  validation: {
    minItemCount: 1,
    maxItemCount: 50,
    minTotalAmount: 500,
    maxTotalAmount: 50000
  }
}

/**
 * Default rules for other/unspecified business types
 */
export const defaultBusinessRules: LaybyBusinessRule = {
  businessType: 'other',

  depositPercent: {
    min: 20,
    max: 80,
    default: 30
  },

  installmentFrequency: {
    allowed: ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM'],
    default: 'FORTNIGHTLY'
  },

  maxDurationDays: 60,

  fees: {
    serviceFeePercent: 0,
    lateFeeAmount: 5.00,
    administrationFeeAmount: 0
  },

  policies: {
    allowPartialRelease: false,
    inventoryReservation: 'FULL',
    refundPolicy: 'PARTIAL',
    cancellationFeePercent: 10,
    requiresApproval: false
  },

  automation: {
    autoCompleteOnFullPayment: true,
    sendPaymentReminders: true,
    defaultAfterMissedPayments: 2,
    applyLateFeeAfterDays: 1
  },

  validation: {
    minItemCount: 1,
    maxItemCount: 20,
    minTotalAmount: 50,
    maxTotalAmount: 10000
  }
}

/**
 * Rules registry - maps business types to their rules
 */
export const businessRulesRegistry: Record<BusinessType, LaybyBusinessRule> = {
  clothing: clothingBusinessRules,
  hardware: hardwareBusinessRules,
  grocery: groceryBusinessRules,
  restaurant: restaurantBusinessRules,
  construction: constructionBusinessRules,
  other: defaultBusinessRules
}

/**
 * Get business rules for a specific business type
 */
export function getBusinessRules(businessType: string): LaybyBusinessRule {
  const normalizedType = businessType.toLowerCase() as BusinessType
  return businessRulesRegistry[normalizedType] || defaultBusinessRules
}

/**
 * Validate if a layby configuration meets business rules
 */
export interface LaybyValidationInput {
  businessType: string
  depositPercent: number
  installmentFrequency?: InstallmentFrequency
  durationDays: number
  totalAmount: number
  itemCount: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateLaybyAgainstRules(input: LaybyValidationInput): ValidationResult {
  const rules = getBusinessRules(input.businessType)
  const errors: string[] = []
  const warnings: string[] = []

  // Validate deposit percentage
  if (input.depositPercent < rules.depositPercent.min) {
    errors.push(`Deposit must be at least ${rules.depositPercent.min}%`)
  }
  if (input.depositPercent > rules.depositPercent.max) {
    errors.push(`Deposit cannot exceed ${rules.depositPercent.max}%`)
  }

  // Validate installment frequency
  if (input.installmentFrequency && !rules.installmentFrequency.allowed.includes(input.installmentFrequency)) {
    errors.push(`Installment frequency ${input.installmentFrequency} is not allowed for ${rules.businessType} business`)
  }

  // Validate duration
  if (input.durationDays > rules.maxDurationDays) {
    errors.push(`Layby duration cannot exceed ${rules.maxDurationDays} days`)
  }
  if (input.durationDays < 1) {
    errors.push(`Layby duration must be at least 1 day`)
  }

  // Validate total amount
  if (rules.validation.minTotalAmount > 0 && input.totalAmount < rules.validation.minTotalAmount) {
    errors.push(`Total amount must be at least $${rules.validation.minTotalAmount.toFixed(2)}`)
  }
  if (rules.validation.maxTotalAmount > 0 && input.totalAmount > rules.validation.maxTotalAmount) {
    errors.push(`Total amount cannot exceed $${rules.validation.maxTotalAmount.toFixed(2)}`)
  }

  // Validate item count
  if (input.itemCount < rules.validation.minItemCount) {
    errors.push(`Must have at least ${rules.validation.minItemCount} item(s)`)
  }
  if (rules.validation.maxItemCount > 0 && input.itemCount > rules.validation.maxItemCount) {
    errors.push(`Cannot exceed ${rules.validation.maxItemCount} items`)
  }

  // Warnings (not blocking)
  if (input.depositPercent !== rules.depositPercent.default) {
    warnings.push(`Recommended deposit is ${rules.depositPercent.default}%`)
  }

  if (input.installmentFrequency && input.installmentFrequency !== rules.installmentFrequency.default) {
    warnings.push(`Recommended payment frequency is ${rules.installmentFrequency.default}`)
  }

  if (rules.policies.requiresApproval) {
    warnings.push('This layby requires manager approval before completion')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Calculate recommended fees based on business rules
 */
export function calculateRecommendedFees(
  businessType: string,
  totalAmount: number
): {
  serviceFee: number
  administrationFee: number
  lateFee: number
} {
  const rules = getBusinessRules(businessType)

  return {
    serviceFee: (totalAmount * rules.fees.serviceFeePercent) / 100,
    administrationFee: rules.fees.administrationFeeAmount,
    lateFee: rules.fees.lateFeeAmount
  }
}

/**
 * Calculate cancellation refund based on business rules
 */
export function calculateCancellationRefund(
  businessType: string,
  totalPaid: number,
  depositAmount: number
): {
  refundAmount: number
  cancellationFee: number
  keepDeposit: boolean
} {
  const rules = getBusinessRules(businessType)
  const cancellationFee = (totalPaid * rules.policies.cancellationFeePercent) / 100

  let refundAmount = 0
  let keepDeposit = false

  switch (rules.policies.refundPolicy) {
    case 'FULL':
      refundAmount = totalPaid - cancellationFee
      keepDeposit = false
      break
    case 'PARTIAL':
      refundAmount = totalPaid - depositAmount - cancellationFee
      keepDeposit = true
      break
    case 'NONE':
      refundAmount = 0
      keepDeposit = true
      break
  }

  // Ensure refund is not negative
  refundAmount = Math.max(0, refundAmount)

  return {
    refundAmount,
    cancellationFee,
    keepDeposit
  }
}

/**
 * Check if layby is overdue based on payment due date
 */
export function isLaybyOverdue(paymentDueDate: Date | null): boolean {
  if (!paymentDueDate) return false
  return new Date() > paymentDueDate
}

/**
 * Check if layby should be defaulted based on business rules
 */
export function shouldDefaultLayby(
  businessType: string,
  missedPaymentCount: number
): boolean {
  const rules = getBusinessRules(businessType)
  return missedPaymentCount >= rules.automation.defaultAfterMissedPayments
}

/**
 * Get all business types
 */
export function getAllBusinessTypes(): BusinessType[] {
  return Object.keys(businessRulesRegistry) as BusinessType[]
}

/**
 * Get human-readable business type name
 */
export function getBusinessTypeName(businessType: BusinessType): string {
  const names: Record<BusinessType, string> = {
    clothing: 'Clothing & Fashion',
    hardware: 'Hardware & Tools',
    grocery: 'Grocery & Food',
    restaurant: 'Restaurant & Catering',
    construction: 'Construction & Building',
    other: 'General Business'
  }
  return names[businessType] || 'Unknown'
}
