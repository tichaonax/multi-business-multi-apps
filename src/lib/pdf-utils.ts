import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface PayrollEntryData {
  employeeName: string
  employeeNumber: string
  nationalId: string
  jobTitle?: string
  startDate?: string
  periodMonth: string
  periodYear: number
  businessName?: string

  // Earnings
  baseSalary: number
  commission: number
  overtimePay: number
  standardOvertimeHours?: number
  doubleTimeOvertimeHours?: number
  benefits: Array<{ name: string; amount: number }>
  adjustments: number
  absenceDeduction?: number
  grossPay: number

  // Deductions
  advances: Array<{ description: string; amount: number }>
  loans: Array<{ description: string; amount: number }>
  otherDeductions: Array<{ description: string; amount: number }>
  miscDeductions: number
  totalDeductions: number

  // Work days
  workDays: number
  sickDays: number
  leaveDays: number
  absenceDays: number

  // Net
  netPay: number
}

export const generateContractPDF = async (
  elementRef: HTMLElement, 
  fileName: string
): Promise<void> => {
  try {
    // Configure html2canvas options for better PDF quality
    const canvas = await html2canvas(elementRef, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: elementRef.scrollWidth,
      height: elementRef.scrollHeight
    })

    const imgData = canvas.toDataURL('image/png')
    
    // Create PDF with A4 dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Calculate dimensions to fit A4 page
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight

    // Add additional pages if content is longer than one page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    // Save the PDF
    pdf.save(fileName)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}

export const previewContractPDF = async (elementRef: HTMLElement): Promise<string> => {
  try {
    const canvas = await html2canvas(elementRef, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: elementRef.scrollWidth,
      height: elementRef.scrollHeight
    })

    const imgData = canvas.toDataURL('image/png')
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    // Return PDF as blob URL for preview
    const pdfBlob = pdf.output('blob')
    return URL.createObjectURL(pdfBlob)
  } catch (error) {
    console.error('Error previewing PDF:', error)
    throw new Error('Failed to preview PDF')
  }
}

export const generateContractFileName = (
  employeeName: string,
  contractNumber: string,
  version: number
): string => {
  const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, '_')
  const timestamp = new Date().toISOString().split('T')[0]
  return `Contract_${contractNumber}_v${version}_${sanitizedName}_${timestamp}.pdf`
}

