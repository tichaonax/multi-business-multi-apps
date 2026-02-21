import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Generate sequential voucher number
 * Format: PV-YYYYMMDD-NNNN
 * Example: PV-20251124-0001
 */
export async function generateVoucherNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')

  // Get count of vouchers created today
  const startOfDay = new Date(today.setHours(0, 0, 0, 0))
  const endOfDay = new Date(today.setHours(23, 59, 59, 999))

  const todayCount = await prisma.payrollPaymentVouchers.count({
    where: {
      issuedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  // Sequential number padded to 4 digits
  const seqNumber = String(todayCount + 1).padStart(4, '0')

  return `PV-${dateStr}-${seqNumber}`
}

/**
 * Voucher data structure
 */
export interface VoucherData {
  voucherNumber: string
  employeeNumber: string
  employeeName: string
  employeeNationalId: string | null
  employeePhone?: string | null
  /** Gross pay — used for payroll account debit */
  amount: number
  /** Net pay — what the employee actually receives after deductions */
  netAmount?: number | null
  paymentDate: Date
  issuedAt: Date
  paymentType: string
  notes?: string
  regenerationCount: number
  lastRegeneratedAt?: Date

  // Business details
  businessName?: string | null
  businessAddress?: string | null
  businessPhone?: string | null

  // Sign section
  signatureData?: string
  signedAt?: Date
}

/**
 * Create payment voucher record
 */
export async function createPaymentVoucher(
  paymentId: string
): Promise<VoucherData> {
  // Get payment details with employee and business information
  const payment = await prisma.payrollAccountPayments.findUnique({
    where: { id: paymentId },
    include: {
      employees: {
        select: {
          employeeNumber: true,
          firstName: true,
          lastName: true,
          fullName: true,
          nationalId: true,
          phone: true,
          businesses: {
            select: {
              name: true,
              address: true,
              phone: true,
              umbrellaBusinessName: true,
              umbrellaBusinessAddress: true,
              umbrellaBusinessPhone: true,
            },
          },
        },
      },
    },
  })

  if (!payment) {
    throw new Error('Payment not found')
  }

  // Build business details with fallback chain (same as loan contract)
  const biz = payment.employees.businesses
  const businessName = biz?.name || null
  const businessAddress = biz?.address || biz?.umbrellaBusinessAddress || null
  const businessPhone = biz?.phone || biz?.umbrellaBusinessPhone || null

  // Check if voucher already exists
  const existingVoucher = await prisma.payrollPaymentVouchers.findFirst({
    where: { paymentId },
  })

  if (existingVoucher) {
    // Return existing voucher data enriched with live business/employee details
    return {
      voucherNumber: existingVoucher.voucherNumber,
      employeeNumber: existingVoucher.employeeNumber,
      employeeName: existingVoucher.employeeName,
      employeeNationalId: existingVoucher.employeeNationalId,
      employeePhone: payment.employees.phone || null,
      amount: Number(existingVoucher.amount),
      netAmount: payment.netAmount != null ? Number(payment.netAmount) : null,
      paymentDate: existingVoucher.paymentDate,
      issuedAt: existingVoucher.issuedAt,
      paymentType: payment.paymentType,
      notes: existingVoucher.notes || undefined,
      regenerationCount: existingVoucher.regenerationCount,
      lastRegeneratedAt: existingVoucher.lastRegeneratedAt || undefined,
      signatureData: existingVoucher.signatureData || undefined,
      signedAt: existingVoucher.signedAt || undefined,
      businessName,
      businessAddress,
      businessPhone,
    }
  }

  // Generate new voucher number
  const voucherNumber = await generateVoucherNumber()

  // Create voucher record
  const voucher = await prisma.payrollPaymentVouchers.create({
    data: {
      paymentId,
      voucherNumber,
      employeeNumber: payment.employees.employeeNumber,
      employeeName: payment.employees.fullName || `${payment.employees.firstName} ${payment.employees.lastName}`,
      employeeNationalId: payment.employees.nationalId,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      issuedAt: new Date(),
      regenerationCount: 0,
    },
  })

  return {
    voucherNumber: voucher.voucherNumber,
    employeeNumber: voucher.employeeNumber,
    employeeName: voucher.employeeName,
    employeeNationalId: voucher.employeeNationalId,
    employeePhone: payment.employees.phone || null,
    amount: Number(voucher.amount),
    netAmount: payment.netAmount != null ? Number(payment.netAmount) : null,
    paymentDate: voucher.paymentDate,
    issuedAt: voucher.issuedAt,
    paymentType: payment.paymentType,
    regenerationCount: 0,
    businessName,
    businessAddress,
    businessPhone,
  }
}

/**
 * Regenerate existing voucher (for reprints)
 * Updates regeneration count and timestamp
 */
export async function regenerateVoucher(
  paymentId: string
): Promise<VoucherData> {
  const voucher = await prisma.payrollPaymentVouchers.findFirst({
    where: { paymentId },
    include: {
      payroll_payments: {
        include: {
          employees: {
            select: {
              employeeNumber: true,
              firstName: true,
              lastName: true,
              fullName: true,
              nationalId: true,
              phone: true,
              businesses: {
                select: {
                  name: true,
                  address: true,
                  phone: true,
                  umbrellaBusinessAddress: true,
                  umbrellaBusinessPhone: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!voucher) {
    throw new Error('Voucher not found for this payment')
  }

  // Update regeneration count
  const updatedVoucher = await prisma.payrollPaymentVouchers.update({
    where: { id: voucher.id },
    data: {
      regenerationCount: voucher.regenerationCount + 1,
      lastRegeneratedAt: new Date(),
    },
  })

  const payment = voucher.payroll_payments
  const biz = payment.employees.businesses
  return {
    voucherNumber: updatedVoucher.voucherNumber,
    employeeNumber: updatedVoucher.employeeNumber,
    employeeName: updatedVoucher.employeeName,
    employeeNationalId: updatedVoucher.employeeNationalId,
    employeePhone: payment.employees.phone || null,
    amount: Number(updatedVoucher.amount),
    netAmount: payment.netAmount != null ? Number(payment.netAmount) : null,
    paymentDate: updatedVoucher.paymentDate,
    issuedAt: updatedVoucher.issuedAt,
    paymentType: payment.paymentType,
    notes: updatedVoucher.notes || undefined,
    regenerationCount: updatedVoucher.regenerationCount,
    lastRegeneratedAt: updatedVoucher.lastRegeneratedAt || undefined,
    signatureData: updatedVoucher.signatureData || undefined,
    signedAt: updatedVoucher.signedAt || undefined,
    businessName: biz?.name || null,
    businessAddress: biz?.address || biz?.umbrellaBusinessAddress || null,
    businessPhone: biz?.phone || biz?.umbrellaBusinessPhone || null,
  }
}

/**
 * Get voucher by payment ID
 */
export async function getVoucherByPaymentId(
  paymentId: string
): Promise<VoucherData | null> {
  const voucher = await prisma.payrollPaymentVouchers.findFirst({
    where: { paymentId },
    include: {
      payroll_payments: {
        include: {
          employees: {
            select: {
              employeeNumber: true,
              firstName: true,
              lastName: true,
              fullName: true,
              nationalId: true,
              phone: true,
              businesses: {
                select: {
                  name: true,
                  address: true,
                  phone: true,
                  umbrellaBusinessAddress: true,
                  umbrellaBusinessPhone: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!voucher) {
    return null
  }

  const payment = voucher.payroll_payments
  const biz = payment.employees.businesses
  return {
    voucherNumber: voucher.voucherNumber,
    employeeNumber: voucher.employeeNumber,
    employeeName: voucher.employeeName,
    employeeNationalId: voucher.employeeNationalId,
    employeePhone: payment.employees.phone || null,
    amount: Number(voucher.amount),
    netAmount: payment.netAmount != null ? Number(payment.netAmount) : null,
    paymentDate: voucher.paymentDate,
    issuedAt: voucher.issuedAt,
    paymentType: payment.paymentType,
    notes: voucher.notes || undefined,
    regenerationCount: voucher.regenerationCount,
    lastRegeneratedAt: voucher.lastRegeneratedAt || undefined,
    signatureData: voucher.signatureData || undefined,
    signedAt: voucher.signedAt || undefined,
    businessName: biz?.name || null,
    businessAddress: biz?.address || biz?.umbrellaBusinessAddress || null,
    businessPhone: biz?.phone || biz?.umbrellaBusinessPhone || null,
  }
}

/**
 * Get voucher by voucher number
 */
export async function getVoucherByNumber(
  voucherNumber: string
): Promise<VoucherData | null> {
  const voucher = await prisma.payrollPaymentVouchers.findUnique({
    where: { voucherNumber },
    include: {
      payroll_payments: {
        include: {
          employees: {
            select: {
              employeeNumber: true,
              firstName: true,
              lastName: true,
              fullName: true,
              nationalId: true,
              phone: true,
              businesses: {
                select: {
                  name: true,
                  address: true,
                  phone: true,
                  umbrellaBusinessAddress: true,
                  umbrellaBusinessPhone: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!voucher) {
    return null
  }

  const payment = voucher.payroll_payments
  const biz = payment.employees.businesses
  return {
    voucherNumber: voucher.voucherNumber,
    employeeNumber: voucher.employeeNumber,
    employeeName: voucher.employeeName,
    employeeNationalId: voucher.employeeNationalId,
    employeePhone: payment.employees.phone || null,
    amount: Number(voucher.amount),
    netAmount: payment.netAmount != null ? Number(payment.netAmount) : null,
    paymentDate: voucher.paymentDate,
    issuedAt: voucher.issuedAt,
    paymentType: payment.paymentType,
    notes: voucher.notes || undefined,
    regenerationCount: voucher.regenerationCount,
    lastRegeneratedAt: voucher.lastRegeneratedAt || undefined,
    signatureData: voucher.signatureData || undefined,
    signedAt: voucher.signedAt || undefined,
    businessName: biz?.name || null,
    businessAddress: biz?.address || biz?.umbrellaBusinessAddress || null,
    businessPhone: biz?.phone || biz?.umbrellaBusinessPhone || null,
  }
}

/**
 * Update voucher signature
 */
export async function updateVoucherSignature(
  paymentId: string,
  signatureData: string
): Promise<void> {
  const voucher = await prisma.payrollPaymentVouchers.findFirst({
    where: { paymentId },
  })

  if (!voucher) {
    throw new Error('Voucher not found for this payment')
  }

  await prisma.payrollPaymentVouchers.update({
    where: { id: voucher.id },
    data: {
      signatureData,
      signedAt: new Date(),
    },
  })
}

/**
 * Format currency for display
 */
export function formatVoucherAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date for voucher display
 */
export function formatVoucherDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

/**
 * Generate printable HTML voucher
 */
export function generateVoucherHTML(data: VoucherData): string {
  const netPay = data.netAmount != null ? data.netAmount : data.amount
  const hasBreakdown = data.netAmount != null && data.netAmount !== data.amount

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Voucher - ${data.employeeNumber} - ${data.employeeName} - ${data.voucherNumber}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .voucher-container { border: 2px solid #333; padding: 30px; background: white; }

    /* Business header */
    .business-header { text-align: center; margin-bottom: 16px; }
    .business-name { font-size: 22px; font-weight: bold; color: #1e3a5f; margin: 0; }
    .business-meta { font-size: 13px; color: #555; margin-top: 4px; }

    /* Voucher title */
    .voucher-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; border-top: 1px solid #ccc; padding-top: 16px; }
    .voucher-header h1 { margin: 0; font-size: 22px; color: #2563eb; }
    .voucher-number { font-size: 15px; font-weight: bold; margin-top: 6px; color: #666; }

    /* Info rows */
    .voucher-body { margin: 20px 0; }
    .section-title { font-size: 12px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin: 18px 0 6px; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 12px; background: #f9fafb; border-left: 3px solid #2563eb; }
    .info-label { font-weight: bold; color: #555; min-width: 180px; font-size: 14px; }
    .info-value { flex: 1; text-align: right; color: #333; font-size: 14px; }

    /* Net pay box — prominent */
    .net-pay-box { margin: 24px 0 8px; padding: 20px; background: #eff6ff; border: 2px solid #2563eb; text-align: center; }
    .net-pay-label { font-size: 13px; color: #2563eb; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .net-pay-amount { font-size: 36px; font-weight: bold; color: #1d4ed8; }

    /* Gross reference row */
    .gross-ref { display: flex; justify-content: space-between; padding: 6px 12px; background: #f3f4f6; border-left: 3px solid #9ca3af; margin-bottom: 16px; font-size: 13px; color: #6b7280; }

    /* Signature */
    .signature-section { margin-top: 48px; padding-top: 24px; border-top: 2px solid #e5e7eb; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
    .sig-block .sig-line { border-bottom: 2px solid #333; margin-bottom: 6px; height: 40px; }
    .sig-label { font-size: 13px; color: #666; }

    /* Footer */
    .regeneration-notice { margin-top: 16px; padding: 8px 12px; background: #fef3c7; border-left: 4px solid #f59e0b; font-size: 12px; color: #92400e; }
    .voucher-footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #aaa; text-align: center; }
    .print-button { margin: 16px 0; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 15px; cursor: pointer; }
    .print-button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-button" onclick="window.print()">🖨️ Print Voucher</button>
  </div>

  <div class="voucher-container">

    ${data.businessName ? `
    <div class="business-header">
      <div class="business-name">${data.businessName}</div>
      <div class="business-meta">
        ${data.businessAddress ? `${data.businessAddress}` : ''}
        ${data.businessAddress && data.businessPhone ? ' &nbsp;|&nbsp; ' : ''}
        ${data.businessPhone ? `Tel: ${data.businessPhone}` : ''}
      </div>
    </div>
    ` : ''}

    <div class="voucher-header">
      <h1>PAYROLL PAYMENT VOUCHER</h1>
      <div class="voucher-number">Voucher #: ${data.voucherNumber}</div>
    </div>

    <div class="voucher-body">
      <div class="section-title">Employee Details</div>

      <div class="info-row">
        <span class="info-label">Employee Name</span>
        <span class="info-value">${data.employeeName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Employee Number</span>
        <span class="info-value">${data.employeeNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">National ID</span>
        <span class="info-value">${data.employeeNationalId || '—'}</span>
      </div>
      ${data.employeePhone ? `
      <div class="info-row">
        <span class="info-label">Phone</span>
        <span class="info-value">${data.employeePhone}</span>
      </div>
      ` : ''}

      <div class="section-title">Payment Details</div>

      <div class="info-row">
        <span class="info-label">Payment Date</span>
        <span class="info-value">${formatVoucherDate(data.paymentDate)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Type</span>
        <span class="info-value">${data.paymentType.replace(/_/g, ' ')}</span>
      </div>
      ${data.notes ? `
      <div class="info-row">
        <span class="info-label">Notes</span>
        <span class="info-value">${data.notes}</span>
      </div>
      ` : ''}

      <div class="net-pay-box">
        <div class="net-pay-label">Amount Payable to Employee</div>
        <div class="net-pay-amount">${formatVoucherAmount(netPay)}</div>
      </div>

      ${hasBreakdown ? `
      <div class="gross-ref">
        <span>Gross Pay (before deductions)</span>
        <span>${formatVoucherAmount(data.amount)}</span>
      </div>
      ` : ''}
    </div>

    <div class="signature-section">
      <p style="margin:0 0 4px;"><strong>Employee Acknowledgment</strong></p>
      <p style="margin:0;font-size:14px;color:#555;">I hereby acknowledge receipt of the above payment amount of <strong>${formatVoucherAmount(netPay)}</strong>.</p>

      <div class="sig-grid">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-label">Employee Signature</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-label">Date</div>
        </div>
      </div>
    </div>

    ${data.regenerationCount > 0 ? `
    <div class="regeneration-notice">
      ⚠️ Reprinted ${data.regenerationCount} time(s). Last: ${data.lastRegeneratedAt ? formatVoucherDate(data.lastRegeneratedAt) : 'N/A'}
    </div>
    ` : ''}

    <div class="voucher-footer">
      <p>Issued: ${formatVoucherDate(data.issuedAt)} &nbsp;|&nbsp; This is an official payroll payment voucher. Please retain for your records.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
