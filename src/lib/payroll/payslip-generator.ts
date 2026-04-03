/**
 * Bulk payslip HTML generator.
 * Produces one A4-sized payslip page per employee, suitable for printing or PDF export.
 * Each page also contains a tear-off "received" section at the bottom for employee signature.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmt(n: number) {
  return `$${Number(n).toFixed(2)}`
}

/** Format Zimbabwe phone numbers as +263 XX XXX XXXX */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('263') && digits.length === 12) {
    const local = digits.slice(3)
    return `+263 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`
  }
  return phone
}

function row(label: string, value: string, bold = false, _red = false, _green = false) {
  const style = bold ? 'font-weight:700;' : ''
  return `
    <tr>
      <td style="padding:2px 6px 2px 0;font-size:11px;${style}">${label}</td>
      <td style="padding:2px 0 2px 6px;font-size:11px;text-align:right;${style}">${value}</td>
    </tr>`
}

function sectionHeader(title: string) {
  return `
    <tr>
      <td colspan="2" style="padding-top:8px;padding-bottom:2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#000;border-bottom:1px solid #000;">
        ${title}
      </td>
    </tr>`
}

export interface PayslipEntry {
  // Employee
  employeeName: string
  employeeNumber: string
  nationalId: string | null
  jobTitle?: string | null
  hireDate?: Date | string | null

  // Period
  periodMonth: number
  periodYear: number
  periodStart?: Date | string | null
  periodEnd?: Date | string | null

  // Business
  businessName: string
  businessShortName?: string | null
  businessAddress?: string | null
  umbrellaBusinessName?: string | null
  umbrellaBusinessAddress?: string | null
  umbrellaBusinessPhone?: string | null

  // Work
  workDays: number
  sickDays?: number
  leaveDays?: number
  absenceDays?: number

  // Earnings
  contractualBasicSalary: number
  proratedBasicSalary: number
  commission?: number
  standardOvertimePay?: number
  doubleOvertimePay?: number
  perDiem?: number
  cashInLieu?: number
  adjustmentsAdditions?: number
  benefits?: Array<{ name: string; amount: number }>
  grossPay: number

  // Deductions
  absenceDeduction?: number
  nssaEmployee?: number
  payeAmount?: number
  aidsLevy?: number
  advanceDeductions?: number
  loanDeductions?: number
  miscDeductions?: number
  totalDeductions?: number

  // Net
  netPay: number
}

