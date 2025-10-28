import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for hold
const HoldLaybySchema = z.object({
  reason: z.string().min(1, 'Reason for hold is required'),
  notes: z.string().optional()
})

// POST - Put layby on hold
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: laybyId } = await context.params
    const body = await request.json()
    const validatedData = HoldLaybySchema.parse(body)

    // Fetch layby
    const layby = await prisma.customerLayby.findUnique({
      where: { id: laybyId },
      select: { id: true, status: true, notes: true }
    })

    if (!layby) {
      return NextResponse.json(
        { error: 'Layby not found' },
        { status: 404 }
      )
    }

    // Validate layby status
    if (layby.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot put completed layby on hold' },
        { status: 400 }
      )
    }

    if (layby.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot put cancelled layby on hold' },
        { status: 400 }
      )
    }

    if (layby.status === 'ON_HOLD') {
      return NextResponse.json(
        { error: 'Layby is already on hold' },
        { status: 400 }
      )
    }

    if (layby.status === 'DEFAULTED') {
      return NextResponse.json(
        { error: 'Cannot put defaulted layby on hold. Please cancel or reactivate first.' },
        { status: 400 }
      )
    }

    // Update layby status to ON_HOLD
    const holdNotes = `HOLD: ${validatedData.reason}${validatedData.notes ? ' - ' + validatedData.notes : ''} (${new Date().toISOString()})`
    const updatedNotes = layby.notes ? `${layby.notes}\n${holdNotes}` : holdNotes

    const updatedLayby = await prisma.customerLayby.update({
      where: { id: laybyId },
      data: {
        status: 'ON_HOLD',
        notes: updatedNotes
      },
      include: {
        business: {
          select: { name: true, type: true }
        },
        customer: {
          select: { id: true, name: true, customerNumber: true }
        },
        creator: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      data: updatedLayby,
      message: 'Layby put on hold successfully',
      reason: validatedData.reason
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error putting layby on hold:', error)
    return NextResponse.json(
      { error: 'Failed to put layby on hold' },
      { status: 500 }
    )
  }
}
