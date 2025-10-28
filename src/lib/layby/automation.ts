/**
 * Layby Automation Utilities
 *
 * This file contains automation functions for layby management including:
 * - Payment reminders
 * - Late fee application
 * - Default handling
 * - Status monitoring
 */

import { prisma } from '@/lib/prisma'
import { LaybyStatus } from '@prisma/client'
import { getBusinessRules, shouldDefaultLayby } from './business-rules'
import { sendNotification, NotificationData } from './notifications'

export interface AutomationResult {
  success: boolean
  processed: number
  errors: string[]
  details: Record<string, any>[]
}

export interface PaymentReminderResult {
  laybyId: string
  laybyNumber: string
  customerName: string
  daysUntilDue: number
  sent: string[]
  errors: string[]
}

export interface LateFeeResult {
  laybyId: string
  laybyNumber: string
  lateFeeAmount: number
  newBalance: number
  applied: boolean
  error?: string
}

export interface DefaultResult {
  laybyId: string
  laybyNumber: string
  missedPayments: number
  defaulted: boolean
  error?: string
}

/**
 * Find laybys that need payment reminders
 * Sends reminders at: 3 days before, 1 day before, on due date, 1 day after
 */
export async function processPaymentReminders(
  businessId?: string
): Promise<AutomationResult> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate reminder dates
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const oneDayFromNow = new Date(today)
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)

    // Find ACTIVE laybys with upcoming or current due dates
    const where: any = {
      status: 'ACTIVE',
      balanceRemaining: { gt: 0 },
      paymentDueDate: {
        gte: today,
        lte: threeDaysFromNow
      }
    }

    if (businessId) {
      where.businessId = businessId
    }

    const laybys = await prisma.customerLayby.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            type: true,
            phone: true,
            email: true
          }
        }
      }
    })

    const results: PaymentReminderResult[] = []
    const errors: string[] = []

    for (const layby of laybys) {
      try {
        if (!layby.customer) {
          errors.push(`Layby ${layby.laybyNumber}: No customer found`)
          continue
        }

        if (!layby.customer.phone && !layby.customer.email) {
          errors.push(`Layby ${layby.laybyNumber}: Customer has no contact information`)
          continue
        }

        // Calculate days until due
        const dueDate = layby.paymentDueDate ? new Date(layby.paymentDueDate) : null
        if (!dueDate) continue

        const diffTime = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Only send reminders at specific intervals
        if (![3, 1, 0].includes(daysUntilDue)) {
          continue
        }

        // Prepare notification data
        const notificationData: NotificationData = {
          layby: {
            laybyNumber: layby.laybyNumber,
            status: layby.status,
            balanceRemaining: layby.balanceRemaining.toNumber(),
            totalAmount: layby.totalAmount.toNumber(),
            totalPaid: layby.totalPaid.toNumber()
          },
          customer: {
            name: layby.customer.name,
            phone: layby.customer.phone,
            email: layby.customer.email
          },
          business: {
            name: layby.business.name,
            phone: layby.business.phone,
            email: layby.business.email
          },
          additionalData: {
            daysUntilDue,
            paymentDueDate: dueDate,
            installmentAmount: layby.installmentAmount?.toNumber() || layby.balanceRemaining.toNumber()
          }
        }

        // Send notification
        const result = await sendNotification('PAYMENT_REMINDER', notificationData)

        results.push({
          laybyId: layby.id,
          laybyNumber: layby.laybyNumber,
          customerName: layby.customer.name,
          daysUntilDue,
          sent: result.sent,
          errors: result.errors
        })

        // Log the reminder
        console.log(`[Reminder] Sent to ${layby.customer.name} for ${layby.laybyNumber} (${daysUntilDue} days until due)`)
      } catch (error) {
        const errorMsg = `Layby ${layby.laybyNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    return {
      success: true,
      processed: results.length,
      errors,
      details: results
    }
  } catch (error) {
    console.error('Payment reminder automation error:', error)
    return {
      success: false,
      processed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      details: []
    }
  }
}

/**
 * Process overdue payment notifications
 * Sends notifications for payments that are overdue
 */
export async function processOverdueNotifications(
  businessId?: string
): Promise<AutomationResult> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find ACTIVE laybys with overdue payments
    const where: any = {
      status: 'ACTIVE',
      balanceRemaining: { gt: 0 },
      paymentDueDate: {
        lt: today
      }
    }

    if (businessId) {
      where.businessId = businessId
    }

    const laybys = await prisma.customerLayby.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            type: true,
            phone: true,
            email: true
          }
        }
      }
    })

    const results: any[] = []
    const errors: string[] = []

    for (const layby of laybys) {
      try {
        if (!layby.customer) {
          errors.push(`Layby ${layby.laybyNumber}: No customer found`)
          continue
        }

        if (!layby.customer.phone && !layby.customer.email) {
          errors.push(`Layby ${layby.laybyNumber}: Customer has no contact information`)
          continue
        }

        // Calculate days overdue
        const dueDate = layby.paymentDueDate ? new Date(layby.paymentDueDate) : null
        if (!dueDate) continue

        const diffTime = today.getTime() - dueDate.getTime()
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Get business rules for late fee
        const rules = getBusinessRules(layby.business.type)

        // Prepare notification data
        const notificationData: NotificationData = {
          layby: {
            laybyNumber: layby.laybyNumber,
            status: layby.status,
            balanceRemaining: layby.balanceRemaining.toNumber(),
            totalAmount: layby.totalAmount.toNumber(),
            totalPaid: layby.totalPaid.toNumber()
          },
          customer: {
            name: layby.customer.name,
            phone: layby.customer.phone,
            email: layby.customer.email
          },
          business: {
            name: layby.business.name,
            phone: layby.business.phone,
            email: layby.business.email
          },
          additionalData: {
            daysOverdue,
            lateFee: rules.fees.lateFeeAmount
          }
        }

        // Send overdue notification
        const result = await sendNotification('PAYMENT_OVERDUE', notificationData)

        results.push({
          laybyId: layby.id,
          laybyNumber: layby.laybyNumber,
          customerName: layby.customer.name,
          daysOverdue,
          sent: result.sent,
          errors: result.errors
        })

        console.log(`[Overdue] Notified ${layby.customer.name} for ${layby.laybyNumber} (${daysOverdue} days overdue)`)
      } catch (error) {
        const errorMsg = `Layby ${layby.laybyNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    return {
      success: true,
      processed: results.length,
      errors,
      details: results
    }
  } catch (error) {
    console.error('Overdue notification automation error:', error)
    return {
      success: false,
      processed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      details: []
    }
  }
}

/**
 * Apply late fees to overdue laybys
 * Applies late fee based on business rules after grace period
 */
export async function applyLateFees(
  businessId?: string
): Promise<AutomationResult> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find ACTIVE laybys with overdue payments
    const where: any = {
      status: 'ACTIVE',
      balanceRemaining: { gt: 0 },
      paymentDueDate: {
        lt: today
      }
    }

    if (businessId) {
      where.businessId = businessId
    }

    const laybys = await prisma.customerLayby.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            type: true,
            phone: true,
            email: true
          }
        }
      }
    })

    const results: LateFeeResult[] = []
    const errors: string[] = []

    for (const layby of laybys) {
      try {
        // Get business rules
        const rules = getBusinessRules(layby.business.type)

        // Check if enough days have passed to apply late fee
        const dueDate = layby.paymentDueDate ? new Date(layby.paymentDueDate) : null
        if (!dueDate) continue

        const diffTime = today.getTime() - dueDate.getTime()
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (daysOverdue < rules.automation.applyLateFeeAfterDays) {
          continue // Not yet time to apply late fee
        }

        const lateFeeAmount = rules.fees.lateFeeAmount

        // Check if late fee already applied today (to avoid double-charging)
        // This is a simplified check - in production, track applied fees in database
        const currentLateFee = layby.lateFee.toNumber()
        if (currentLateFee >= lateFeeAmount) {
          continue // Already applied
        }

        // Apply late fee
        const updatedLayby = await prisma.customerLayby.update({
          where: { id: layby.id },
          data: {
            lateFee: currentLateFee + lateFeeAmount,
            totalFees: layby.totalFees.toNumber() + lateFeeAmount,
            balanceRemaining: layby.balanceRemaining.toNumber() + lateFeeAmount
          }
        })

        results.push({
          laybyId: layby.id,
          laybyNumber: layby.laybyNumber,
          lateFeeAmount,
          newBalance: updatedLayby.balanceRemaining.toNumber(),
          applied: true
        })

        // Send notification
        if (layby.customer) {
          const notificationData: NotificationData = {
            layby: {
              laybyNumber: layby.laybyNumber,
              status: layby.status,
              balanceRemaining: updatedLayby.balanceRemaining.toNumber(),
              totalAmount: layby.totalAmount.toNumber(),
              totalPaid: layby.totalPaid.toNumber()
            },
            customer: {
              name: layby.customer.name,
              phone: layby.customer.phone,
              email: layby.customer.email
            },
            business: {
              name: layby.business.name,
              phone: layby.business.phone,
              email: layby.business.email
            },
            additionalData: {
              lateFeeAmount
            }
          }

          await sendNotification('LATE_FEE_APPLIED', notificationData)
        }

        console.log(`[Late Fee] Applied ${lateFeeAmount} to ${layby.laybyNumber}`)
      } catch (error) {
        const errorMsg = `Layby ${layby.laybyNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        results.push({
          laybyId: layby.id,
          laybyNumber: layby.laybyNumber,
          lateFeeAmount: 0,
          newBalance: layby.balanceRemaining.toNumber(),
          applied: false,
          error: errorMsg
        })
        console.error(errorMsg)
      }
    }

    return {
      success: true,
      processed: results.length,
      errors,
      details: results
    }
  } catch (error) {
    console.error('Late fee automation error:', error)
    return {
      success: false,
      processed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      details: []
    }
  }
}

/**
 * Process layby defaults
 * Changes status to DEFAULTED based on business rules for missed payments
 */
export async function processDefaults(
  businessId?: string
): Promise<AutomationResult> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find ACTIVE laybys with overdue payments
    const where: any = {
      status: 'ACTIVE',
      balanceRemaining: { gt: 0 },
      paymentDueDate: {
        lt: today
      }
    }

    if (businessId) {
      where.businessId = businessId
    }

    const laybys = await prisma.customerLayby.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            type: true,
            phone: true,
            email: true
          }
        },
        payments: {
          orderBy: {
            paymentDate: 'desc'
          },
          take: 5
        }
      }
    })

    const results: DefaultResult[] = []
    const errors: string[] = []

    for (const layby of laybys) {
      try {
        // Calculate missed payments
        // Simple heuristic: count significant overdue periods
        // In production, track payment schedule more precisely
        const dueDate = layby.paymentDueDate ? new Date(layby.paymentDueDate) : null
        if (!dueDate) continue

        const diffTime = today.getTime() - dueDate.getTime()
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Estimate missed payments based on installment frequency
        let missedPayments = 0
        if (layby.installmentFrequency === 'WEEKLY' && daysOverdue >= 7) {
          missedPayments = Math.floor(daysOverdue / 7)
        } else if (layby.installmentFrequency === 'FORTNIGHTLY' && daysOverdue >= 14) {
          missedPayments = Math.floor(daysOverdue / 14)
        } else if (layby.installmentFrequency === 'MONTHLY' && daysOverdue >= 30) {
          missedPayments = Math.floor(daysOverdue / 30)
        } else {
          missedPayments = daysOverdue >= 30 ? 1 : 0
        }

        // Check if should default
        const shouldDefault = shouldDefaultLayby(layby.business.type, missedPayments)

        if (!shouldDefault) {
          continue
        }

        // Mark as defaulted
        await prisma.customerLayby.update({
          where: { id: layby.id },
          data: {
            status: 'DEFAULTED'
          }
        })

        results.push({
          laybyId: layby.id,
          laybyNumber: layby.laybyNumber,
          missedPayments,
          defaulted: true
        })

        // Send notification
        if (layby.customer) {
          const notificationData: NotificationData = {
            layby: {
              laybyNumber: layby.laybyNumber,
              status: 'DEFAULTED',
              balanceRemaining: layby.balanceRemaining.toNumber(),
              totalAmount: layby.totalAmount.toNumber(),
              totalPaid: layby.totalPaid.toNumber()
            },
            customer: {
              name: layby.customer.name,
              phone: layby.customer.phone,
              email: layby.customer.email
            },
            business: {
              name: layby.business.name,
              phone: layby.business.phone,
              email: layby.business.email
            }
          }

          await sendNotification('LAYBY_DEFAULTED', notificationData)
        }

        console.log(`[Default] Marked ${layby.laybyNumber} as DEFAULTED (${missedPayments} missed payments)`)
      } catch (error) {
        const errorMsg = `Layby ${layby.laybyNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        results.push({
          laybyId: layby.id,
          laybyNumber: layby.laybyNumber,
          missedPayments: 0,
          defaulted: false,
          error: errorMsg
        })
        console.error(errorMsg)
      }
    }

    return {
      success: true,
      processed: results.length,
      errors,
      details: results
    }
  } catch (error) {
    console.error('Default processing automation error:', error)
    return {
      success: false,
      processed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      details: []
    }
  }
}

