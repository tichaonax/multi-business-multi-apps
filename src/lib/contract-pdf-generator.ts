import jsPDF from 'jspdf'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'

// PDF Layout Constants
const PDF_CONSTANTS = {
  // Page layout
  MARGIN: 20,
  INDENT: 10,

  // Font sizes
  FONT_SIZE: {
    TITLE: 16,
    SUBTITLE: 14,
    SECTION_HEADER: 12,
    SUBSECTION_HEADER: 11,
    NORMAL: 10,
    SMALL: 9
  },

  // Line spacing
  LINE_SPACING: {
    TIGHT: 4,
    NORMAL: 5,
    RELAXED: 6,
    PARAGRAPH: 8,
    SECTION: 15
  },

  // Section spacing
  SECTION_SPACING: {
    HEADER: 10,
    BETWEEN_SECTIONS: 12,
    BETWEEN_SUBSECTIONS: 8,
    AFTER_TITLE: 5,
    AFTER_CONTACT_INFO: 8,
    SALUTATION: 10,
    CONTRACT_SECTIONS: 8,
    AFTER_SECTION_HEADER: 4
  },

  // Page break thresholds
  PAGE_BREAK: {
    HEADER: 40,
    PARTIES: 60,
    JOB_SECTION: 25,
    GENERAL: 15,
    LARGE_SECTION: 45
  }
}

interface ContractData {
  date: string
  employeeName: string
  employeeAddress?: string
  employeeAddressLine2?: string
  employeeIdNumber?: string
  employeeNumber?: string
  nationalId?: string
  driverLicenseNumber?: string
  employeePhone?: string
  employeeEmail?: string
  jobTitle: string
  contractDuration?: string
  contractStartDate: string
  contractEndDate?: string
  basicSalary: number
  livingAllowance?: number
  commission?: number
  compensationType?: string
  isCommissionBased?: boolean
  isSalaryBased?: boolean
  benefits?: Array<{
    name: string
    amount: number
    isPercentage: boolean
    type: string
    notes?: string
  }>
  specialDuties?: string
  responsibilities?: string[]
  customResponsibilities?: string
  businessName: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
  businessRegistrationNumber?: string
  businessType?: string
  supervisorName?: string
  supervisorTitle?: string
  leaveAccrualRate?: number
  probationPeriodMonths?: number
  department?: string
  contractNumber?: string
  version?: number
  notes?: string
  isCopy?: boolean
  copyNote?: string
  // Umbrella business fields
  umbrellaBusinessName?: string
  umbrellaBusinessAddress?: string
  umbrellaBusinessPhone?: string
  umbrellaBusinessEmail?: string
  umbrellaBusinessRegistration?: string
  businessAssignments?: Array<{
    businessId: string
    businessName: string
    businessType: string
    isPrimary: boolean
    role?: string
    startDate?: string
  }>
  // Renewal tracking fields
  isRenewal?: boolean
  renewalCount?: number
  renewalNote?: string
  originalContractNumber?: string
}