export function generatePayslipHTML(entry: PayslipEntry, index: number, total: number): string {
  const monthName = MONTHS[(entry.periodMonth - 1)] || String(entry.periodMonth)
  const period = `${monthName} ${entry.periodYear}`

  const benefits = entry.benefits || []
  const hasBenefits = benefits.length > 0
  const hasOT = (entry.standardOvertimePay || 0) > 0 || (entry.doubleOvertimePay || 0) > 0
  const hasPerDiem = (entry.perDiem || 0) > 0
  const hasCashInLieu = (entry.cashInLieu || 0) > 0
  const hasCommission = (entry.commission || 0) > 0
  const hasAdjustments = (entry.adjustmentsAdditions || 0) > 0
  const hasAbsence = (entry.absenceDeduction || 0) > 0
  const hasAdvance = (entry.advanceDeductions || 0) > 0
  const hasLoans = (entry.loanDeductions || 0) > 0
  const hasMisc = (entry.miscDeductions || 0) > 0

  // Umbrella is the primary entity — shown at top with all contact details
  const hasUmbrella = !!entry.umbrellaBusinessName
  // Primary business sub-label shown only when it differs from umbrella
  const primaryBizSubLabel = (hasUmbrella && entry.businessName !== entry.umbrellaBusinessName)
    ? entry.businessName
    : null

  return `
<div class="payslip-page" style="width:190mm;min-height:267mm;padding:10mm;box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;page-break-after:always;position:relative;">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
    <div>
      <div style="font-size:15px;font-weight:700;color:#000;">${hasUmbrella ? entry.umbrellaBusinessName : entry.businessName}</div>
      ${hasUmbrella && entry.umbrellaBusinessAddress ? `<div style="font-size:10px;color:#333;">${entry.umbrellaBusinessAddress}</div>` : (!hasUmbrella && entry.businessAddress ? `<div style="font-size:10px;color:#333;">${entry.businessAddress}</div>` : '')}
      ${hasUmbrella && entry.umbrellaBusinessPhone ? `<div style="font-size:10px;color:#333;">Tel: ${formatPhone(entry.umbrellaBusinessPhone)}</div>` : ''}
      ${primaryBizSubLabel ? `<div style="font-size:10px;color:#555;margin-top:2px;">Trading as: <strong>${primaryBizSubLabel}</strong></div>` : ''}
    </div>
    <div style="text-align:right;">
      <div style="font-size:13px;font-weight:700;color:#000;">PAYSLIP</div>
      <div style="font-size:11px;color:#333;">${period}</div>
    </div>
  </div>

  <div style="border-top:2px solid #111827;margin-bottom:8px;"></div>

  <!-- Employee Info -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:10px;">
    <div style="font-size:11px;"><span style="color:#333;">Name:</span> <strong>${entry.employeeName}</strong></div>
    <div style="font-size:11px;"><span style="color:#333;">Employee #:</span> ${entry.employeeNumber}</div>
    ${entry.nationalId ? `<div style="font-size:11px;"><span style="color:#333;">National ID:</span> ${entry.nationalId}</div>` : '<div></div>'}
    ${entry.jobTitle ? `<div style="font-size:11px;"><span style="color:#333;">Job Title:</span> ${entry.jobTitle}</div>` : '<div></div>'}
    <div style="font-size:11px;"><span style="color:#333;">Work Days:</span> ${entry.workDays}</div>
    <div style="font-size:11px;"><span style="color:#333;">Leave:</span> ${entry.leaveDays || 0}d &nbsp; <span style="color:#333;">Sick:</span> ${entry.sickDays || 0}d &nbsp; <span style="color:#333;">Absent:</span> ${entry.absenceDays || 0}d</div>
  </div>

  <!-- Earnings / Deductions table -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;align-items:start;">
    <!-- Earnings -->
    <div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${sectionHeader('Earnings')}
          ${row('Basic Salary (Contractual)', fmt(entry.contractualBasicSalary))}
          ${entry.contractualBasicSalary !== entry.proratedBasicSalary ? row('Basic Salary (Prorated)', fmt(entry.proratedBasicSalary)) : ''}
          ${hasCommission ? row('Commission', fmt(entry.commission || 0)) : ''}
          ${hasOT ? row('Overtime (1.5x)', fmt(entry.standardOvertimePay || 0)) : ''}
          ${(entry.doubleOvertimePay || 0) > 0 ? row('Overtime (2.0x)', fmt(entry.doubleOvertimePay || 0)) : ''}
          ${hasPerDiem ? row('Per Diem / Allowance', fmt(entry.perDiem || 0)) : ''}
          ${hasCashInLieu ? row('Cash in Lieu', fmt(entry.cashInLieu || 0)) : ''}
          ${hasAdjustments ? row('Other Additions', fmt(entry.adjustmentsAdditions || 0)) : ''}
          ${hasBenefits ? sectionHeader('Benefits') : ''}
          ${benefits.map(b => row(b.name, fmt(b.amount))).join('')}
          <tr><td colspan="2"><div style="border-top:1px solid #e5e7eb;margin:4px 0;"></div></td></tr>
          ${row('Gross Pay', fmt(entry.grossPay), true)}
        </tbody>
      </table>
    </div>

    <!-- Deductions -->
    <div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${sectionHeader('Statutory Deductions')}
          ${(entry.nssaEmployee || 0) > 0 ? row('NSSA Employee', fmt(entry.nssaEmployee || 0), false, true) : ''}
          ${(entry.payeAmount || 0) > 0 ? row('PAYE Tax', fmt(entry.payeAmount || 0), false, true) : ''}
          ${(entry.aidsLevy || 0) > 0 ? row('AIDS Levy', fmt(entry.aidsLevy || 0), false, true) : ''}
          ${hasAbsence ? row('Absence Deduction', fmt(entry.absenceDeduction || 0), false, true) : ''}
          ${(hasAdvance || hasLoans || hasMisc) ? sectionHeader('Other Deductions') : ''}
          ${hasAdvance ? row('Salary Advance', fmt(entry.advanceDeductions || 0), false, true) : ''}
          ${hasLoans ? row('Loan Repayment', fmt(entry.loanDeductions || 0), false, true) : ''}
          ${hasMisc ? row('Other Deductions', fmt(entry.miscDeductions || 0), false, true) : ''}
          <tr><td colspan="2"><div style="border-top:1px solid #e5e7eb;margin:4px 0;"></div></td></tr>
          ${row('Total Deductions', fmt(entry.totalDeductions || 0), true, true)}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Net Pay Banner -->
  <div style="margin-top:10px;border:2px solid #000;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:13px;font-weight:700;color:#000;">NET PAY</span>
    <span style="font-size:16px;font-weight:700;color:#000;">${fmt(entry.netPay)}</span>
  </div>

  <!-- Divider + Tear-off -->
  <div style="margin-top:20px;border-top:2px dashed #555;padding-top:16px;">
    <div style="font-size:9px;color:#333;text-align:center;margin-bottom:8px;">✂ ACKNOWLEDGEMENT — DETACH AND RETURN SIGNED</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 12px;font-size:10px;">
      <div><span style="color:#333;">Employee:</span> <strong>${entry.employeeName}</strong></div>
      <div><span style="color:#333;">Period:</span> ${period}</div>
      <div><span style="color:#333;">Net Pay:</span> <strong>${fmt(entry.netPay)}</strong></div>
    </div>
    <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:0 32px;">
      <div>
        <div style="height:36px;"></div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:9px;color:#333;">Employee Signature &amp; Date</div>
      </div>
      <div>
        <div style="height:36px;"></div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:9px;color:#333;">Authorised Signatory &amp; Date</div>
      </div>
    </div>
    <div style="margin-top:8px;font-size:9px;color:#555;">
      I acknowledge receipt of the above amount in full and final settlement of my remuneration for the period stated.
    </div>
  </div>

  <!-- Page counter -->
  <div style="position:absolute;bottom:6mm;right:10mm;font-size:9px;color:#555;">${index + 1} / ${total}</div>
</div>`
}

export function generateBulkPayslipsHTML(entries: PayslipEntry[], periodLabel: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payslips — ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f3f4f6; }
    @media print {
      body { background: #fff; }
      .payslip-page { page-break-after: always; }
      .payslip-page:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
${entries.map((e, i) => generatePayslipHTML(e, i, entries.length)).join('\n')}
</body>
</html>`
}
