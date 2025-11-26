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
  employeeNationalId: string
  amount: number
  paymentDate: Date
  issuedAt: Date
  paymentType: string
  paymentSchedule?: string
  deductions?: any
  commissionAmount?: number
  notes?: string
  regenerationCount: number
  lastRegeneratedAt?: Date

  // Company details
  companyName?: string
  companyAddress?: string

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
  // Get payment details with employee information
  const payment = await prisma.payrollPayments.findUnique({
    where: { id: paymentId },
    include: {
      employees: {
        select: {
          employeeNumber: true,
          firstName: true,
          lastName: true,
          fullName: true,
          nationalId: true,
        },
      },
    },
  })

  if (!payment) {
    throw new Error('Payment not found')
  }

  // Check if voucher already exists
  const existingVoucher = await prisma.payrollPaymentVouchers.findFirst({
    where: { paymentId },
  })

  if (existingVoucher) {
    // Return existing voucher data
    return {
      voucherNumber: existingVoucher.voucherNumber,
      employeeNumber: existingVoucher.employeeNumber,
      employeeName: existingVoucher.employeeName,
      employeeNationalId: existingVoucher.employeeNationalId,
      amount: Number(existingVoucher.amount),
      paymentDate: existingVoucher.paymentDate,
      issuedAt: existingVoucher.issuedAt,
      paymentType: payment.paymentType,
      paymentSchedule: payment.paymentSchedule || undefined,
      deductions: payment.deductions || undefined,
      commissionAmount: payment.commissionAmount ? Number(payment.commissionAmount) : undefined,
      notes: existingVoucher.notes || undefined,
      regenerationCount: existingVoucher.regenerationCount,
      lastRegeneratedAt: existingVoucher.lastRegeneratedAt || undefined,
      signatureData: existingVoucher.signatureData || undefined,
      signedAt: existingVoucher.signedAt || undefined,
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
    amount: Number(voucher.amount),
    paymentDate: voucher.paymentDate,
    issuedAt: voucher.issuedAt,
    paymentType: payment.paymentType,
    paymentSchedule: payment.paymentSchedule || undefined,
    deductions: payment.deductions || undefined,
    commissionAmount: payment.commissionAmount ? Number(payment.commissionAmount) : undefined,
    regenerationCount: 0,
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

  return {
    voucherNumber: updatedVoucher.voucherNumber,
    employeeNumber: updatedVoucher.employeeNumber,
    employeeName: updatedVoucher.employeeName,
    employeeNationalId: updatedVoucher.employeeNationalId,
    amount: Number(updatedVoucher.amount),
    paymentDate: updatedVoucher.paymentDate,
    issuedAt: updatedVoucher.issuedAt,
    paymentType: payment.paymentType,
    paymentSchedule: payment.paymentSchedule || undefined,
    deductions: payment.deductions || undefined,
    commissionAmount: payment.commissionAmount ? Number(payment.commissionAmount) : undefined,
    notes: updatedVoucher.notes || undefined,
    regenerationCount: updatedVoucher.regenerationCount,
    lastRegeneratedAt: updatedVoucher.lastRegeneratedAt || undefined,
    signatureData: updatedVoucher.signatureData || undefined,
    signedAt: updatedVoucher.signedAt || undefined,
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

  return {
    voucherNumber: voucher.voucherNumber,
    employeeNumber: voucher.employeeNumber,
    employeeName: voucher.employeeName,
    employeeNationalId: voucher.employeeNationalId,
    amount: Number(voucher.amount),
    paymentDate: voucher.paymentDate,
    issuedAt: voucher.issuedAt,
    paymentType: payment.paymentType,
    paymentSchedule: payment.paymentSchedule || undefined,
    deductions: payment.deductions || undefined,
    commissionAmount: payment.commissionAmount ? Number(payment.commissionAmount) : undefined,
    notes: voucher.notes || undefined,
    regenerationCount: voucher.regenerationCount,
    lastRegeneratedAt: voucher.lastRegeneratedAt || undefined,
    signatureData: voucher.signatureData || undefined,
    signedAt: voucher.signedAt || undefined,
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

  return {
    voucherNumber: voucher.voucherNumber,
    employeeNumber: voucher.employeeNumber,
    employeeName: voucher.employeeName,
    employeeNationalId: voucher.employeeNationalId,
    amount: Number(voucher.amount),
    paymentDate: voucher.paymentDate,
    issuedAt: voucher.issuedAt,
    paymentType: payment.paymentType,
    paymentSchedule: payment.paymentSchedule || undefined,
    deductions: payment.deductions || undefined,
    commissionAmount: payment.commissionAmount ? Number(payment.commissionAmount) : undefined,
    notes: voucher.notes || undefined,
    regenerationCount: voucher.regenerationCount,
    lastRegeneratedAt: voucher.lastRegeneratedAt || undefined,
    signatureData: voucher.signatureData || undefined,
    signedAt: voucher.signedAt || undefined,
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
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Voucher - ${data.employeeNumber} - ${data.employeeName} - ${data.voucherNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }

    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .voucher-container {
      border: 2px solid #333;
      padding: 30px;
      background: white;
    }

    .voucher-header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }

    .voucher-header h1 {
      margin: 0;
      font-size: 28px;
      color: #2563eb;
    }

    .voucher-number {
      font-size: 18px;
      font-weight: bold;
      margin-top: 10px;
      color: #666;
    }

    .voucher-body {
      margin: 30px 0;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 15px 0;
      padding: 10px;
      background: #f9fafb;
      border-left: 4px solid #2563eb;
    }

    .info-label {
      font-weight: bold;
      color: #666;
      min-width: 180px;
    }

    .info-value {
      flex: 1;
      text-align: right;
      color: #333;
    }

    .amount-section {
      margin: 30px 0;
      padding: 20px;
      background: #eff6ff;
      border: 2px solid #2563eb;
      text-align: center;
    }

    .amount-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }

    .amount-value {
      font-size: 32px;
      font-weight: bold;
      color: #2563eb;
    }

    .signature-section {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }

    .signature-line {
      margin: 40px 0 10px 0;
      border-bottom: 2px solid #333;
      width: 300px;
    }

    .signature-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }

    .voucher-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #999;
      text-align: center;
    }

    .regeneration-notice {
      margin-top: 20px;
      padding: 10px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      font-size: 12px;
      color: #92400e;
    }

    .print-button {
      margin: 20px 0;
      padding: 12px 24px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
    }

    .print-button:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-button" onclick="window.print()">🖨️ Print Voucher</button>
  </div>

  <div class="voucher-container">
    <div class="voucher-header">
      <h1>💰 PAYROLL PAYMENT VOUCHER</h1>
      <div class="voucher-number">Voucher #: ${data.voucherNumber}</div>
    </div>

    <div class="voucher-body">
      <div class="info-row">
        <span class="info-label">Employee Name:</span>
        <span class="info-value">${data.employeeName}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Employee Number:</span>
        <span class="info-value">${data.employeeNumber}</span>
      </div>

      <div class="info-row">
        <span class="info-label">National ID:</span>
        <span class="info-value">${data.employeeNationalId}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Payment Date:</span>
        <span class="info-value">${formatVoucherDate(data.paymentDate)}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Payment Type:</span>
        <span class="info-value">${data.paymentType.replace(/_/g, ' ')}</span>
      </div>

      ${data.paymentSchedule ? `
      <div class="info-row">
        <span class="info-label">Payment Schedule:</span>
        <span class="info-value">${data.paymentSchedule}</span>
      </div>
      ` : ''}

      ${data.commissionAmount ? `
      <div class="info-row">
        <span class="info-label">Commission Amount:</span>
        <span class="info-value">${formatVoucherAmount(data.commissionAmount)}</span>
      </div>
      ` : ''}

      <div class="amount-section">
        <div class="amount-label">TOTAL PAYMENT AMOUNT</div>
        <div class="amount-value">${formatVoucherAmount(data.amount)}</div>
      </div>

      ${data.notes ? `
      <div class="info-row">
        <span class="info-label">Notes:</span>
        <span class="info-value">${data.notes}</span>
      </div>
      ` : ''}
    </div>

    <div class="signature-section">
      <p><strong>Employee Acknowledgment:</strong></p>
      <p>I hereby acknowledge receipt of the above payment amount.</p>

      <div class="signature-line"></div>
      <div class="signature-label">Employee Signature</div>

      <div style="margin-top: 30px;">
        <div class="signature-line"></div>
        <div class="signature-label">Date</div>
      </div>
    </div>

    ${data.regenerationCount > 0 ? `
    <div class="regeneration-notice">
      ⚠️ This voucher has been regenerated ${data.regenerationCount} time(s).
      Last regenerated: ${data.lastRegeneratedAt ? formatVoucherDate(data.lastRegeneratedAt) : 'N/A'}
    </div>
    ` : ''}

    <div class="voucher-footer">
      <p>Issued: ${formatVoucherDate(data.issuedAt)}</p>
      <p>This is an official payroll payment voucher. Please retain for your records.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
