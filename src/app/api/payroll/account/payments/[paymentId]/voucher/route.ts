import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createPaymentVoucher,
  regenerateVoucher,
  getVoucherByPaymentId,
  generateVoucherHTML,
} from '@/lib/payroll-voucher-generator'

/**
 * GET /api/payroll/account/payments/[paymentId]/voucher
 * Get payment voucher (returns HTML or JSON)
 *
 * Query params:
 * - format: 'html' | 'json' (default: 'json')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await params

    // TODO: Add permission check for canIssuePaymentVouchers or canViewPayrollHistory

    // Get payment to verify it exists
    const payment = await prisma.payrollPayments.findUnique({
      where: { id: paymentId },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Get existing voucher or create it if it doesn't exist
    let voucher = await getVoucherByPaymentId(paymentId)

    if (!voucher) {
      // Auto-create voucher if it doesn't exist
      try {
        voucher = await createPaymentVoucher(paymentId)
      } catch (error) {
        console.error('Error auto-creating voucher:', error)
        return NextResponse.json(
          {
            error: 'Voucher not found and failed to create',
            message: error instanceof Error ? error.message : 'Failed to create voucher',
          },
          { status: 500 }
        )
      }
    }

    // Check format
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    if (format === 'html') {
      const html = generateVoucherHTML(voucher)
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }

    // Return JSON by default
    return NextResponse.json({
      success: true,
      data: voucher,
    })
  } catch (error) {
    console.error('Error fetching voucher:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch voucher',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payroll/account/payments/[paymentId]/voucher
 * Generate or regenerate payment voucher
 *
 * Body:
 * - action: 'generate' | 'regenerate' (required)
 * - format: 'html' | 'json' (optional, default: 'json')
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await params

    // TODO: Add permission check for canIssuePaymentVouchers

    // Get payment to verify it exists
    const payment = await prisma.payrollPayments.findUnique({
      where: { id: paymentId },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { action, format } = body

    if (!action || !['generate', 'regenerate', 'view'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "generate", "regenerate", or "view"' },
        { status: 400 }
      )
    }

    let voucher

    if (action === 'view') {
      // Get existing voucher or create if doesn't exist
      voucher = await getVoucherByPaymentId(paymentId)
      if (!voucher) {
        voucher = await createPaymentVoucher(paymentId)
      }
    } else if (action === 'generate') {
      // Check if voucher already exists
      const existingVoucher = await getVoucherByPaymentId(paymentId)
      if (existingVoucher) {
        return NextResponse.json(
          {
            error: 'Voucher already exists',
            message: 'Use action "regenerate" to regenerate the voucher',
            data: existingVoucher,
          },
          { status: 400 }
        )
      }

      // Generate new voucher
      voucher = await createPaymentVoucher(paymentId)
    } else {
      // Regenerate existing voucher
      voucher = await regenerateVoucher(paymentId)
    }

    // Return HTML or JSON based on format
    if (format === 'html') {
      const html = generateVoucherHTML(voucher)
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }

    // Return JSON by default
    const message =
      action === 'generate'
        ? 'Voucher generated successfully'
        : action === 'regenerate'
        ? 'Voucher regenerated successfully'
        : 'Voucher retrieved successfully'

    return NextResponse.json(
      {
        success: true,
        message,
        data: voucher,
      },
      { status: action === 'generate' ? 201 : 200 }
    )
  } catch (error) {
    console.error('Error generating/regenerating voucher:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate/regenerate voucher',
      },
      { status: 500 }
    )
  }
}
