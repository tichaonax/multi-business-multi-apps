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
