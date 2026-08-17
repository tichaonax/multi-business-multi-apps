import { prisma } from '@/lib/prisma'

export interface EligibleTask {
  taskId: string
  amount: number
  serviceName: string
  jobId: string
  vehicle: string | null
  orderNumber: string
  orderDate: Date
}

export interface PendingSubmissionTask extends EligibleTask {
  contractorId: string
  contractorName: string
  completedAt: Date
}

// Contractor payments are processed on a monthly cycle — work is expected to be paid
// out by the end of the calendar month it falls in, unless a specific payout overrides
// that. Shared by the payout routes and the pending/overdue report so both use the same
// rule.
export function getDueDate(referenceDate: Date, override?: Date | null): Date {
  if (override) return override
  return new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 0, 23, 59, 59, 999))
}

const OVERDUE_GRACE_DAYS = 7

export function daysOverdue(dueDate: Date, now: Date = new Date()): number {
  const msPastDue = now.getTime() - dueDate.getTime()
  const daysPastDue = Math.floor(msPastDue / (24 * 60 * 60 * 1000))
  return daysPastDue - OVERDUE_GRACE_DAYS
}

export function isOverdue(dueDate: Date, now: Date = new Date()): boolean {
  return daysOverdue(dueDate, now) > 0
}

// Completed tasks for this contractor whose job was billed into a still-valid,
// paid order, within the period, and not already included in a prior payout.
// Shared by the preview and create endpoints so they can never disagree —
// the "not yet paid" and "still valid" rules only need to be correct once.
export async function getEligibleTasks(
  contractorId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<EligibleTask[]> {
  const tasks = await prisma.vehicleServiceTasks.findMany({
    where: {
      contractorId,
      status: 'completed',
      payoutItem: null,
      job: {
        orderId: { not: null },
        business_orders: {
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      },
    },
    select: {
      id: true,
      agreedFeeAmount: true,
      contractorFeeOverride: true,
      subcategory: { select: { name: true } },
      job: {
        select: {
          id: true,
          vehicleMake: true,
          vehicleModel: true,
          business_orders: { select: { orderNumber: true, createdAt: true } },
        },
      },
    },
    orderBy: { completedAt: 'asc' },
  })

  return tasks.map(t => ({
    taskId: t.id,
    amount: Number(t.contractorFeeOverride ?? t.agreedFeeAmount),
    serviceName: t.subcategory.name,
    jobId: t.job.id,
    vehicle: [t.job.vehicleMake, t.job.vehicleModel].filter(Boolean).join(' ') || null,
    orderNumber: t.job.business_orders!.orderNumber,
    orderDate: t.job.business_orders!.createdAt,
  }))
}

// Every completed, billed+paid task across all of a business's contractors that hasn't
// been included in any payout yet — the "Pending Submissions" side of the payments
// report. No period bound: a task that's been sitting unsubmitted for months is exactly
// what this report exists to surface.
export async function getPendingSubmissionsForBusiness(businessId: string): Promise<PendingSubmissionTask[]> {
  const tasks = await prisma.vehicleServiceTasks.findMany({
    where: {
      status: 'completed',
      payoutItem: null,
      job: {
        businessId,
        orderId: { not: null },
        business_orders: { status: 'COMPLETED', paymentStatus: 'PAID' },
      },
    },
    select: {
      id: true,
      agreedFeeAmount: true,
      contractorFeeOverride: true,
      completedAt: true,
      contractorId: true,
      contractor: { select: { persons: { select: { fullName: true } } } },
      subcategory: { select: { name: true } },
      job: {
        select: {
          id: true,
          vehicleMake: true,
          vehicleModel: true,
          business_orders: { select: { orderNumber: true, createdAt: true } },
        },
      },
    },
    orderBy: { completedAt: 'asc' },
  })

  return tasks.map(t => ({
    taskId: t.id,
    amount: Number(t.contractorFeeOverride ?? t.agreedFeeAmount),
    serviceName: t.subcategory.name,
    jobId: t.job.id,
    vehicle: [t.job.vehicleMake, t.job.vehicleModel].filter(Boolean).join(' ') || null,
    orderNumber: t.job.business_orders!.orderNumber,
    orderDate: t.job.business_orders!.createdAt,
    contractorId: t.contractorId,
    contractorName: t.contractor.persons.fullName,
    completedAt: t.completedAt!,
  }))
}
