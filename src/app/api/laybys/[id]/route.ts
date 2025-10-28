import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for updating layby
const UpdateLaybySchema = z.object({
  notes: z.string().optional(),
  paymentDueDate: z.string().optional(), // ISO date string
  completionDueDate: z.string().optional(), // ISO date string
  installmentAmount: z.number().min(0).optional(),
  installmentFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM']).optional()
})

// GET - Fetch single layby by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const layby = await prisma.customerLayby.findUnique({
      where: { id },
      include: {
        business: {
          select: { id: true, name: true, type: true }
        },
        customer: {
          select: {
            id: true,
            name: true,
            customerNumber: true,
            phone: true,
            email: true,
            address: true
          }
        },
        creator: {
          select: { id: true, name: true, email: true }
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

    if (!layby) {
      return NextResponse.json(
        { error: 'Layby not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: layby })
  } catch (error) {
    console.error('Error fetching layby:', error)
    return NextResponse.json(
      { error: 'Failed to fetch layby' },
      { status: 500 }
    )
  }
}

// PUT - Update layby
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const validatedData = UpdateLaybySchema.parse(body)

    // Check if layby exists
    const existingLayby = await prisma.customerLayby.findUnique({
      where: { id },
      select: { status: true }
    })

    if (!existingLayby) {
      return NextResponse.json(
        { error: 'Layby not found' },
        { status: 404 }
      )
    }

    // Prevent updates to completed or cancelled laybys
    if (existingLayby.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot update completed layby' },
        { status: 400 }
      )
    }

    if (existingLayby.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot update cancelled layby' },
        { status: 400 }
      )
    }

    // Update layby
    const updateData: any = {}

    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes
    if (validatedData.installmentAmount !== undefined) updateData.installmentAmount = validatedData.installmentAmount
    if (validatedData.installmentFrequency !== undefined) updateData.installmentFrequency = validatedData.installmentFrequency
    if (validatedData.paymentDueDate !== undefined) {
      updateData.paymentDueDate = validatedData.paymentDueDate ? new Date(validatedData.paymentDueDate) : null
    }
    if (validatedData.completionDueDate !== undefined) {
      updateData.completionDueDate = validatedData.completionDueDate ? new Date(validatedData.completionDueDate) : null
    }

    const updatedLayby = await prisma.customerLayby.update({
      where: { id },
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
      message: 'Layby updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating layby:', error)
    return NextResponse.json(
      { error: 'Failed to update layby' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel layby (soft delete by changing status)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const reason = searchParams.get('reason') || 'No reason provided'

    // Check if layby exists
    const existingLayby = await prisma.customerLayby.findUnique({
      where: { id },
      select: { status: true, totalPaid: true, totalAmount: true }
    })

    if (!existingLayby) {
      return NextResponse.json(
        { error: 'Layby not found' },
        { status: 404 }
      )
    }

    // Prevent cancellation of already completed laybys
    if (existingLayby.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot cancel completed layby' },
        { status: 400 }
      )
    }

    // Prevent duplicate cancellation
    if (existingLayby.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Layby is already cancelled' },
        { status: 400 }
      )
    }

    // Calculate refund amount (simple refund - can be customized based on business rules)
    const refundAmount = existingLayby.totalPaid

    // Update layby status to CANCELLED
    const cancelledLayby = await prisma.customerLayby.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancellationRefund: refundAmount
      },
      include: {
        business: {
          select: { name: true, type: true }
        },
        customer: {
          select: { id: true, name: true, customerNumber: true }
        }
      }
    })

    return NextResponse.json({
      data: cancelledLayby,
      message: 'Layby cancelled successfully',
      refundAmount
    })
  } catch (error) {
    console.error('Error cancelling layby:', error)
    return NextResponse.json(
      { error: 'Failed to cancel layby' },
      { status: 500 }
    )
  }
}
