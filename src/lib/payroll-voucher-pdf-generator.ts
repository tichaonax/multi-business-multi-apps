import puppeteer from 'puppeteer'
import { generateVoucherHTML } from './payroll-voucher-generator'

/**
 * Generate a combined PDF with multiple vouchers
 * @param vouchers - Array of voucher records from database
 * @returns Buffer containing the PDF
 */
export async function generateCombinedVouchersPDF(vouchers: any[]): Promise<Buffer> {
  if (vouchers.length === 0) {
    throw new Error('No vouchers provided')
  }

  // Generate HTML for all vouchers
  const voucherHTMLs = vouchers.map((voucher) => {
    const voucherData = {
      voucherNumber: voucher.voucherNumber,
      employeeNumber: voucher.employeeNumber,
      employeeName: voucher.employeeName,
      employeeNationalId: voucher.employeeNationalId,
      amount: Number(voucher.amount),
      paymentDate: voucher.paymentDate,
      issuedAt: voucher.issuedAt,
      paymentType: voucher.payroll_payments?.paymentType || 'SALARY',
      paymentSchedule: voucher.payroll_payments?.paymentSchedule,
      deductions: voucher.payroll_payments?.deductions,
      commissionAmount: voucher.payroll_payments?.commissionAmount
        ? Number(voucher.payroll_payments.commissionAmount)
        : undefined,
      notes: voucher.notes,
      regenerationCount: voucher.regenerationCount,
      lastRegeneratedAt: voucher.lastRegeneratedAt,
      signatureData: voucher.signatureData,
      signedAt: voucher.signedAt,
    }

    return generateVoucherHTML(voucherData)
  })

  // Combine all vouchers with page breaks
  const today = new Date().toISOString().split('T')[0]
  const voucherCount = vouchers.length
  const combinedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Vouchers - ${voucherCount} Vouchers - ${today}</title>
  <style>
    @media print {
      .voucher-page {
        page-break-after: always;
      }
      .voucher-page:last-child {
        page-break-after: auto;
      }
    }
    body {
      margin: 0;
      padding: 0;
    }
    .voucher-page {
      margin-bottom: 40px;
    }
  </style>
</head>
<body>
${voucherHTMLs
    .map(
      (html, index) => `
  <div class="voucher-page">
    ${html.replace(/<\/?(?:html|head|body)[^>]*>/gi, '')}
  </div>
`
    )
    .join('\n')}
</body>
</html>
  `

  // Launch puppeteer and generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(combinedHTML, {
      waitUntil: 'networkidle0',
    })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

/**
 * Generate a single voucher PDF
 * @param voucher - Voucher record from database
 * @returns Buffer containing the PDF
 */
export async function generateSingleVoucherPDF(voucher: any): Promise<Buffer> {
  return generateCombinedVouchersPDF([voucher])
}
