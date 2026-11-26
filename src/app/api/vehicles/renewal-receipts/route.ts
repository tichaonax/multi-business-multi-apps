import { NextRequest, NextResponse } from 'next/server'
import { renewVehicleLicense } from '@/lib/vehicles/renew-vehicle-license'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerUser } from '@/lib/get-server-user'

const LicenseEntrySchema = z.object({
  licenseType: z.enum(['REGISTRATION', 'RADIO', 'ROAD_USE', 'INSURANCE', 'INSPECTION']),
  licenseNumber: z.string().min(1),
  issuingAuthority: z.string().optional(),
  issueDate: z.string().min(1),
  expiryDate: z.string().min(1),
  renewalCost: z.number().optional(),
  usage: z.string().optional(),
  lateFee: z.number().min(0).optional(),
  isExempt: z.boolean().optional().default(false),
  reminderDays: z.number().int().min(1).max(365).optional().default(30),
  documentUrl: z.string().optional(),
})

const CreateRenewalReceiptSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  receiptNumber: z.string().optional(),
  transactionType: z.string().optional(),
  datePaid: z.string().optional(),
  paymentReceivedBy: z.string().optional(),
  officeOfIssue: z.string().optional(),
  arrears: z.number().min(0).optional(),
  penalties: z.number().min(0).optional(),
  administrationFee: z.number().min(0).optional(),
  transactionFee: z.number().min(0).optional(),
  surcharge: z.number().min(0).optional(),
  debtManagementAmount: z.number().min(0).optional(),
  deposit: z.number().min(0).optional(),
  totalPaid: z.number().min(0).optional(),
  currency: z.string().optional().default('ZiG'),
  isExempt: z.boolean().optional().default(false),
  documentUrl: z.string().optional(),
  documentName: z.string().optional(),
  notes: z.string().optional(),
  // Linked licences created atomically with the receipt
  licenses: z.array(LicenseEntrySchema).optional().default([]),
})

// GET - list renewal receipts for a vehicle
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId is required' }, { status: 400 })
    }

    const [receipts, totalCount] = await Promise.all([
      prisma.vehicleRenewalReceipts.findMany({
        where: { vehicleId },
        include: {
          vehicle_licenses: {
            select: {
              id: true,
              licenseType: true,
              licenseNumber: true,
              expiryDate: true,
              isExempt: true,
              usage: true,
            },
          },
        },
        orderBy: { datePaid: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vehicleRenewalReceipts.count({ where: { vehicleId } }),
    ])

    return NextResponse.json({
      success: true,
      data: receipts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching renewal receipts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - create a renewal receipt with linked licenses in one transaction
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateRenewalReceiptSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { licenses, ...receiptData } = parsed.data

    const receipt = await prisma.$transaction(async (tx) => {
      const newReceipt = await tx.vehicleRenewalReceipts.create({
        data: {
          vehicleId: receiptData.vehicleId,
          receiptNumber: receiptData.receiptNumber,
          transactionType: receiptData.transactionType,
          datePaid: receiptData.datePaid ? new Date(receiptData.datePaid) : null,
          paymentReceivedBy: receiptData.paymentReceivedBy,
          officeOfIssue: receiptData.officeOfIssue,
          arrears: receiptData.arrears,
          penalties: receiptData.penalties,
          administrationFee: receiptData.administrationFee,
          transactionFee: receiptData.transactionFee,
          surcharge: receiptData.surcharge,
          debtManagementAmount: receiptData.debtManagementAmount,
          deposit: receiptData.deposit,
          totalPaid: receiptData.totalPaid,
          currency: receiptData.currency ?? 'ZiG',
          isExempt: receiptData.isExempt ?? false,
          documentUrl: receiptData.documentUrl,
          documentName: receiptData.documentName,
          notes: receiptData.notes,
          updatedAt: new Date(),
        },
      })

      // MBM-344: each licence renews the current one (retired, and linked by
      // supersedesLicenseId) — before, createMany left the old one active
      // until the nightly sweep, so its alert stayed up and posted alerts
      // never showed it resolved. The same step as a Licensing cost uses.
      for (const lic of licenses || []) {
        await renewVehicleLicense(tx, {
          vehicleId: receiptData.vehicleId,
          licenseType: lic.licenseType,
          expiryDate: new Date(lic.expiryDate),
          issueDate: new Date(lic.issueDate),
          licenseNumber: lic.licenseNumber,
          renewalCost: lic.renewalCost ?? null,
          renewalReceiptId: newReceipt.id,
          extra: {
            ...(lic.issuingAuthority ? { issuingAuthority: lic.issuingAuthority } : {}),
            usage: lic.usage ?? null,
            lateFee: lic.lateFee ?? null,
            isExempt: lic.isExempt ?? false,
            reminderDays: lic.reminderDays ?? 30,
            documentUrl: lic.documentUrl ?? null,
          },
        })
      }

      return tx.vehicleRenewalReceipts.findUnique({
        where: { id: newReceipt.id },
        include: {
          vehicle_licenses: true,
        },
      })
    })

    return NextResponse.json({ success: true, data: receipt }, { status: 201 })
  } catch (error) {
    console.error('Error creating renewal receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