/**
 * Run all automation tasks
 * Processes reminders, overdue notifications, late fees, and defaults
 */
export async function runAllAutomation(
  businessId?: string
): Promise<{
  paymentReminders: AutomationResult
  overdueNotifications: AutomationResult
  lateFees: AutomationResult
  defaults: AutomationResult
  totalProcessed: number
  totalErrors: number
}> {
  console.log('[Automation] Starting layby automation run...')

  const paymentReminders = await processPaymentReminders(businessId)
  const overdueNotifications = await processOverdueNotifications(businessId)
  const lateFees = await applyLateFees(businessId)
  const defaults = await processDefaults(businessId)

  const totalProcessed =
    paymentReminders.processed +
    overdueNotifications.processed +
    lateFees.processed +
    defaults.processed

  const totalErrors =
    paymentReminders.errors.length +
    overdueNotifications.errors.length +
    lateFees.errors.length +
    defaults.errors.length

  console.log(`[Automation] Complete: ${totalProcessed} processed, ${totalErrors} errors`)

  return {
    paymentReminders,
    overdueNotifications,
    lateFees,
    defaults,
    totalProcessed,
    totalErrors
  }
}

/**
 * Get layby statistics for monitoring
 */
export async function getLaybyStatistics(businessId?: string) {
  const where: any = {}
  if (businessId) {
    where.businessId = businessId
  }

  const [
    totalActive,
    totalOverdue,
    totalOnHold,
    totalDefaulted,
    totalCompleted,
    totalCancelled
  ] = await Promise.all([
    prisma.customerLayby.count({
      where: { ...where, status: 'ACTIVE', balanceRemaining: { gt: 0 } }
    }),
    prisma.customerLayby.count({
      where: {
        ...where,
        status: 'ACTIVE',
        balanceRemaining: { gt: 0 },
        paymentDueDate: { lt: new Date() }
      }
    }),
    prisma.customerLayby.count({
      where: { ...where, status: 'ON_HOLD' }
    }),
    prisma.customerLayby.count({
      where: { ...where, status: 'DEFAULTED' }
    }),
    prisma.customerLayby.count({
      where: { ...where, status: 'COMPLETED' }
    }),
    prisma.customerLayby.count({
      where: { ...where, status: 'CANCELLED' }
    })
  ])

  return {
    totalActive,
    totalOverdue,
    totalOnHold,
    totalDefaulted,
    totalCompleted,
    totalCancelled,
    requiresAttention: totalOverdue + totalDefaulted
  }
}
