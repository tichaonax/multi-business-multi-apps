import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET - single renewal receipt with all linked licenses
export async function GET(
  request: NextRequest,
  { params }: { params: { receiptId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { receiptId } = params

    const receipt = await prisma.vehicleRenewalReceipts.findUnique({
      where: { id: receiptId },
      include: {
        vehicle_licenses: true,
        vehicles: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
            year: true,
          },
        },
      },
    })

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: receipt })
  } catch (error) {
    console.error('Error fetching renewal receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - remove a renewal receipt (licenses' renewalReceiptId set to null via ON DELETE SET NULL)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { receiptId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { receiptId } = params

    await prisma.vehicleRenewalReceipts.delete({ where: { id: receiptId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting renewal receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
