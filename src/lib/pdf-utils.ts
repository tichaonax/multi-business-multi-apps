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
  perDiem?: number
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

// ─────────────────────────────────────────────────────────────────────────────
// Per Diem Request Form — blank printable template
// ─────────────────────────────────────────────────────────────────────────────

export interface PerDiemFormPrefill {
  employeeName?: string
  employeeNumber?: string
  jobTitle?: string
  department?: string
  month?: string   // e.g. "March"
  year?: string    // e.g. "2026"
}

export const generatePerDiemRequestFormPDF = (
  action: 'save' | 'print' = 'save',
  prefill?: PerDiemFormPrefill,
): void => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  const drawLine = (yPos: number, light = false) => {
    pdf.setDrawColor(light ? 180 : 0, light ? 180 : 0, light ? 180 : 0)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
  }
  const drawFieldLine = (x: number, yPos: number, w: number) => {
    pdf.setDrawColor(0, 0, 0)
    pdf.line(x, yPos, x + w, yPos)
  }
  const sectionHeader = (text: string) => {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(80, 80, 80)
    pdf.text(text, margin, y)
    pdf.setTextColor(0, 0, 0)
    y += 2
    drawLine(y)
    y += 5
  }

  // ── Title ─────────────────────────────────────────────────────────────────
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text('PER DIEM REQUEST FORM', pageWidth / 2, y, { align: 'center' })
  y += 6
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(100, 100, 100)
  pdf.text('Submit to your manager for approval — do not submit without receipts where required', pageWidth / 2, y, { align: 'center' })
  pdf.setTextColor(0, 0, 0)
  y += 4
  drawLine(y)
  y += 7

  // ── Employee Information ──────────────────────────────────────────────────
  sectionHeader('EMPLOYEE INFORMATION')

  const fieldW = (contentWidth - 10) / 2
  const col2X = margin + fieldW + 10

  const labelField = (label: string, x: number, w: number, value?: string) => {
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(80, 80, 80)
    pdf.text(label, x, y)
    drawFieldLine(x, y + 5, w)
    if (value) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8.5)
      pdf.setTextColor(0, 0, 0)
      pdf.text(value, x, y + 4)
    }
    pdf.setTextColor(0, 0, 0)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
  }

  labelField('Full Name', margin, fieldW, prefill?.employeeName)
  labelField('Employee #', col2X, fieldW, prefill?.employeeNumber)
  y += 10

  labelField('Job Title / Position', margin, fieldW, prefill?.jobTitle)
  labelField('Department / Business Unit', col2X, fieldW, prefill?.department)
  y += 10

  const thirdW = (contentWidth - 8) / 3
  labelField('Claim Period — Month', margin, thirdW, prefill?.month)
  labelField('Year', margin + thirdW + 4, thirdW, prefill?.year)
  labelField('Date Submitted', margin + (thirdW + 4) * 2, thirdW)
  y += 10

  // ── Eligible Categories ───────────────────────────────────────────────────
  sectionHeader('ELIGIBLE PER DIEM CATEGORIES')

  const cats = [
    { name: 'Lodging',      desc: 'Hotel, accommodation\ncosts during approved\ntravel' },
    { name: 'Meals',        desc: 'Breakfast, lunch, dinner\nduring work travel\nor duties' },
    { name: 'Incidentals',  desc: 'Tips, phone calls,\nlaundry while\ntravelling' },
    { name: 'Travel',       desc: 'Airfare, taxi, fuel,\ntolls, parking for\nwork purposes' },
    { name: 'Other',        desc: 'Any other approved\nwork-related expense\n(manager pre-approval)' },
  ]
  const catW = (contentWidth - 4) / 5
  cats.forEach((cat, i) => {
    const cx = margin + i * (catW + 1)
    pdf.setDrawColor(0, 0, 0)
    pdf.rect(cx, y - 3, catW, 18)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.text(cat.name, cx + 2, y + 2)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(80, 80, 80)
    const lines = cat.desc.split('\n')
    lines.forEach((line, li) => pdf.text(line, cx + 2, y + 7 + li * 3.5))
    pdf.setTextColor(0, 0, 0)
  })
  y += 22

  // ── Daily Entries Table ───────────────────────────────────────────────────
  sectionHeader('DAILY EXPENSE ENTRIES')

  const col = { num: margin, date: margin + 7, cat: margin + 35, desc: margin + 63, amt: pageWidth - margin - 16, rec: pageWidth - margin }
  const rowH = 7

  // Header row
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'bold')
  pdf.setFillColor(230, 230, 230)
  pdf.rect(margin, y - 3, contentWidth, rowH, 'FD')
  pdf.text('#', col.num + 1, y + 1)
  pdf.text('Date', col.date + 1, y + 1)
  pdf.text('Category', col.cat + 1, y + 1)
  pdf.text('Description / Notes', col.desc + 1, y + 1)
  pdf.text('Amount ($)', col.amt, y + 1, { align: 'right' })
  pdf.text('Receipt', col.rec, y + 1, { align: 'right' })
  y += rowH + 1

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  for (let i = 1; i <= 12; i++) {
    pdf.setDrawColor(180, 180, 180)
    pdf.rect(margin, y - 3, contentWidth, rowH)
    pdf.setTextColor(160, 160, 160)
    pdf.text(String(i), col.num + 1, y + 1)
    pdf.setTextColor(0, 0, 0)
    // vertical separators
    ;[col.date, col.cat, col.desc, col.amt - 2, col.rec - 18].forEach(cx => {
      pdf.setDrawColor(180, 180, 180)
      pdf.line(cx, y - 3, cx, y - 3 + rowH)
    })
    y += rowH
  }
  y += 4

  // ── Summary + Office Use ──────────────────────────────────────────────────
  const halfW = (contentWidth - 6) / 2
  const rightColX = margin + halfW + 6

  // Summary header
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(80, 80, 80)
  pdf.text('SUMMARY BY CATEGORY', margin, y)
  pdf.text('FOR OFFICE USE ONLY', rightColX, y)
  pdf.setTextColor(0, 0, 0)
  y += 2
  pdf.setDrawColor(0, 0, 0)
  pdf.line(margin, y, margin + halfW, y)
  pdf.line(rightColX, y, rightColX + halfW, y)
  y += 5

  const summaryRows = ['Lodging', 'Meals', 'Incidentals', 'Travel', 'Other']
  const officeRows = ['Amount Approved ($)', 'Approved by', 'Payroll Month', 'Date Entered', 'Entered by']
  const sumRowH = 6.5

  summaryRows.forEach((cat, i) => {
    const ry = y + i * sumRowH
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setDrawColor(180, 180, 180)
    pdf.rect(margin, ry - 3, halfW, sumRowH)
    pdf.text(cat, margin + 2, ry + 0.5)
    pdf.text('$', margin + halfW - 2, ry + 0.5, { align: 'right' })
  })

  // Total row
  const totalY = y + summaryRows.length * sumRowH
  pdf.setFillColor(220, 220, 220)
  pdf.setDrawColor(0, 0, 0)
  pdf.rect(margin, totalY - 3, halfW, sumRowH, 'FD')
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'bold')
  pdf.text('TOTAL CLAIMED', margin + 2, totalY + 0.5)
  pdf.text('$', margin + halfW - 2, totalY + 0.5, { align: 'right' })

  officeRows.forEach((field, i) => {
    const ry = y + i * sumRowH
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setDrawColor(180, 180, 180)
    pdf.rect(rightColX, ry - 3, halfW, sumRowH)
    pdf.setTextColor(80, 80, 80)
    pdf.text(field, rightColX + 2, ry + 0.5)
    pdf.setTextColor(0, 0, 0)
  })

  y = totalY + sumRowH + 6

  // ── Declaration + Signatures ──────────────────────────────────────────────
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(80, 80, 80)
  pdf.text('DECLARATION', margin, y)
  pdf.setTextColor(0, 0, 0)
  y += 2
  drawLine(y)
  y += 5

  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(60, 60, 60)
  const declaration = 'I certify that the expenses listed above were incurred by me in the performance of my official duties, that they are correctly stated, and that I have not previously been reimbursed for these expenses. I understand that false claims may result in disciplinary action.'
  const declLines = pdf.splitTextToSize(declaration, contentWidth)
  pdf.text(declLines, margin, y)
  pdf.setTextColor(0, 0, 0)
  y += declLines.length * 4 + 4

  const sigW = (contentWidth - 10) / 2
  const sig2X = margin + sigW + 10
  const sigLineY = y + 8

  pdf.setDrawColor(0, 0, 0)
  pdf.line(margin, sigLineY, margin + sigW, sigLineY)
  pdf.line(sig2X, sigLineY, sig2X + sigW, sigLineY)

  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Employee Signature', margin, sigLineY + 4)
  pdf.text('Manager / Approver Signature', sig2X, sigLineY + 4)

  const dateLineY = sigLineY + 10
  pdf.setFont('helvetica', 'normal')
  pdf.line(margin, dateLineY, margin + sigW / 2, dateLineY)
  pdf.line(sig2X, dateLineY, sig2X + sigW / 2, dateLineY)
  pdf.setTextColor(100, 100, 100)
  pdf.setFontSize(7)
  pdf.text('Date', margin, dateLineY + 3.5)
  pdf.text('Date', sig2X, dateLineY + 3.5)

  // ── Footer ────────────────────────────────────────────────────────────────
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(150, 150, 150)
  pdf.text(
    'Per Diem Request Form  ·  Return completed form with receipts to Payroll',
    pageWidth / 2, pageHeight - 8, { align: 'center' },
  )

  if (action === 'print') {
    pdf.autoPrint()
    window.open(pdf.output('bloburl'), '_blank')
  } else {
    pdf.save('PerDiemRequestForm.pdf')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Batch Voucher PDF (MBM-141)
// Toner-friendly — no background fills, borders only.
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentBatchVoucherItem {
  payeeName: string
  payeePhone: string | null
  categoryName: string
  expenseAccount: string
  amount: number
  notes: string | null
  requestedBy: string
  adHoc: boolean
}

export interface PaymentBatchVoucherData {
  batchId: string
  businessName: string
  cashierName: string
  reviewedAt: string       // ISO string
  totalApproved: number
  approvedCount: number
  rejectedCount: number
  payments: PaymentBatchVoucherItem[]
}

// Strip emoji and non-latin characters that most PDF printers can't render
const stripEmoji = (str: string): string =>
  str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{1F300}-\u{1F9FF}]/gu, '').replace(/\s{2,}/g, ' ').trim()

