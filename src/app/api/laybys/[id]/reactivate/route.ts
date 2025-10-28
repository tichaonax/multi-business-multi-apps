import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for reactivation
const ReactivateLaybySchema = z.object({
  notes: z.string().optional(),
  updateDueDate: z.boolean().default(false),
  newPaymentDueDate: z.string().optional(), // ISO date string
  newCompletionDueDate: z.string().optional() // ISO date string
})

// POST - Reactivate layby from hold
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: laybyId } = await context.params
    const body = await request.json()
    const validatedData = ReactivateLaybySchema.parse(body)

    // Fetch layby
    const layby = await prisma.customerLayby.findUnique({
      where: { id: laybyId },
      select: { id: true, status: true, notes: true, balanceRemaining: true }
    })

    if (!layby) {
      return NextResponse.json(
        { error: 'Layby not found' },
        { status: 404 }
      )
    }

    // Validate layby status - can only reactivate from ON_HOLD or DEFAULTED
    if (layby.status !== 'ON_HOLD' && layby.status !== 'DEFAULTED') {
      return NextResponse.json(
        {
          error: `Cannot reactivate layby with status ${layby.status}. Only ON_HOLD or DEFAULTED laybys can be reactivated.`,
          currentStatus: layby.status
        },
        { status: 400 }
      )
    }

    if (layby.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot reactivate completed layby' },
        { status: 400 }
      )
    }

    if (layby.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot reactivate cancelled layby' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      status: 'ACTIVE'
    }

    // Add reactivation note
    const reactivationNote = `REACTIVATED from ${layby.status}: ${validatedData.notes || 'No notes provided'} (${new Date().toISOString()})`
    updateData.notes = layby.notes ? `${layby.notes}\n${reactivationNote}` : reactivationNote

    // Optionally update due dates
    if (validatedData.updateDueDate) {
      if (validatedData.newPaymentDueDate) {
        updateData.paymentDueDate = new Date(validatedData.newPaymentDueDate)
      }
      if (validatedData.newCompletionDueDate) {
        updateData.completionDueDate = new Date(validatedData.newCompletionDueDate)
      }
    }

    // Update layby status to ACTIVE
    const updatedLayby = await prisma.customerLayby.update({
      where: { id: laybyId },
      data: updateData,
      include: {
        business: {
          select: { name: true, type: true }
        },
        customer: {
          select: { id: true, name: true, customerNumber: true }
        },
        creator: {
          select: { id: true, name: true }
        },
        payments: {
          include: {
            processor: {
              select: { id: true, name: true }
            }
          },
          orderBy: { paymentDate: 'desc' }
        }
      }
    })

    return NextResponse.json({
      data: updatedLayby,
      message: `Layby reactivated successfully from ${layby.status} status`,
      previousStatus: layby.status,
      datesUpdated: validatedData.updateDueDate,
      balanceRemaining: layby.balanceRemaining.toNumber()
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error reactivating layby:', error)
    return NextResponse.json(
      { error: 'Failed to reactivate layby' },
      { status: 500 }
    )
  }
}
