import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/receipts/[receiptId]/vehicle-link
 * MBM-302: resolves which Fleet Management record (if any) a receipt entry
 * auto-created, so the "Open in Fleet Management" link always lands on the
 * same row rather than needing a second create.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { receiptId } = await params

    const [expense, maintenance] = await Promise.all([
      prisma.vehicleExpenses.findFirst({
        where: { receiptId },
        select: { id: true, vehicleId: true, expenseType: true, fuelQuantity: true, fuelType: true, mileageAtExpense: true, driverId: true },
      }),
      prisma.vehicleMaintenanceRecords.findFirst({
        where: { receiptId },
        select: { id: true, vehicleId: true, serviceType: true, mileageAtService: true, driverId: true },
      }),
    ])

    // Reverse-maps VehicleMaintenanceRecords.serviceType back to the compact
    // receipt-form expense type — same mapping create-linked-vehicle-record.ts uses.
    const SERVICE_TYPE_REVERSE_MAP: Record<string, string> = { OIL_CHANGE: 'OIL', TIRE_REPLACEMENT: 'TIRE', REPAIR: 'MAINTENANCE' }

    if (expense) {
      return NextResponse.json({
        success: true,
        data: {
          recordType: 'expense',
          recordId: expense.id,
          vehicleId: expense.vehicleId,
          vehicleExpenseType: expense.expenseType,
          fuelQuantity: expense.fuelQuantity ? Number(expense.fuelQuantity) : null,
          fuelType: expense.fuelType,
          mileageAtExpense: expense.mileageAtExpense,
          driverId: expense.driverId,
        },
      })
    }
    if (maintenance) {
      return NextResponse.json({
        success: true,
        data: {
          recordType: 'maintenance',
          recordId: maintenance.id,
          vehicleId: maintenance.vehicleId,
          vehicleExpenseType: SERVICE_TYPE_REVERSE_MAP[maintenance.serviceType] ?? 'MAINTENANCE',
          fuelQuantity: null,
          fuelType: null,
          mileageAtExpense: maintenance.mileageAtService,
          driverId: maintenance.driverId,
        },
      })
    }
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error('Error resolving receipt vehicle link:', error)
    return NextResponse.json({ error: 'Failed to resolve vehicle link' }, { status: 500 })
  }
}