// dd/mm/yyyy format for ZIM locale
const fmtDate = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}
const fmtTime = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

export const generatePaymentBatchVoucher = (
  data: PaymentBatchVoucherData,
  action: 'save' | 'print' = 'save',
): void => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  const fmt = (n: number) => `$${n.toFixed(2)}`

  const drawLine = (yPos: number, light = false) => {
    pdf.setDrawColor(light ? 150 : 0, light ? 150 : 0, light ? 150 : 0)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
  }

  // ── Header ───────────────────────────────────────────────────────────────
  pdf.setFontSize(15)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text('PAYMENT BATCH APPROVAL VOUCHER', pageWidth / 2, y, { align: 'center' })
  y += 7

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(stripEmoji(data.businessName), pageWidth / 2, y, { align: 'center' })
  y += 5

  const reviewedDate = new Date(data.reviewedAt)
  pdf.setFontSize(9)
  pdf.text(
    `Date: ${fmtDate(reviewedDate)}  |  Time: ${fmtTime(reviewedDate)}  |  Approved by: ${stripEmoji(data.cashierName)}`,
    pageWidth / 2, y, { align: 'center' }
  )
  y += 4

  pdf.setFontSize(8)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Batch ID: ${data.batchId}`, pageWidth / 2, y, { align: 'center' })
  pdf.setTextColor(0, 0, 0)
  y += 5
  drawLine(y)
  y += 6

  // ── Summary ───────────────────────────────────────────────────────────────
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('SUMMARY', margin, y)
  y += 5

  pdf.setFont('helvetica', 'normal')
  const summaryItems = [
    { label: 'Payments Approved', value: String(data.approvedCount) },
    { label: 'Payments Returned to Queue', value: String(data.rejectedCount) },
    { label: 'Total Approved', value: fmt(data.totalApproved) },
  ]
  for (const item of summaryItems) {
    pdf.text(item.label, margin + 2, y)
    pdf.text(item.value, pageWidth - margin, y, { align: 'right' })
    y += 5
  }
  y += 2
  drawLine(y)
  y += 6

  // ── Payment Detail Table ──────────────────────────────────────────────────
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('APPROVED PAYMENTS', margin, y)
  y += 5

  // Column positions
  const col = {
    payee:    margin,
    account:  margin + 52,
    reqBy:    margin + 92,
    amount:   pageWidth - margin,
  }

  // Table header
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Payee / Notes', col.payee, y)
  pdf.text('Account', col.account, y)
  pdf.text('Requested By', col.reqBy, y)
  pdf.text('Amount', col.amount, y, { align: 'right' })
  y += 3
  drawLine(y)
  y += 4

  pdf.setFont('helvetica', 'normal')

  for (const p of data.payments) {
    // Check for page overflow
    if (y > 260) {
      pdf.addPage()
      y = margin
    }

    // Payee row — strip emojis, clip long names
    let payeeDisplay = stripEmoji(p.payeeName)
    while (pdf.getTextWidth(payeeDisplay) > 48 && payeeDisplay.length > 5) {
      payeeDisplay = payeeDisplay.slice(0, -4) + '...'
    }
    pdf.text(payeeDisplay, col.payee, y)

    // Phone sub-line under payee name
    if (p.payeePhone) {
      pdf.setFontSize(7)
      pdf.setTextColor(100, 100, 100)
      pdf.text(p.payeePhone, col.payee, y + 3)
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(8)
      y += 3.5
    }

    let acctDisplay = stripEmoji(p.expenseAccount)
    while (pdf.getTextWidth(acctDisplay) > 36 && acctDisplay.length > 5) {
      acctDisplay = acctDisplay.slice(0, -4) + '...'
    }
    pdf.text(acctDisplay, col.account, y)

    let reqByDisplay = stripEmoji(p.requestedBy)
    while (pdf.getTextWidth(reqByDisplay) > 36 && reqByDisplay.length > 5) {
      reqByDisplay = reqByDisplay.slice(0, -4) + '...'
    }
    pdf.text(reqByDisplay, col.reqBy, y)
    pdf.text(fmt(p.amount), col.amount, y, { align: 'right' })
    y += 4

    // Sub-row: category + notes + ad-hoc badge
    pdf.setTextColor(100, 100, 100)
    pdf.setFontSize(7)
    const sub = [
      p.categoryName !== '—' ? stripEmoji(p.categoryName) : null,
      p.notes ? stripEmoji(p.notes) : null,
      p.adHoc ? '[Ad-hoc]' : null,
    ].filter(Boolean).join('  .  ')
    if (sub) {
      pdf.text(sub, col.payee + 1, y)
      y += 3.5
    }
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(8)

    drawLine(y, true)
    y += 3
  }

  y += 2
  // Total row
  pdf.setFont('helvetica', 'bold')
  pdf.text('TOTAL APPROVED', margin, y)
  pdf.text(fmt(data.totalApproved), pageWidth - margin, y, { align: 'right' })
  y += 8

  // ── Signature Lines ───────────────────────────────────────────────────────
  drawLine(y)
  y += 8

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  const sigY = y + 10
  pdf.line(margin, sigY, margin + 60, sigY)
  pdf.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY)
  y = sigY + 4
  pdf.setFontSize(8)
  pdf.text('Cashier / Approver', margin, y)
  pdf.text('Business Representative', pageWidth - margin - 60, y)

  // ── Footer ────────────────────────────────────────────────────────────────
  y += 12
  pdf.setFontSize(7)
  pdf.setTextColor(150, 150, 150)
  const now = new Date()
  pdf.text(`Printed ${fmtDate(now)} ${fmtTime(now)}`, pageWidth / 2, y, { align: 'center' })

  const fileName = `payment-batch-${data.batchId.slice(-8)}-${reviewedDate.toISOString().split('T')[0]}.pdf`

  if (action === 'print') {
    pdf.autoPrint()
    window.open(pdf.output('bloburl'), '_blank')
  } else {
    pdf.save(fileName)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Petty Cash Approval Voucher
// Toner-friendly — no background fills, borders only.
// ─────────────────────────────────────────────────────────────────────────────

export interface PettyCashVoucherTransaction {
  transactionDate: string
  payeeName?: string | null
  payeePhone?: string | null
  description: string
  category?: { emoji?: string; name: string } | null
  amount: number
}

export interface PettyCashVoucherData {
  requestId: string
  businessName: string
  requesterName: string
  approverName: string
  purpose: string
  requestedAmount: number
  approvedAmount: number
  expenseAccount: string
  paymentChannel: 'CASH' | 'ECOCASH'
  approvedAt: string   // ISO string
  notes?: string | null
  transactions?: PettyCashVoucherTransaction[]
  spentAmount?: number
  returnedAmount?: number
}

export const generatePettyCashVoucher = (
  data: PettyCashVoucherData,
  action: 'save' | 'print' = 'save',
): void => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  const fmt = (n: number) => `$${n.toFixed(2)}`
  const drawLine = (yPos: number, light = false) => {
    pdf.setDrawColor(light ? 150 : 0, light ? 150 : 0, light ? 150 : 0)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
  }

  const approvedDate = new Date(data.approvedAt)

  // ── Header ───────────────────────────────────────────────────────────────
  pdf.setFontSize(15)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text('PETTY CASH APPROVAL VOUCHER', pageWidth / 2, y, { align: 'center' })
  y += 7

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(stripEmoji(data.businessName), pageWidth / 2, y, { align: 'center' })
  y += 5

  pdf.setFontSize(9)
  pdf.text(
    `Date: ${fmtDate(approvedDate)}  |  Time: ${fmtTime(approvedDate)}  |  Approved by: ${stripEmoji(data.approverName)}`,
    pageWidth / 2, y, { align: 'center' }
  )
  y += 4

  pdf.setFontSize(8)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Request ID: ${data.requestId}`, pageWidth / 2, y, { align: 'center' })
  pdf.setTextColor(0, 0, 0)
  y += 5
  drawLine(y)
  y += 6

  // ── Detail rows ──────────────────────────────────────────────────────────
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('PETTY CASH DETAILS', margin, y)
  y += 5

  const rows: { label: string; value: string }[] = [
    { label: 'Requester',       value: stripEmoji(data.requesterName) },
    { label: 'Purpose',         value: stripEmoji(data.purpose) },
    { label: 'Expense Account', value: stripEmoji(data.expenseAccount) },
    { label: 'Payment Channel', value: data.paymentChannel },
    { label: 'Requested Amount',value: fmt(data.requestedAmount) },
    { label: 'Approved Amount', value: fmt(data.approvedAmount) },
  ]
  if (data.notes) rows.push({ label: 'Notes', value: stripEmoji(data.notes) })

  pdf.setFont('helvetica', 'normal')
  const labelX = margin + 2
  const valueX = margin + 55
  for (const row of rows) {
    pdf.setFont('helvetica', 'bold')
    pdf.text(row.label, labelX, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(row.value, valueX, y)
    y += 6
  }

  y += 2
  drawLine(y)
  y += 8

  // ── Expenses section ─────────────────────────────────────────────────────
  if (data.transactions && data.transactions.length > 0) {
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('EXPENSE TRANSACTIONS', margin, y)
    y += 5

    // Table header
    const colDate = margin
    const colPayee = margin + 28
    const colDesc = margin + 72
    const colCat = margin + 118
    const colAmt = pageWidth - margin

    pdf.setFillColor(240, 240, 240)
    pdf.rect(margin, y - 3.5, contentWidth, 6, 'F')
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Date', colDate, y)
    pdf.text('Payee', colPayee, y)
    pdf.text('Description', colDesc, y)
    pdf.text('Category', colCat, y)
    pdf.text('Amount', colAmt, y, { align: 'right' })
    y += 4
    drawLine(y, true)
    y += 3

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    for (const tx of data.transactions) {
      const dateStr = new Date(tx.transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const payeeStr = stripEmoji(tx.payeeName ?? '—')
      const descStr = stripEmoji(tx.description ?? '').slice(0, 30)
      const catStr = tx.category ? `${tx.category.name}` : '—'
      const amtStr = fmt(tx.amount)

      pdf.text(dateStr, colDate, y)
      pdf.text(payeeStr.slice(0, 20), colPayee, y)
      pdf.text(descStr, colDesc, y)
      pdf.text(catStr.slice(0, 18), colCat, y)
      pdf.text(amtStr, colAmt, y, { align: 'right' })

      // Phone sub-line
      if (tx.payeePhone) {
        y += 3.5
        pdf.setTextColor(120, 120, 120)
        pdf.text(tx.payeePhone, colPayee, y)
        pdf.setTextColor(0, 0, 0)
      }

      y += 4.5

      // Add new page if needed
      if (y > 265) {
        pdf.addPage()
        y = margin + 5
      }
    }

    drawLine(y, true)
    y += 4

    // Totals
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'bold')
    const totalSpent = data.spentAmount ?? data.transactions.reduce((s, t) => s + t.amount, 0)
    pdf.text('Total Spent', colDesc, y)
    pdf.text(fmt(totalSpent), colAmt, y, { align: 'right' })
    y += 5

    if (data.returnedAmount != null && data.returnedAmount > 0) {
      pdf.text('Returned', colDesc, y)
      pdf.text(fmt(data.returnedAmount), colAmt, y, { align: 'right' })
      y += 5
      pdf.text('Net Spend', colDesc, y)
      pdf.text(fmt(totalSpent - data.returnedAmount), colAmt, y, { align: 'right' })
      y += 5
    }

    y += 3
    drawLine(y)
    y += 8
  } else {
    // ── Total row ───────────────────────────────────────────────────────────
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('APPROVED AMOUNT', margin, y)
    pdf.text(fmt(data.approvedAmount), pageWidth - margin, y, { align: 'right' })
    y += 10

    drawLine(y)
    y += 8
  }

  // ── Signature Lines ───────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  const sigY = y + 10
  pdf.line(margin, sigY, margin + 60, sigY)
  pdf.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY)
  y = sigY + 4
  pdf.setFontSize(8)
  pdf.text('Cashier / Approver', margin, y)
  pdf.text('Recipient / Requester', pageWidth - margin - 60, y)

  // ── Footer ────────────────────────────────────────────────────────────────
  y += 12
  pdf.setFontSize(7)
  pdf.setTextColor(150, 150, 150)
  const now = new Date()
  pdf.text(`Printed ${fmtDate(now)} ${fmtTime(now)}`, pageWidth / 2, y, { align: 'center' })

  const fileName = `petty-cash-${data.requestId.slice(-8)}-${approvedDate.toISOString().split('T')[0]}.pdf`

  if (action === 'print') {
    pdf.autoPrint()
    window.open(pdf.output('bloburl'), '_blank')
  } else {
    pdf.save(fileName)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Payroll Cash Box Withdrawal Voucher
// Toner-friendly — no background fills, borders only.
// ─────────────────────────────────────────────────────────────────────────────

export interface PayrollFundingVoucherLine {
  businessName: string
  amount: number
}

export interface PayrollFundingVoucherData {
  voucherId: string
  issuedAt: string       // ISO string
  issuedBy: string
  totalAmount: number
  lines: PayrollFundingVoucherLine[]
}

export const generatePayrollFundingVoucher = (
  data: PayrollFundingVoucherData,
  action: 'save' | 'print' = 'save',
): void => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 15
  let y = margin

  const fmt = (n: number) => `$${n.toFixed(2)}`

  const drawLine = (yPos: number, light = false) => {
    pdf.setDrawColor(light ? 150 : 0, light ? 150 : 0, light ? 150 : 0)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
  }

  // ── Header ───────────────────────────────────────────────────────────────
  pdf.setFontSize(15)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text('PAYROLL CASH BOX WITHDRAWAL VOUCHER', pageWidth / 2, y, { align: 'center' })
  y += 7

  const issuedDate = new Date(data.issuedAt)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(
    `Date: ${fmtDate(issuedDate)}  |  Time: ${fmtTime(issuedDate)}  |  Issued by: ${stripEmoji(data.issuedBy)}`,
    pageWidth / 2, y, { align: 'center' }
  )
  y += 4

  pdf.setFontSize(8)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Voucher ID: ${data.voucherId}`, pageWidth / 2, y, { align: 'center' })
  pdf.setTextColor(0, 0, 0)
  y += 5
  drawLine(y)
  y += 6

  // ── Purpose ───────────────────────────────────────────────────────────────
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Purpose: Transfer cash from business cash boxes to fund payroll account.', margin, y)
  y += 4
  pdf.text('Cashier must physically collect the amounts below from each business cash box.', margin, y)
  y += 6
  drawLine(y)
  y += 6

  // ── Withdrawal Detail Table ───────────────────────────────────────────────
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('WITHDRAWALS BY BUSINESS', margin, y)
  y += 5

  const colBiz = margin
  const colSource = margin + 80
  const colAmt = pageWidth - margin

  // Table header
  pdf.setFontSize(8)
  pdf.text('Business', colBiz, y)
  pdf.text('Source', colSource, y)
  pdf.text('Amount', colAmt, y, { align: 'right' })
  y += 3
  drawLine(y)
  y += 4

  pdf.setFont('helvetica', 'normal')

  for (const line of data.lines) {
    if (y > 260) { pdf.addPage(); y = margin }

    let bizDisplay = stripEmoji(line.businessName)
    while (pdf.getTextWidth(bizDisplay) > 72 && bizDisplay.length > 5) {
      bizDisplay = bizDisplay.slice(0, -4) + '...'
    }
    pdf.text(bizDisplay, colBiz, y)
    pdf.text('Cash Box', colSource, y)
    pdf.text(fmt(line.amount), colAmt, y, { align: 'right' })
    y += 4

    drawLine(y, true)
    y += 3
  }

  y += 2
  pdf.setFont('helvetica', 'bold')
  pdf.text('TOTAL TO WITHDRAW', margin, y)
  pdf.text(fmt(data.totalAmount), pageWidth - margin, y, { align: 'right' })
  y += 10

  // ── Signature Lines ───────────────────────────────────────────────────────
  drawLine(y)
  y += 8

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  const sigY = y + 10
  pdf.line(margin, sigY, margin + 60, sigY)
  pdf.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY)
  y = sigY + 4
  pdf.setFontSize(8)
  pdf.text('Cashier Signature', margin, y)
  pdf.text('Authorised By', pageWidth - margin - 60, y)

  // ── Footer ────────────────────────────────────────────────────────────────
  y += 12
  pdf.setFontSize(7)
  pdf.setTextColor(150, 150, 150)
  const now = new Date()
  pdf.text(`Printed ${fmtDate(now)} ${fmtTime(now)}`, pageWidth / 2, y, { align: 'center' })

  const fileName = `payroll-withdrawal-${data.voucherId}-${issuedDate.toISOString().split('T')[0]}.pdf`

  if (action === 'print') {
    pdf.autoPrint()
    window.open(pdf.output('bloburl'), '_blank')
  } else {
    pdf.save(fileName)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per Diem Claim PDF — actual entries for a submitted period
// ─────────────────────────────────────────────────────────────────────────────

export interface PerDiemClaimEntry {
  date: string
  amount: number
  purpose: string
  notes?: string | null
  cashier?: { name: string } | null
}

export interface PerDiemClaimPDFData {
  employee: {
    fullName: string
    employeeNumber: string
    jobTitle?: string | null
    business?: { name: string } | null
  }
  period: { month: number; year: number }
  entries: PerDiemClaimEntry[]
  total: number
}

const MONTHS_CLAIM = ['January','February','March','April','May','June','July','August','September','October','November','December']

export const generatePerDiemClaimPDF = (
  data: PerDiemClaimPDFData,
  action: 'save' | 'print' = 'save',
): void => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 15
  let y = margin

  const fmt = (n: number) => `$${n.toFixed(2)}`
  const monthName = MONTHS_CLAIM[data.period.month - 1] ?? ''

  const drawLine = (yPos: number, light = false) => {
    pdf.setDrawColor(light ? 150 : 0, light ? 150 : 0, light ? 150 : 0)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
  }

  // ── Header ────────────────────────────────────────────────────────────────
  if (data.employee.business?.name) {
    pdf.setFontSize(13)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text(data.employee.business.name.toUpperCase(), pageWidth / 2, y, { align: 'center' })
    y += 6
  }

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text('PER DIEM CLAIM FORM', pageWidth / 2, y, { align: 'center' })
  y += 5

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(80, 80, 80)
  pdf.text(`${monthName} ${data.period.year}`, pageWidth / 2, y, { align: 'center' })
  y += 5

  drawLine(y)
  y += 6

  // ── Employee Info ─────────────────────────────────────────────────────────
  pdf.setFontSize(9)
  pdf.setTextColor(0, 0, 0)
  const col2 = pageWidth / 2 + 5

  const infoRow = (label: string, value: string, x: number, yPos: number) => {
    pdf.setFont('helvetica', 'bold')
    pdf.text(label, x, yPos)
    pdf.setFont('helvetica', 'normal')
    pdf.text(value, x + 30, yPos)
  }

  infoRow('Employee:', data.employee.fullName, margin, y)
  infoRow('Employee #:', data.employee.employeeNumber, col2, y)
  y += 5
  if (data.employee.jobTitle) {
    infoRow('Job Title:', data.employee.jobTitle, margin, y)
    y += 5
  }
  y += 2
  drawLine(y, true)
  y += 6

  // ── Entries Table ─────────────────────────────────────────────────────────
  const dateX    = margin
  const purposeX = margin + 28
  const amountX  = margin + 65
  const notesX   = margin + 85
  const cashierX = pageWidth - margin - 30

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(60, 60, 60)
  pdf.text('Date',       dateX,    y)
  pdf.text('Purpose',    purposeX, y)
  pdf.text('Amount',     amountX,  y, { align: 'right' })
  pdf.text('Notes',      notesX,   y)
  pdf.text('Entered by', cashierX, y)
  y += 2
  drawLine(y)
  y += 4

  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(0, 0, 0)
  const notesWidth = cashierX - notesX - 2

  data.entries.forEach(entry => {
    const dateStr = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    pdf.setFontSize(8)
    pdf.text(dateStr, dateX, y)
    pdf.text(entry.purpose, purposeX, y)
    pdf.text(fmt(entry.amount), amountX, y, { align: 'right' })
    pdf.text(pdf.splitTextToSize(entry.notes || '—', notesWidth)[0], notesX, y)
    pdf.text(entry.cashier?.name || '—', cashierX, y)
    y += 5
    drawLine(y, true)
    y += 3
  })

  y += 1
  drawLine(y)
  y += 5
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('TOTAL', margin, y)
  pdf.text(fmt(data.total), amountX, y, { align: 'right' })
  y += 3
  drawLine(y)
  y += 10

  // ── Signatures ────────────────────────────────────────────────────────────
  ;[{ label: 'Employee Signature' }, { label: 'Cashier Signature' }, { label: 'Approved by' }].forEach(({ label }) => {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(80, 80, 80)
    pdf.text(label, margin, y)
    pdf.text('Date', col2, y)
    y += 6
    pdf.setDrawColor(100, 100, 100)
    pdf.line(margin, y, margin + 70, y)
    pdf.line(col2, y, col2 + 50, y)
    y += 8
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  pdf.setFontSize(7)
  pdf.setTextColor(150, 150, 150)
  pdf.text(`Printed ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' })

  const fileName = `per-diem-claim-${data.employee.employeeNumber}-${monthName}-${data.period.year}.pdf`
  if (action === 'print') {
    pdf.autoPrint()
    window.open(pdf.output('bloburl'), '_blank')
  } else {
    pdf.save(fileName)
  }
}
