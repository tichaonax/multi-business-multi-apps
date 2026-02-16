import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCombinedVouchersPDF } from '@/lib/payroll-voucher-pdf-generator'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/payroll/account/payments/vouchers/combined
 * Generate a combined PDF with multiple payment vouchers
 *
 * Body:
 * - paymentIds: string[] (required)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add permission check for viewing vouchers

    const body = await request.json()
    const { paymentIds } = body

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json(
        { error: 'Payment IDs array is required' },
        { status: 400 }
      )
    }

    // Fetch all vouchers for the given payment IDs
    const vouchers = await prisma.payrollPaymentVouchers.findMany({
      where: {
        paymentId: { in: paymentIds },
      },
      include: {
        payroll_payments: {
          include: {
            employees: {
              select: {
                employeeNumber: true,
                fullName: true,
                firstName: true,
                lastName: true,
                nationalId: true,
              },
            },
          },
        },
      },
      orderBy: {
        employeeNumber: 'asc',
      },
    })

    if (vouchers.length === 0) {
      return NextResponse.json(
        { error: 'No vouchers found for the given payment IDs' },
        { status: 404 }
      )
    }

    // Generate combined PDF
    const pdfBuffer = await generateCombinedVouchersPDF(vouchers)

    // Convert buffer to base64 for transmission
    const base64Pdf = pdfBuffer.toString('base64')
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`

    return NextResponse.json({
      success: true,
      message: `Generated combined PDF with ${vouchers.length} voucher(s)`,
      count: vouchers.length,
      pdfUrl: dataUrl,
      vouchers: vouchers.map((v) => ({
        voucherNumber: v.voucherNumber,
        employeeName: v.employeeName,
        amount: Number(v.amount),
      })),
    })
  } catch (error) {
    console.error('Error generating combined vouchers:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate combined vouchers',
      },
      { status: 500 }
    )
  }
}
