import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerUser } from '@/lib/get-server-user'

const CreateExemptionSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  exemptionType: z.string().min(1, 'Exemption type is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  exemptionReason: z.string().optional(),
  exemptionReasonDescription: z.string().optional(),
  requestedByName: z.string().optional(),
  requestedByEmail: z.string().email().optional().or(z.literal('')),
  requestedByContact: z.string().optional(),
  dataCapturingOfficialName: z.string().optional(),
  loginUserId: z.string().optional(),
  issueOffice: z.string().optional(),
  issueDate: z.string().optional(),
  documentUrl: z.string().optional(),
  documentName: z.string().optional(),
  notes: z.string().optional(),
})

// GET - list exemptions for a vehicle
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')

    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId is required' }, { status: 400 })
    }

    const exemptions = await prisma.vehicleExemptions.findMany({
      where: { vehicleId },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json({ success: true, data: exemptions })
  } catch (error) {
    console.error('Error fetching exemptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - record a new exemption certificate
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateExemptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    const exemption = await prisma.vehicleExemptions.create({
      data: {
        vehicleId: data.vehicleId,
        exemptionType: data.exemptionType,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        exemptionReason: data.exemptionReason,
        exemptionReasonDescription: data.exemptionReasonDescription,
        requestedByName: data.requestedByName,
        requestedByEmail: data.requestedByEmail || null,
        requestedByContact: data.requestedByContact,
        dataCapturingOfficialName: data.dataCapturingOfficialName,
        loginUserId: data.loginUserId,
        issueOffice: data.issueOffice,
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        documentUrl: data.documentUrl,
        documentName: data.documentName,
        notes: data.notes,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: exemption }, { status: 201 })
  } catch (error) {
    console.error('Error creating exemption:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
