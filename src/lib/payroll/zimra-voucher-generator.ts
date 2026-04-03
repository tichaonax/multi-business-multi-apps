/**
 * ZIMRA remittance voucher HTML generator.
 * Produces TWO separate vouchers (page-break between them):
 *   1. NSSA Contributions Remittance
 *   2. PAYE / P2 Remittance
 * Formatted for black & white printing — no filled boxes, no colour.
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

function row(label: string, value: string, bold = false, topBorder = false) {
  const bStyle = bold ? 'font-weight:700;' : ''
  const tStyle = topBorder ? 'border-top:1.5px solid #000;' : ''
  return `
    <tr>
      <td style="padding:5px 10px 5px 0;font-size:12px;${bStyle}${tStyle}">${label}</td>
      <td style="padding:5px 0 5px 10px;font-size:12px;text-align:right;${bStyle}${tStyle}">${value}</td>
    </tr>`
}

function voucherHeader(companyLabel: string, subLabel: string | null, address: string | null, phone: string | null, reg: string | null, title: string, period: string, dateStr: string) {
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
    <div>
      <div style="font-size:16px;font-weight:700;">${companyLabel}</div>
      ${subLabel ? `<div style="font-size:11px;">${subLabel}</div>` : ''}
      ${address ? `<div style="font-size:11px;">${address}</div>` : ''}
      ${phone ? `<div style="font-size:11px;">Tel: ${formatPhone(phone)}</div>` : ''}
      ${reg ? `<div style="font-size:11px;">Reg: ${reg}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div style="font-size:14px;font-weight:700;">${title}</div>
      <div style="font-size:11px;">Period: ${period}</div>
      <div style="font-size:11px;">Date: ${dateStr}</div>
    </div>
  </div>
  <div style="border-top:2px solid #000;margin-bottom:14px;"></div>`
}

function refBlock(employer: string, period: string, employees: number) {
  return `
  <div style="border:1px solid #000;padding:8px 12px;margin-bottom:18px;font-size:11px;">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
      <div><span>Employer:</span><br><strong>${employer}</strong></div>
      <div><span>Payroll Period:</span><br><strong>${period}</strong></div>
      <div><span>No. of Employees:</span><br><strong>${employees}</strong></div>
    </div>
  </div>`
}

function totalBox(label: string, value: string) {
  return `
  <div style="border:2px solid #000;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
    <div style="font-size:13px;font-weight:700;">${label}</div>
    <div style="font-size:18px;font-weight:700;">${value}</div>
  </div>`
}

function signatureSection() {
  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 32px;margin-top:28px;">
    <div style="height:36px;"></div><div style="height:36px;"></div>
    <div><div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Authorised Signatory &amp; Date</div></div>
    <div><div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">ZIMRA Receipt Stamp &amp; Date</div></div>
  </div>`
}

export interface ZimraVoucherData {
  businessName: string
  businessAddress?: string | null
  businessPhone?: string | null
  businessRegistration?: string | null
  umbrellaBusinessName?: string | null

  periodMonth: number
  periodYear: number
  periodStart?: Date | string | null
  periodEnd?: Date | string | null

  employeeCount: number

  // NSSA
  totalNssaEmployee: number
  totalNssaEmployer: number

  // PAYE
  totalRemuneration: number
  totalPaye: number
  totalAidsLevy: number
  totalTaxDue: number

  grandTotal: number

  generatedAt?: Date
}

export function generateZimraVoucherHTML(data: ZimraVoucherData): string {
  const monthName = MONTHS[(data.periodMonth - 1)] || String(data.periodMonth)
  const period = `${monthName} ${data.periodYear}`
  const now = data.generatedAt || new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const nssaTotal = data.totalNssaEmployee + data.totalNssaEmployer

  const nssaPage = `
<div style="width:190mm;min-height:267mm;padding:14mm 14mm 10mm;margin:0 auto;font-family:Arial,sans-serif;color:#000;background:#fff;page-break-after:always;">
  ${voucherHeader(data.businessName, null, data.businessAddress ?? null, data.businessPhone ?? null, data.businessRegistration ?? null, 'NSSA REMITTANCE VOUCHER', period, dateStr)}
  ${refBlock(data.businessName, period, data.employeeCount)}

  <table style="width:100%;border-collapse:collapse;">
    <tbody>
      ${row('Basic Salary / Contractual Remuneration', fmt(data.totalRemuneration))}
      ${row('NSSA Employee Contributions (3%)', fmt(data.totalNssaEmployee))}
      ${row('NSSA Employer Contributions (3%)', fmt(data.totalNssaEmployer))}
    </tbody>
  </table>

  ${totalBox('TOTAL NSSA PAYABLE', fmt(nssaTotal))}

  <div style="margin-top:20px;border-top:1px solid #000;padding-top:10px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
      <div>
        <div style="font-size:10px;font-weight:700;margin-bottom:4px;">Payment Reference:</div>
        <div style="border-bottom:1px solid #000;height:28px;"></div>
        <div style="border-bottom:1px solid #000;height:28px;margin-top:8px;"></div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;margin-bottom:4px;">Bank / Branch:</div>
        <div style="border-bottom:1px solid #000;height:28px;"></div>
        <div style="border-bottom:1px solid #000;height:28px;margin-top:8px;"></div>
      </div>
    </div>
  </div>

  ${signatureSection()}
  <div style="margin-top:18px;font-size:9px;text-align:center;">
    Generated ${dateStr} — ${data.businessName} — ${period} — ${data.employeeCount} employees
  </div>
</div>`

  const payePage = `
<div style="width:190mm;min-height:267mm;padding:14mm 14mm 10mm;margin:0 auto;font-family:Arial,sans-serif;color:#000;background:#fff;">
  ${voucherHeader(data.businessName, null, data.businessAddress ?? null, data.businessPhone ?? null, data.businessRegistration ?? null, 'PAYE REMITTANCE VOUCHER (P2)', period, dateStr)}
  ${refBlock(data.businessName, period, data.employeeCount)}

  <table style="width:100%;border-collapse:collapse;">
    <tbody>
      ${row('Total Chargeable Remuneration', fmt(data.totalRemuneration))}
      ${row('Gross PAYE (employees)', fmt(data.totalPaye))}
      ${row('AIDS Levy (3% of PAYE)', fmt(data.totalAidsLevy))}
    </tbody>
  </table>

  ${totalBox('TOTAL PAYE DUE (incl. AIDS Levy)', fmt(data.totalTaxDue))}

  <div style="margin-top:20px;border-top:1px solid #000;padding-top:10px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
      <div>
        <div style="font-size:10px;font-weight:700;margin-bottom:4px;">Payment Reference:</div>
        <div style="border-bottom:1px solid #000;height:28px;"></div>
        <div style="border-bottom:1px solid #000;height:28px;margin-top:8px;"></div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;margin-bottom:4px;">Bank / Branch:</div>
        <div style="border-bottom:1px solid #000;height:28px;"></div>
        <div style="border-bottom:1px solid #000;height:28px;margin-top:8px;"></div>
      </div>
    </div>
  </div>

  ${signatureSection()}
  <div style="margin-top:18px;font-size:9px;text-align:center;">
    Generated ${dateStr} — ${data.businessName} — ${period} — ${data.employeeCount} employees
  </div>
</div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ZIMRA Remittance Vouchers — ${data.businessName} — ${period}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; font-family: Arial, sans-serif; color: #000; }
    @page { size: A4; margin: 0; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
${nssaPage}
${payePage}
</body>
</html>`
}

