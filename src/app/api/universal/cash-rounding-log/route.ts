import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const LogSchema = z.object({
  businessId: z.string().min(1),
  orderId: z.string().optional(),
  direction: z.enum(['UP', 'DOWN']),
  originalAmount: z.number(),
  roundedAmount: z.number(),
  adjustment: z.number(),
  staffNote: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = LogSchema.parse(body)

    const log = await prisma.cashRoundingLogs.create({
      data: {
        businessId: data.businessId,
        orderId: data.orderId ?? null,
        direction: data.direction,
        originalAmount: data.originalAmount,
        roundedAmount: data.roundedAmount,
        adjustment: data.adjustment,
        staffNote: data.staffNote ?? null,
      },
    })

    return NextResponse.json({ success: true, id: log.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('Error logging cash rounding event:', error)
    return NextResponse.json({ error: 'Failed to log rounding event' }, { status: 500 })
  }
}