// New comprehensive function combining ContractTemplate format with legal language
export function generateComprehensiveContract(data: ContractData): jsPDF {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.width
  const margin = PDF_CONSTANTS.MARGIN
  let yPosition = margin + 10

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const addText = (text: string, x: number, y: number, options: any = {}) => {
    if (options.bold) {
      pdf.setFont('helvetica', 'bold')
    } else {
      pdf.setFont('helvetica', 'normal')
    }
    if (options.size) {
      pdf.setFontSize(options.size)
    } else {
      pdf.setFontSize(PDF_CONSTANTS.FONT_SIZE.NORMAL)
    }
    
    if (options.maxWidth) {
      const splitText = pdf.splitTextToSize(text, options.maxWidth)
      pdf.text(splitText, x, y, options.align ? { align: options.align } : {})
      return splitText.length * (options.lineHeight || PDF_CONSTANTS.LINE_SPACING.TIGHT)
    } else {
      pdf.text(text, x, y, options.align ? { align: options.align } : {})
      return options.lineHeight || PDF_CONSTANTS.LINE_SPACING.PARAGRAPH
    }
  }

  const addHeader = () => {
    const headerY = 10

    // Only add header for copy/reprint contracts
    if (data.isCopy && data.contractNumber) {
      // Save current font settings
      const currentFont = pdf.getFont()
      const currentFontSize = pdf.getFontSize()

      // Set header font
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(PDF_CONSTANTS.FONT_SIZE.SMALL)

      // Center: Copy contract information
      const headerText = `Employment Contract - ${data.contractNumber} *****COPY****`
      const centerX = (pageWidth - pdf.getTextWidth(headerText)) / 2
      pdf.text(headerText, centerX, headerY)

      // Restore original font settings
      pdf.setFont(currentFont.fontName, currentFont.fontStyle)
      pdf.setFontSize(currentFontSize)
    }
  }

  const addFooter = () => {
    const footerY = pdf.internal.pageSize.height - 15
    const currentPageNum = pdf.getCurrentPageInfo().pageNumber
    const totalPages = pdf.getNumberOfPages()

    // Save current font settings
    const currentFont = pdf.getFont()
    const currentFontSize = pdf.getFontSize()

    // Set footer font
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(PDF_CONSTANTS.FONT_SIZE.SMALL)

    // Left side: Contract number only (shortened to save space)
    const leftText = `${data.contractNumber || 'DRAFT'}`
    const leftTextWidth = pdf.getTextWidth(leftText)
    pdf.text(leftText, margin, footerY)

    // Right side: Page number
    const rightText = `Page ${currentPageNum} of ${totalPages}`
    const rightTextWidth = pdf.getTextWidth(rightText)
    const rightX = pageWidth - margin - rightTextWidth
    pdf.text(rightText, rightX, footerY)

    // Center: Employee name with ==RENEWED== marker if applicable
    // Calculate available space between left and right text
    let centerText = `${data.employeeName}`
    if (data.isRenewal) {
      centerText += ` ==RENEWED==`
      if (data.renewalCount && data.renewalCount > 0) {
        centerText += ` (#${data.renewalCount})`
      }
    }

    const centerTextWidth = pdf.getTextWidth(centerText)
    const leftEdge = margin + leftTextWidth + 5 // 5 units padding
    const rightEdge = rightX - 5 // 5 units padding
    const availableWidth = rightEdge - leftEdge

    // Calculate center position, but ensure it doesn't overlap
    let centerX = (pageWidth - centerTextWidth) / 2

    // If center position would overlap with left text, move it right
    if (centerX < leftEdge) {
      centerX = leftEdge
    }

    // If text would overflow into right side, truncate or move left
    if (centerX + centerTextWidth > rightEdge) {
      centerX = Math.max(leftEdge, rightEdge - centerTextWidth)
    }

    pdf.text(centerText, centerX, footerY)

    // Restore original font settings
    pdf.setFont(currentFont.fontName, currentFont.fontStyle)
    pdf.setFontSize(currentFontSize)
  }

  const checkPageBreak = (requiredSpace: number = PDF_CONSTANTS.PAGE_BREAK.GENERAL) => {
    if (yPosition + requiredSpace > pdf.internal.pageSize.height - margin - 20) { // Account for footer space
      pdf.addPage()
      yPosition = data.isCopy ? margin + 15 : margin // Account for header space on copy pages
      addHeader() // Add header to new page
      addFooter() // Add footer to new page
    }
  }

  // HEADER SECTION (Contract Template format)
  checkPageBreak(PDF_CONSTANTS.PAGE_BREAK.HEADER)

  // Show umbrella business name at the top if available
  if (data.umbrellaBusinessName) {
    yPosition += addText(data.umbrellaBusinessName.toUpperCase(), pageWidth / 2, yPosition, {
      bold: true,
      size: PDF_CONSTANTS.FONT_SIZE.TITLE + 2,
      align: 'center'
    })
    yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_TITLE / 2

    // Add separator line
    pdf.setLineWidth(0.5)
    pdf.line(margin + 30, yPosition, pageWidth - margin - 30, yPosition)
    yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_TITLE / 2 + 10 // Extra space after separator line
  }

  // Show primary business name (smaller, under umbrella)
  yPosition += addText(data.businessName, pageWidth / 2, yPosition, {
    bold: true,
    size: data.umbrellaBusinessName ? PDF_CONSTANTS.FONT_SIZE.SUBTITLE : PDF_CONSTANTS.FONT_SIZE.TITLE,
    align: 'center'
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_TITLE
  const contractTitle = 'CONTRACT OF EMPLOYMENT'
  yPosition += addText(contractTitle, pageWidth / 2, yPosition, {
    bold: true,
    size: PDF_CONSTANTS.FONT_SIZE.SUBTITLE,
    align: 'center'
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.HEADER - 5 // Reduced spacing after CONTRACT OF EMPLOYMENT

  // Add COPY watermark if this is a copy
  if (data.isCopy) {
    yPosition += addText('*** COPY - REPRINT OF ORIGINAL CONTRACT ***', pageWidth / 2, yPosition, {
      bold: true,
      size: PDF_CONSTANTS.FONT_SIZE.SECTION_HEADER,
      align: 'center'
    })
    yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS
  }

  // Contract metadata
  if (data.contractNumber) {
    yPosition += addText(`Contract Number: ${data.contractNumber}`, pageWidth / 2, yPosition, {
      size: PDF_CONSTANTS.FONT_SIZE.NORMAL,
      align: 'center'
    })
  }
  if (data.version) {
    yPosition += addText(`Version: ${data.version}`, pageWidth / 2, yPosition, {
      size: PDF_CONSTANTS.FONT_SIZE.NORMAL,
      align: 'center'
    })
  }
  yPosition += addText(`Date: ${currentDate}`, pageWidth / 2, yPosition, {
    size: PDF_CONSTANTS.FONT_SIZE.NORMAL,
    align: 'center'
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.HEADER

  // PARTIES TO THE CONTRACT
  checkPageBreak(PDF_CONSTANTS.PAGE_BREAK.PARTIES)
  yPosition += addText('PARTIES TO THE CONTRACT', margin, yPosition, {
    bold: true,
    size: PDF_CONSTANTS.FONT_SIZE.SECTION_HEADER
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS

  // Employer section
  yPosition += addText('EMPLOYER:', margin, yPosition, {
    bold: true,
    size: PDF_CONSTANTS.FONT_SIZE.SUBSECTION_HEADER
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_TITLE

  // Show umbrella business as main employer if available
  if (data.umbrellaBusinessName) {
    yPosition += addText(data.umbrellaBusinessName, margin + PDF_CONSTANTS.INDENT, yPosition, {
      bold: true,
      size: PDF_CONSTANTS.FONT_SIZE.NORMAL
    })
    yPosition += addText(`(Operating through: ${data.businessName})`, margin + PDF_CONSTANTS.INDENT, yPosition, {
      size: PDF_CONSTANTS.FONT_SIZE.NORMAL
    })

    // Use umbrella business contact details
    if (data.umbrellaBusinessAddress) {
      yPosition += addText(`Address: ${data.umbrellaBusinessAddress}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
    }
    if (data.umbrellaBusinessPhone) {
      yPosition += addText(`Phone: ${formatPhoneNumberForDisplay(data.umbrellaBusinessPhone)}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
    }
    if (data.umbrellaBusinessEmail) {
      yPosition += addText(`Email: ${data.umbrellaBusinessEmail}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
    }
    if (data.umbrellaBusinessRegistration) {
      yPosition += addText(`Registration Number: ${data.umbrellaBusinessRegistration}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
    }
  } else {
    yPosition += addText(data.businessName, margin + PDF_CONSTANTS.INDENT, yPosition, {
      bold: true,
      size: PDF_CONSTANTS.FONT_SIZE.NORMAL
    })

    // Fall back to individual business contact details
    if (data.businessType) {
      yPosition += addText(`Business Type: ${data.businessType.charAt(0).toUpperCase() + data.businessType.slice(1)}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
    }
    if (data.businessAddress) {
      yPosition += addText(`Address: ${data.businessAddress}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
    }
    if (data.businessPhone) {
      yPosition += addText(`Phone: ${formatPhoneNumberForDisplay(data.businessPhone)}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
    }
    if (data.businessEmail) {
      yPosition += addText(`Email: ${data.businessEmail}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
    }
    if (data.businessRegistrationNumber) {
      yPosition += addText(`Registration Number: ${data.businessRegistrationNumber}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
    }
  }
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_CONTACT_INFO

  // Employee section
  yPosition += addText('EMPLOYEE:', margin, yPosition, {
    bold: true,
    size: PDF_CONSTANTS.FONT_SIZE.SUBSECTION_HEADER
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_TITLE
  // Use the flattened data structure
  const employeeName = data.employeeName
  const employeeNumber = (data as any).employeeNumber
  const nationalId = (data as any).nationalId
  const driverLicenseNumber = (data as any).driverLicenseNumber
  const employeeAddress = data.employeeAddress
  const employeePhone = data.employeePhone
  const employeeEmail = data.employeeEmail

  yPosition += addText(employeeName, margin + PDF_CONSTANTS.INDENT, yPosition, {
    bold: true,
    size: PDF_CONSTANTS.FONT_SIZE.NORMAL
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_TITLE
  if (employeeNumber) {
    yPosition += addText(`Employee Number: ${employeeNumber}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  }
  if (nationalId) {
    yPosition += addText(`National ID: ${nationalId}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  }
  if (employeeAddress) {
    yPosition += addText(`Address: ${employeeAddress}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  }
  if (employeePhone) {
    yPosition += addText(`Phone: ${formatPhoneNumberForDisplay(employeePhone)}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  }
  if (employeeEmail) {
    yPosition += addText(`Email: ${employeeEmail}`, margin + PDF_CONSTANTS.INDENT, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  }
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS
  if (data.employeeAddressLine2) {
    yPosition += addText(data.employeeAddressLine2, margin, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
    yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS
  }

  // Business Assignments section (if available)
  if (data.businessAssignments && data.businessAssignments.length > 0) {
    checkPageBreak(PDF_CONSTANTS.PAGE_BREAK.JOB_SECTION)
    yPosition += addText('BUSINESS ASSIGNMENTS:', margin, yPosition, {
      bold: true,
      size: PDF_CONSTANTS.FONT_SIZE.SUBSECTION_HEADER
    })
    yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_TITLE

    // Show primary business assignment first
    const primaryAssignment = data.businessAssignments.find(b => b.isPrimary)
    if (primaryAssignment) {
      yPosition += addText(`Primary Assignment: ${primaryAssignment.businessName}`, margin + PDF_CONSTANTS.INDENT, yPosition, {
        bold: true,
        size: PDF_CONSTANTS.FONT_SIZE.NORMAL
      })
      if (primaryAssignment.businessType) {
        yPosition += addText(`Type: ${primaryAssignment.businessType.charAt(0).toUpperCase() + primaryAssignment.businessType.slice(1)}`, margin + PDF_CONSTANTS.INDENT * 2, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
      }
      if (primaryAssignment.role) {
        yPosition += addText(`Role: ${primaryAssignment.role}`, margin + PDF_CONSTANTS.INDENT * 2, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
      }
    }

    // Show secondary business assignments
    const secondaryAssignments = data.businessAssignments.filter(b => !b.isPrimary)
    if (secondaryAssignments.length > 0) {
      // Force new page for additional assignments
      pdf.addPage()
      yPosition = margin + PDF_CONSTANTS.SECTION_SPACING.AFTER_TITLE

      yPosition += addText('Additional Assignments:', margin + PDF_CONSTANTS.INDENT, yPosition, {
        bold: true,
        size: PDF_CONSTANTS.FONT_SIZE.NORMAL
      })
      secondaryAssignments.forEach((assignment, index) => {
        yPosition += addText(`${index + 1}. ${assignment.businessName}`, margin + PDF_CONSTANTS.INDENT * 2, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
        if (assignment.businessType) {
          yPosition += addText(`   Type: ${assignment.businessType.charAt(0).toUpperCase() + assignment.businessType.slice(1)}`, margin + PDF_CONSTANTS.INDENT * 2, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
        }
        if (assignment.role) {
          yPosition += addText(`   Role: ${assignment.role}`, margin + PDF_CONSTANTS.INDENT * 2, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
        }
      })
    }
    yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS
  }

  // Check for page break before salutation
  checkPageBreak(35)

  // Salutation
  yPosition += addText(`Dear ${employeeName},`, margin, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.SALUTATION

  // Re: CONTRACT OF EMPLOYMENT (Bold)
  yPosition += addText('Re: CONTRACT OF EMPLOYMENT', margin, yPosition, {
    bold: true,
    size: PDF_CONSTANTS.FONT_SIZE.SECTION_HEADER
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.CONTRACT_SECTIONS

  // Opening paragraph
  const openingText = 'We have pleasure to offer you a new role within the company. The terms and conditions are as outlined below.'
  yPosition += addText(openingText, margin, yPosition, {
    maxWidth: pageWidth - 2 * margin,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.CONTRACT_SECTIONS

  // NOW THEREFORE (Bold)
  yPosition += addText('NOW THEREFORE IT IS HEREBY AGREED AS FOLLOWS:', margin, yPosition, {
    bold: true,
    size: PDF_CONSTANTS.FONT_SIZE.SUBSECTION_HEADER
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS

  // 1. JOB TITLE
  checkPageBreak(PDF_CONSTANTS.PAGE_BREAK.JOB_SECTION)
  yPosition += addText('1.    JOB TITLE', margin, yPosition, { bold: true, size: PDF_CONSTANTS.FONT_SIZE.SUBSECTION_HEADER })
  yPosition += PDF_CONSTANTS.LINE_SPACING.TIGHT
  const jobTitleText = `Your position will be ${data.jobTitle} at ${data.businessName}. You will report to the manager or any delegated official, whom you will be under direct supervision and answerable to.`
  yPosition += addText(jobTitleText, margin, yPosition, {
    maxWidth: pageWidth - 2 * margin,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.HEADER

  // 2. JOB DESCRIPTION
  checkPageBreak(40)
  yPosition += addText('2.    JOB DESCRIPTION', margin, yPosition, { bold: true, size: 11 })
  yPosition += 4
  yPosition += addText('2.1    You shall perform such duties as defined in the job description and in accordance with the standards of performance set out and agreed to with your immediate supervisor. This will be signed separately.', margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  const jobDesc2Text = `2.2    Nothing contained in this clause shall preclude ${data.businessName} from assigning you and/or transferring you from time to time to such other duties and responsibilities appropriate to your qualifications and experience without changing the essential character of this contract.`
  yPosition += addText(jobDesc2Text, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 15

  // Special duties section if provided
  if (data.specialDuties) {
    checkPageBreak(20)
    yPosition += addText('2.3    SPECIAL DUTIES AND RESPONSIBILITIES:', margin, yPosition, { bold: true, size: 10 })
    yPosition += 4
    yPosition += addText(data.specialDuties, margin + 10, yPosition, { 
      maxWidth: pageWidth - 2 * margin - 10,
      lineHeight: 5
    })
    yPosition += 15
  }
  // 2.4 KEY RESPONSIBILITIES
  checkPageBreak(30)
  yPosition += addText('2.4 KEY RESPONSIBILITIES', margin, yPosition, { bold: true, size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_SECTION_HEADER
  
  if (data.responsibilities && data.responsibilities.length > 0) {
    yPosition += addText('Standard Responsibilities:', margin, yPosition, {
      bold: true,
      size: PDF_CONSTANTS.FONT_SIZE.NORMAL,
      lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
    })
    data.responsibilities.forEach(responsibility => {
      yPosition += addText(`• ${responsibility}`, margin + PDF_CONSTANTS.INDENT, yPosition, {
        size: PDF_CONSTANTS.FONT_SIZE.NORMAL,
        lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
      })
    })
    yPosition += PDF_CONSTANTS.LINE_SPACING.TIGHT
  }
  
  if (data.customResponsibilities) {
    yPosition += addText('Additional Responsibilities:', margin, yPosition, { bold: true, size: 10 })
    yPosition += 4
    yPosition += addText(data.customResponsibilities, margin + 10, yPosition, { 
      maxWidth: pageWidth - 2 * margin - 10,
      lineHeight: 5
    })
    yPosition += 8
  }

  // 2.5 EMPLOYMENT DETAILS
  checkPageBreak(40)
  yPosition += addText('2.5 EMPLOYMENT DETAILS', margin, yPosition, { bold: true, size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_SECTION_HEADER
  
  // Helper function to add label:value pairs with bold labels
  const addLabelValue = (label: string, value: string) => {
    // Set bold font and measure label width
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(PDF_CONSTANTS.FONT_SIZE.NORMAL)
    const labelWidth = pdf.getTextWidth(label + ': ')

    // Add bold label
    pdf.text(label + ':', margin, yPosition)

    // Add normal value
    pdf.setFont('helvetica', 'normal')
    pdf.text(value, margin + labelWidth, yPosition)

    yPosition += PDF_CONSTANTS.LINE_SPACING.NORMAL
  }

  // Add employment details with bold labels
  addLabelValue('Position', data.jobTitle)

  if (data.department) {
    addLabelValue('Department', data.department)
  }

  addLabelValue('Start Date', data.contractStartDate)

  // Enhanced salary display with compensation type information
  let salaryText = `$${data.basicSalary}`
  if (data.compensationType) {
    // Check if compensation type indicates frequency
    const lowerCompType = data.compensationType.toLowerCase()
    if (lowerCompType.includes('monthly') || lowerCompType.includes('salary')) {
      salaryText += ' per month'
    } else if (lowerCompType.includes('annually') || lowerCompType.includes('annual')) {
      salaryText += ' per annum'
    } else if (lowerCompType.includes('hourly')) {
      salaryText += ' per hour'
    } else {
      salaryText += ' per month' // default to monthly
    }

    // Add compensation type details
    if (lowerCompType.includes('commission')) {
      salaryText += ` (${data.compensationType})`
    }
  } else {
    salaryText += ' per month' // default fallback
  }

  addLabelValue('Base Salary', salaryText)

  if (data.compensationType && !data.compensationType.toLowerCase().includes('salary') && !data.compensationType.toLowerCase().includes('monthly')) {
    addLabelValue('Compensation Type', data.compensationType)
  }

  if (data.probationPeriodMonths) {
    addLabelValue('Probation Period', `${data.probationPeriodMonths} months`)
  }

  if (data.supervisorName) {
    addLabelValue('Supervisor', `${data.supervisorName} (${data.supervisorTitle || 'Manager'})`)
  }
  
  yPosition += 8  // 2.6 COMPENSATION & BENEFITS
  checkPageBreak(60)
  yPosition += addText('2.6 COMPENSATION & BENEFITS', margin, yPosition, { bold: true, size: PDF_CONSTANTS.FONT_SIZE.SUBSECTION_HEADER })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_SECTION_HEADER

  // 2.6.1 Salary
  yPosition += addText('2.6.1 Salary:', margin, yPosition, { bold: true, size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_SECTION_HEADER
  yPosition += addText(`Base salary of $${data.basicSalary} per month.`, margin + 10, yPosition, { size: 10 })
  yPosition += 8

  // 2.6.2 Benefits (if any)
  if (data.benefits && data.benefits.length > 0) {
    yPosition += addText('2.6.2 Benefits:', margin, yPosition, { bold: true, size: 10 })
    yPosition += 4
    
    data.benefits.forEach((benefit, index) => {
      const benefitText = benefit.isPercentage
        ? `2.6.2.${index + 1} ${benefit.name}: ${benefit.amount}%`
        : `2.6.2.${index + 1} ${benefit.name}: $${benefit.amount}`
      yPosition += addText(benefitText, margin + 10, yPosition, { size: 10 })
      yPosition += 4
    })
    yPosition += 4
  }

  yPosition += 15

  // TERMS AND CONDITIONS
  checkPageBreak(30)
  yPosition += addText('TERMS AND CONDITIONS', margin, yPosition, { bold: true, size: 12 })
  yPosition += 10  // 3. DURATION OF THE CONTRACT
  checkPageBreak(30)
  yPosition += addText('3.    DURATION OF THE CONTRACT', margin, yPosition, { bold: true, size: PDF_CONSTANTS.FONT_SIZE.SUBSECTION_HEADER })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_SECTION_HEADER
  const durationText = `3.1    You shall serve ${data.businessName} on a ${data.contractDuration} renewable contract commencing ${data.contractStartDate}`
  yPosition += addText(durationText, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  const balancedScoreText = `3.2    ${data.businessName} uses the Balanced Scorecard Performance Management System which is the basis upon which terms of employment contract are determined. However, NEC relevant to our industry rates take precedence.`
  yPosition += addText(balancedScoreText, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 15


  // 4. OFFICE HOURS
  checkPageBreak(20)
  yPosition += addText('4.    OFFICE HOURS', margin, yPosition, { bold: true, size: PDF_CONSTANTS.FONT_SIZE.SUBSECTION_HEADER })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_SECTION_HEADER
  yPosition += addText('4.1    Ordinarily your working hours are 8.5 hours for 26 days in a month. However, due to the position and nature of the commercial/hospitality business, you may be expected to work beyond these times when necessary.', margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 15

  // 5. NSSA, ZIMRA
  checkPageBreak(40)
  yPosition += addText('5.    NSSA, ZIMRA', margin, yPosition, { bold: true, size: 11 })
  yPosition += 4
  yPosition += addText('5.1    Membership to NSSA will be in accordance with statutory requirements.', margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  yPosition += addText('5.2    Applicable tax will be deducted from your salary and remitted to Zimra as per statutes', margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 15

  // 6. VACATION LEAVE
  checkPageBreak(20)
  yPosition += addText('6.    VACATION LEAVE', margin, yPosition, { bold: true, size: 11 })
  yPosition += 4
  const leaveRate = data.leaveAccrualRate || 2.5
  yPosition += addText(`6.1    You accrue ${leaveRate} days leave days per month (this includes weekends and public holidays).`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 15

  // 7. DUTY OF CARE AND CONFIDENTIALITY
  checkPageBreak(PDF_CONSTANTS.PAGE_BREAK.LARGE_SECTION)
  yPosition += addText('7.    DUTY OF CARE AND CONFIDENTIALITY', margin, yPosition, {
    bold: true,
    size: PDF_CONSTANTS.FONT_SIZE.SUBSECTION_HEADER
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_SECTION_HEADER
  yPosition += addText(`7.1    All work conducted by ${data.businessName} is confidential. Under no circumstances may information be divulged to persons inside or outside the organization concerning office matters, business issues, salaries or conditions of service, or customer (guest or punter) information. Any breach of confidentiality will result in disciplinary action being taken against you.`, margin, yPosition, {
    maxWidth: pageWidth - 2 * margin,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.CONTRACT_SECTIONS
  yPosition += addText(`7.2    You shall exercise all reasonable care and diligence in the performance of your duties in accordance with the ${data.businessName} Human Resources procedures, policies and regulations and Code of Conduct that is, Statutory Instrument 15 of 2006 or it's any subsequent amendments thereof which l have read and understood.`, margin, yPosition, {
    maxWidth: pageWidth - 2 * margin,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.CONTRACT_SECTIONS
  yPosition += addText(`7.3    You shall not, during the term of this contract or thereafter, without consent of the ${data.businessName}, disclose any matter concerning the ${data.businessName} business which came to your knowledge in the course of or incidental to your being employed by the ${data.businessName} except so far as may be necessary and proper for the conduct of ${data.businessName} business and in accordance with the Human Resources procedures, regulations and policies Code of Conduct that is Statutory Instrument 15 of 2006 or its subsequent amendments thereof.`, margin, yPosition, {
    maxWidth: pageWidth - 2 * margin,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS

  // 8. COMMUNICATION, TEAMWORK AND PERFORMANCE
  checkPageBreak(30)
  yPosition += addText('8.    COMMUNICATION, TEAMWORK AND PERFORMANCE', margin, yPosition, { bold: true, size: 11 })
  yPosition += 4
  yPosition += addText(`8.1    It is essential that you develop an understanding of ${data.businessName} issues. ${data.businessName} expects a high standard of commitment from you. Communication and teamwork are very important, and ${data.businessName} expects you to make your contribution and play your part in ensuring the success of the organisation. It is essential for you to take ownership of assignments, to achieve quality standards and to meet deadlines. There is a formal performance management system which you are required to implement for your team.`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 15

  // 9. INTEGRITY, EFFICIENCY, PASSION AND EXCELLENCE
  checkPageBreak(80)
  yPosition += addText('9.    INTEGRITY, EFFICIENCY, PASSION AND EXCELLENCE', margin, yPosition, { bold: true, size: 11 })
  yPosition += 4
  yPosition += addText(`9.1    You shall conform to the highest standards as set out in the ${data.businessName} Human Resources regulations and procedures, Code of Conduct and Policies.`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  yPosition += addText(`9.2    ${data.businessName} expects that the conduct of its entire staff with customers (guests and punters), business contacts, and members of the public and with superiors, colleagues and subordinates, will foster its image as one that has a commitment to its core values and integrity.`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  yPosition += addText(`9.3    ${data.businessName} expects you to adhere to and uphold the organisation's core values, and you may be subjected to security vetting during the subsistence of your contract. Your contract will be terminated in the event of you failing the vetting process and ${data.businessName} shall not be under any obligation to give reasons for your failure.`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  yPosition += addText('9.4    All disciplinary and grievance issues will be dealt with in terms of the Employment Code of Conduct and Grievance Procedures that apply to every employee that is Statutory Instrument 15 of 2006 or its subsequent amendments.', margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 15

  // Check if we need a page break for remaining sections
  checkPageBreak(PDF_CONSTANTS.PAGE_BREAK.LARGE_SECTION)

  // 10. CONFLICT OF INTEREST
  yPosition += addText('10.    CONFLICT OF INTEREST', margin, yPosition, { bold: true, size: 11 })
  yPosition += 4
  yPosition += addText(`10.1    You are required to devote your attention at work to the affairs of ${data.businessName}. You shall not be involved, either directly or indirectly, during or outside business hours in any business interests and/or private work that is adverse to, prejudicial to or competing with the interests of ${data.businessName}.`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  yPosition += addText(`10.2    Any business interests and/or private work must be declared at commencement of this appointment, and approval for any subsequent outside business interests and/or private work must be obtained from ${data.businessName} through your superior.`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  yPosition += addText(`10.3    Reasonable requests to carryout private work will not be refused, provided that there is no conflict of interest with ${data.businessName}' work and use of ${data.businessName} resources and facilities is not acceptable. The private work and outside interests must not have a negative effect on the ${data.businessName}'s image and reputation and your ability to perform your duties.`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 15

  // 11. CUSTOMER SERVICE
  checkPageBreak(40)
  yPosition += addText('11.    CUSTOMER SERVICE', margin, yPosition, { bold: true, size: 11 })
  yPosition += 4
  yPosition += addText(`11.1    This is a significant focus for ${data.businessName}, and it is important that all staff demonstrate commitment to customer service. This includes providing high quality service, being responsive to customer queries, requests, complaints and problems. It also includes promoting the image of ${data.businessName}.`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  yPosition += addText('11.2    It is important to ensure that you establish a culture with internal staff which is based on a commitment to performance, and which demonstrates responsiveness, willingness to help, compliance with procedures, a sense of urgency, attention to detail and maintaining effective relationships.', margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 15


  // 12. TERMINATION OF THE CONTRACT
  checkPageBreak(30)
  yPosition += addText('12.    TERMINATION OF THE CONTRACT', margin, yPosition, { bold: true, size: 11 })
  yPosition += 4
  yPosition += addText(`12.1    ${data.businessName} may at any time during the period of contract terminate your contract for misconduct, misbehaviour, non-performance in terms of your scorecard, inability to perform the functions of your office or any other reasonable cause determined by ${data.businessName}.`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  yPosition += addText('12.2    Either party may terminate the contract by giving one month\'s notice in writing or paying to either party one month\'s salary in lieu of notices.', margin, yPosition, {
    maxWidth: pageWidth - 2 * margin,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS

  // 13. CANCELLATION FOR MISREPRESENTATION/NON-DISCLOSURE
  checkPageBreak(20)
  yPosition += addText('13.    CANCELLATION FOR MISREPRESENTATION/NON-DISCLOSURE', margin, yPosition, { bold: true, size: 11 })
  yPosition += 4
  yPosition += addText(`13.1    ${data.businessName} shall summarily terminate this contract for misrepresentation or non-disclosure in the event of your failure to disclose material facts which you had an obligation to disclose prior to the signing of this contract, which material facts have a bearing on the subsistence of the contract.`, margin, yPosition, {
    maxWidth: pageWidth - 2 * margin,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS

  // 14. GENERAL CONDUCT
  checkPageBreak(30)
  yPosition += addText('14.    GENERAL CONDUCT', margin, yPosition, { bold: true, size: 11 })
  yPosition += 4
  yPosition += addText(`14.1    You shall conduct yourself in a manner which is not detrimental to ${data.businessName} and shall have an acceptable behaviour which does not tarnish the image of the ${data.businessName}.`, margin, yPosition, { 
    maxWidth: pageWidth - 2 * margin,
    lineHeight: 5
  })
  yPosition += 4
  yPosition += addText(`14.2    You shall abide by the laws of the land and respect leadership of ${data.businessName} and shall at all times adhere to all the Procedures and Regulations of ${data.businessName} as embodied in the Employee Manual.`, margin, yPosition, {
    maxWidth: pageWidth - 2 * margin,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS

  // Signature section
  checkPageBreak(60)
  yPosition += addText(`For and on behalf of ${data.businessName}`, margin, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS
  yPosition += addText('________________________', margin, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS
  const signerTitle = data.supervisorTitle || 'General Manager'
  yPosition += addText(signerTitle, margin, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS

  // ACCEPTANCE section
  yPosition += addText('ACCEPTANCE', margin, yPosition, { bold: true, size: PDF_CONSTANTS.FONT_SIZE.SECTION_HEADER })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_SECTION_HEADER
  yPosition += addText('I, ________________________________________________, accept/decline the terms and conditions of employment as set out in this document.', margin, yPosition, {
    maxWidth: pageWidth - 2 * margin,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS
  yPosition += addText('Signature: ______________________________        Date: ________________________', margin, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  yPosition += PDF_CONSTANTS.LINE_SPACING.NORMAL
  const idNumber = data.employeeIdNumber || '_____________________________'
  yPosition += addText(`ID Number: ${idNumber}`, margin, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  yPosition += PDF_CONSTANTS.LINE_SPACING.NORMAL
  const phoneNumber = data.employeePhone ? formatPhoneNumberForDisplay(data.employeePhone) : '_____________________________'
  yPosition += addText(`Cell Phone: ${phoneNumber}`, margin, yPosition, { size: PDF_CONSTANTS.FONT_SIZE.NORMAL })
  yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS

  // SPECIAL CONDITIONS (if any)
  if (data.notes && data.notes.trim()) {
    checkPageBreak(50)
    yPosition += addText('SPECIAL CONDITIONS', margin, yPosition, { bold: true, size: PDF_CONSTANTS.FONT_SIZE.SUBSECTION_HEADER })
    yPosition += PDF_CONSTANTS.SECTION_SPACING.AFTER_SECTION_HEADER
    yPosition += addText(data.notes.trim(), margin, yPosition, {
      maxWidth: pageWidth - 2 * margin,
      lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
    })
    yPosition += PDF_CONSTANTS.SECTION_SPACING.BETWEEN_SUBSECTIONS
  }

  // Contract governance and generation information (last content before footer)
  yPosition += addText('This contract is governed by the laws of the jurisdiction in which the business operates.', margin, yPosition, {
    size: PDF_CONSTANTS.FONT_SIZE.NORMAL,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })

  const generationDate = new Date().toLocaleDateString('en-GB') // Format as DD/MM/YYYY
  yPosition += addText(`Contract generated on ${generationDate}`, margin, yPosition, {
    size: PDF_CONSTANTS.FONT_SIZE.NORMAL,
    lineHeight: PDF_CONSTANTS.LINE_SPACING.NORMAL
  })

  // Add headers and footers to all pages
  const totalPages = pdf.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    addHeader()
    addFooter()
  }

  return pdf
}

export function downloadContractPDF(data: ContractData, filename?: string) {
  const pdf = generateComprehensiveContract(data)
  const fileName = filename || `${data.employeeName.replace(/\s+/g, '_')}_Contract.pdf`
  pdf.save(fileName)
}

export function previewContractPDF(data: ContractData): string {
  const pdf = generateComprehensiveContract(data)
  const pdfBlob = pdf.output('blob')
  return URL.createObjectURL(pdfBlob)
}

export function downloadComprehensiveContractPDF(data: ContractData, filename?: string) {
  const pdf = generateComprehensiveContract(data)
  const fileName = filename || `${data.employeeName.replace(/\s+/g, '_')}_Contract.pdf`
  pdf.save(fileName)
}