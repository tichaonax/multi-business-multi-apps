import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// DELETE - remove an exemption record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { exemptionId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { exemptionId } = params

    await prisma.vehicleExemptions.delete({ where: { id: exemptionId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting exemption:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