export const generatePayrollEntryPDF = async (
  data: PayrollEntryData,
  fileName: string
): Promise<void> => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pageWidth - 2 * margin
    let y = margin

    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return `$${amount.toFixed(2)}`
    }

    // Helper to add a line
    const addLine = (y: number) => {
      pdf.setDrawColor(200, 200, 200)
      pdf.line(margin, y, pageWidth - margin, y)
    }

    // Title
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('PROJECTED PAYROLL SLIP', pageWidth / 2, y, { align: 'center' })
    y += 8

    // Period
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Period: ${data.periodMonth} ${data.periodYear}`, pageWidth / 2, y, { align: 'center' })
    y += 5

    // Disclaimer
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(150, 150, 150)
    pdf.text('(Before required government deductions)', pageWidth / 2, y, { align: 'center' })
    pdf.setTextColor(0, 0, 0)
    y += 5

    addLine(y)
    y += 6

    // Employee Information (Two columns)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('EMPLOYEE INFORMATION', margin, y)
    y += 5

    pdf.setFont('helvetica', 'normal')
    const col1X = margin
    const col2X = pageWidth / 2 + 5

    // Left column
    pdf.setFont('helvetica', 'bold')
    pdf.text('Name:', col1X, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(data.employeeName, col1X + 25, y)

    // Right column
    pdf.setFont('helvetica', 'bold')
    pdf.text('Employee #:', col2X, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(data.employeeNumber, col2X + 25, y)
    y += 5

    // Second row
    pdf.setFont('helvetica', 'bold')
    pdf.text('National ID:', col1X, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(data.nationalId, col1X + 25, y)

    if (data.jobTitle) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Job Title:', col2X, y)
      pdf.setFont('helvetica', 'normal')
      pdf.text(data.jobTitle, col2X + 25, y)
    }
    y += 5

    if (data.businessName) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Business:', col1X, y)
      pdf.setFont('helvetica', 'normal')
      pdf.text(data.businessName, col1X + 25, y)
      y += 5
    }

    if (data.startDate) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Start Date:', col1X, y)
      pdf.setFont('helvetica', 'normal')
      pdf.text(data.startDate, col1X + 25, y)
      y += 5
    }

    y += 2
    addLine(y)
    y += 6

    // Attendance (compact)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('ATTENDANCE', margin, y)
    y += 5

    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Work Days: ${data.workDays}`, col1X, y)
    pdf.text(`Sick Leave: ${data.sickDays}`, col1X + 30, y)
    pdf.text(`Annual Leave: ${data.leaveDays}`, col1X + 60, y)
    pdf.text(`Absences: ${data.absenceDays}`, col1X + 95, y)
    y += 6
    addLine(y)
    y += 6

    // Earnings Section
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('EARNINGS', margin, y)
    y += 5

    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')

    const earningsX = margin + 5
    const amountX = pageWidth - margin - 25

    // Base Salary
    pdf.text('Base Salary', earningsX, y)
    pdf.text(formatCurrency(data.baseSalary), amountX, y, { align: 'right' })
    y += 4

    // Commission
    if (data.commission > 0) {
      pdf.text('Commission', earningsX, y)
      pdf.text(formatCurrency(data.commission), amountX, y, { align: 'right' })
      y += 4
    }

    // Overtime
    if (data.overtimePay > 0) {
      let overtimeLabel = 'Overtime Pay'
      if (data.standardOvertimeHours && data.doubleTimeOvertimeHours) {
        overtimeLabel = `Overtime (${data.standardOvertimeHours}h @1.5x, ${data.doubleTimeOvertimeHours}h @2.0x)`
      } else if (data.standardOvertimeHours) {
        overtimeLabel = `Overtime (${data.standardOvertimeHours}h @1.5x)`
      } else if (data.doubleTimeOvertimeHours) {
        overtimeLabel = `Overtime (${data.doubleTimeOvertimeHours}h @2.0x)`
      }
      pdf.text(overtimeLabel, earningsX, y)
      pdf.text(formatCurrency(data.overtimePay), amountX, y, { align: 'right' })
      y += 4
    }

    // Benefits
    if (data.benefits && data.benefits.length > 0) {
      for (const benefit of data.benefits) {
        pdf.text(benefit.name, earningsX, y)
        pdf.text(formatCurrency(benefit.amount), amountX, y, { align: 'right' })
        y += 4
      }
    }

    // Adjustments
    if (data.adjustments > 0) {
      pdf.text('Adjustments (Additions)', earningsX, y)
      pdf.text(formatCurrency(data.adjustments), amountX, y, { align: 'right' })
      y += 4
    }

    // Absence Deduction
    if (data.absenceDeduction && data.absenceDeduction > 0) {
      pdf.setTextColor(200, 0, 0)
      pdf.text('Absence (unearned)', earningsX, y)
      pdf.text(`-${formatCurrency(data.absenceDeduction)}`, amountX, y, { align: 'right' })
      pdf.setTextColor(0, 0, 0)
      y += 4
    }

    y += 1
    pdf.setDrawColor(0, 0, 0)
    pdf.line(earningsX, y, amountX + 25, y)
    y += 4

    // Gross Pay
    pdf.setFont('helvetica', 'bold')
    pdf.text('GROSS PAY', earningsX, y)
    pdf.text(formatCurrency(data.grossPay), amountX, y, { align: 'right' })
    y += 6

    addLine(y)
    y += 6

    // Deductions Section
    pdf.setFont('helvetica', 'bold')
    pdf.text('DEDUCTIONS', margin, y)
    y += 5

    pdf.setFont('helvetica', 'normal')

    let hasDeductions = false

    // Define consistent indent for itemized deductions
    const itemIndentX = earningsX + 3

    // Advances (itemized)
    if (data.advances && data.advances.length > 0) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.text('Advances:', earningsX, y)
      y += 4
      pdf.setFont('helvetica', 'normal')

      for (const advance of data.advances) {
        pdf.setTextColor(200, 0, 0)
        pdf.text(advance.description, itemIndentX, y)
        pdf.text(formatCurrency(advance.amount), amountX, y, { align: 'right' })
        y += 4
        hasDeductions = true
      }
      pdf.setTextColor(0, 0, 0)
    }

    // Loans (itemized)
    if (data.loans && data.loans.length > 0) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.text('Loans:', earningsX, y)
      y += 4
      pdf.setFont('helvetica', 'normal')

      for (const loan of data.loans) {
        pdf.setTextColor(200, 0, 0)
        pdf.text(loan.description, itemIndentX, y)
        pdf.text(formatCurrency(loan.amount), amountX, y, { align: 'right' })
        y += 4
        hasDeductions = true
      }
      pdf.setTextColor(0, 0, 0)
    }

    // Other Deductions (itemized) - penalties, etc.
    if (data.otherDeductions && data.otherDeductions.length > 0) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.text('Other Deductions:', earningsX, y)
      y += 4
      pdf.setFont('helvetica', 'normal')

      for (const other of data.otherDeductions) {
        pdf.setTextColor(200, 0, 0)
        pdf.text(other.description, itemIndentX, y)
        pdf.text(formatCurrency(other.amount), amountX, y, { align: 'right' })
        y += 4
        hasDeductions = true
      }
      pdf.setTextColor(0, 0, 0)
    }

    // Misc Deductions
    if (data.miscDeductions > 0) {
      pdf.setTextColor(200, 0, 0)
      pdf.text('Miscellaneous Deductions', earningsX, y)
      pdf.text(formatCurrency(data.miscDeductions), amountX, y, { align: 'right' })
      pdf.setTextColor(0, 0, 0)
      y += 4
      hasDeductions = true
    }

    if (!hasDeductions) {
      pdf.text('No deductions', earningsX, y)
      y += 4
    }

    y += 1
    pdf.setDrawColor(0, 0, 0)
    pdf.line(earningsX, y, amountX + 25, y)
    y += 4

    // Total Deductions
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(200, 0, 0)
    pdf.text('TOTAL DEDUCTIONS', earningsX, y)
    pdf.text(formatCurrency(data.totalDeductions), amountX, y, { align: 'right' })
    pdf.setTextColor(0, 0, 0)
    y += 6

    addLine(y)
    y += 6

    // NET PAY (Highlighted)
    pdf.setFillColor(240, 240, 240)
    pdf.rect(margin, y - 4, contentWidth, 10, 'F')

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('PROJECTED NET PAY', margin + 5, y + 2)
    pdf.text(formatCurrency(data.netPay), amountX, y + 2, { align: 'right' })
    y += 6

    pdf.setFontSize(6)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(100, 100, 100)
    pdf.text('(Before required government deductions)', margin + 5, y)
    pdf.setTextColor(0, 0, 0)
    y += 8

    // Footer
    y = pageHeight - 20
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(100, 100, 100)
    pdf.text('This is a computer-generated document. No signature required.', pageWidth / 2, y, { align: 'center' })
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y + 4, { align: 'center' })

    // Save the PDF
    pdf.save(fileName)
  } catch (error) {
    console.error('Error generating payroll entry PDF:', error)
    throw new Error('Failed to generate payroll entry PDF')
  }
}

export const generatePayrollEntryFileName = (
  employeeName: string,
  employeeNumber: string,
  year: number,
  month: number
): string => {
  const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, '_')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthStr = monthNames[month - 1] || month
  const timestamp = new Date().toISOString().split('T')[0]
  return `PayrollEntry_${employeeNumber}_${monthStr}${year}_${sanitizedName}_${timestamp}.pdf`
}

// ─── Cash Allocation Report PDF ────────────────────────────────────────────

export interface CashAllocationLineItemPDF {
  accountName: string
  sourceType: string
  reportedAmount: number
  actualAmount: number | null
}

export interface CashAllocationPDFData {
  businessName?: string
  reportDate: string           // YYYY-MM-DD
  lockedAt?: string            // ISO string
  lockerName?: string          // cashier who locked the report
  cashTendered: number | null
  rentConfig: { accountName: string; dailyTransferAmount: number } | null
  lineItems: CashAllocationLineItemPDF[]
  businessKeeps: number | null
}

export const generateCashAllocationPDF = (
  data: CashAllocationPDFData,
  fileName: string,
  action: 'save' | 'print' = 'save',
): void => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin
  const amountX = pageWidth - margin
  let y = margin

  const fmt = (n: number) => `$${n.toFixed(2)}`

  // Single draw-color: dark gray for all lines — no fills anywhere (save toner)
  const drawLine = (yPos: number) => {
    pdf.setDrawColor(0, 0, 0)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
  }
  const drawThinLine = (yPos: number) => {
    pdf.setDrawColor(150, 150, 150)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
  }

  // ── Header ──────────────────────────────────────────────────────────────
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text('CASH ALLOCATION REPORT', pageWidth / 2, y, { align: 'center' })
  y += 7

  if (data.businessName) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(data.businessName, pageWidth / 2, y, { align: 'center' })
    y += 5
  }

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Report Date: ${data.reportDate}`, pageWidth / 2, y, { align: 'center' })
  y += 4

  if (data.lockedAt) {
    const lockedStr = new Date(data.lockedAt).toLocaleString()
    const lockerPart = data.lockerName ? `  |  Closed by: ${data.lockerName}` : ''
    pdf.text(`Locked: ${lockedStr}${lockerPart}`, pageWidth / 2, y, { align: 'center' })
    y += 4
  }

  y += 2
  drawLine(y)
  y += 6

  // ── Cash Distribution Summary ────────────────────────────────────────────
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CASH DISTRIBUTION', margin, y)
  y += 6

  pdf.setFontSize(9)

  // Cash tendered
  if (data.cashTendered !== null) {
    pdf.setFont('helvetica', 'bold')
    pdf.text('Cash Tendered (from EOD report)', margin + 2, y)
    pdf.text(fmt(data.cashTendered), amountX - 2, y, { align: 'right' })
  } else {
    pdf.setFont('helvetica', 'italic')
    pdf.text('Cash Tendered: not recorded in EOD report', margin + 2, y)
  }
  y += 5

  // Rent deduction
  if (data.rentConfig) {
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Less: Rent Transfer — ${data.rentConfig.accountName}`, margin + 2, y)
    pdf.text(`-${fmt(data.rentConfig.dailyTransferAmount)}`, amountX - 2, y, { align: 'right' })
    y += 5
  }

  // Auto-deposit deductions
  const nonRent = data.lineItems.filter(li => li.sourceType !== 'EOD_RENT_TRANSFER')
  for (const li of nonRent) {
    const amt = li.actualAmount !== null ? li.actualAmount : li.reportedAmount
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Less: ${li.accountName}`, margin + 2, y)
    pdf.text(`-${fmt(amt)}`, amountX - 2, y, { align: 'right' })
    y += 5
  }

  drawThinLine(y)
  y += 5

  // Business keeps — bold, boxed with border only (no fill)
  if (data.businessKeeps !== null) {
    pdf.setDrawColor(0, 0, 0)
    pdf.rect(margin, y - 4, contentWidth, 8) // border only, no fill
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Business Keeps', margin + 3, y + 1)
    pdf.text(fmt(data.businessKeeps), amountX - 3, y + 1, { align: 'right' })
    y += 12
  } else {
    y += 4
  }

  drawLine(y)
  y += 8

  // ── Allocation Detail Table ───────────────────────────────────────────────
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('ALLOCATION DETAIL', margin, y)
  y += 6

  const col = {
    account: margin,
    type: margin + 68,
    reported: pageWidth - margin - 30,
    actual: pageWidth - margin,
  }

  // Table header — underlined, no fill
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Account', col.account + 1, y)
  pdf.text('Type', col.type, y)
  pdf.text('Reported', col.reported, y, { align: 'right' })
  pdf.text('Actual', col.actual, y, { align: 'right' })
  y += 2
  drawLine(y)
  y += 4

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)

  const allItems: CashAllocationLineItemPDF[] = [
    ...(data.rentConfig
      ? [{ accountName: data.rentConfig.accountName, sourceType: 'EOD_RENT_TRANSFER', reportedAmount: data.rentConfig.dailyTransferAmount, actualAmount: data.rentConfig.dailyTransferAmount }]
      : []),
    ...nonRent,
  ]

  let totalReported = 0
  let totalActual = 0

  for (const li of allItems) {
    const reported = li.reportedAmount
    const actual = li.actualAmount !== null ? li.actualAmount : reported
    totalReported += reported
    totalActual += actual

    const typeLabel = li.sourceType === 'EOD_RENT_TRANSFER' ? 'Rent Transfer' : 'Auto Deposit'

    // Clip long account names
    const maxW = col.type - col.account - 4
    let displayName = li.accountName
    while (pdf.getTextWidth(displayName) > maxW && displayName.length > 5) {
      displayName = displayName.slice(0, -4) + '...'
    }

    pdf.text(displayName, col.account + 1, y)
    pdf.text(typeLabel, col.type, y)
    pdf.text(fmt(reported), col.reported, y, { align: 'right' })
    pdf.text(fmt(actual), col.actual, y, { align: 'right' })
    y += 5

    if (y > pageHeight - 25) { pdf.addPage(); y = margin }
  }

  // Total withdrawn
  drawThinLine(y)
  y += 4
  pdf.setFont('helvetica', 'bold')
  pdf.text('TOTAL WITHDRAWN', col.account + 1, y)
  pdf.text(fmt(totalReported), col.reported, y, { align: 'right' })
  pdf.text(fmt(totalActual), col.actual, y, { align: 'right' })
  y += 6

  // Business keeps row
  if (data.businessKeeps !== null) {
    drawThinLine(y)
    y += 4
    pdf.setFont('helvetica', 'bold')
    pdf.text('REMAINS IN BUSINESS CASH DRAWER', col.account + 1, y)
    pdf.text(fmt(data.businessKeeps), col.actual, y, { align: 'right' })
    y += 6
  }
  y += 2

  // ── Signature line ────────────────────────────────────────────────────────
  if (data.lockerName) {
    drawThinLine(y)
    y += 5
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Closed by: ${data.lockerName}`, margin, y)
    if (data.lockedAt) {
      pdf.text(new Date(data.lockedAt).toLocaleString(), amountX - 2, y, { align: 'right' })
    }
    y += 8
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(100, 100, 100)
  pdf.text(
    `Generated ${new Date().toLocaleString()} — MBM Cash Allocation System`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' },
  )

  if (action === 'print') {
    pdf.autoPrint()
    window.open(pdf.output('bloburl'), '_blank')
  } else {
    pdf.save(fileName)
  }
}
