import { jsPDF } from 'jspdf'

export interface ComboVoucherItem {
  description: string
  quantity: number | null
  unit: string | null
  estimatedAmount: number | null
  approvedAmount: number | null
  isPaid: boolean
  paidAmount: number | null
  receiptNumber: string | null
}

export interface ComboVoucherSection {
  sectionType: string
  sectionName: string | null
  payeeType: string | null
  items: ComboVoucherItem[]
}

export interface ComboVoucherData {
  requestId: string
  title: string
  status: string
  requestedAmount: number
  overrideAmount: number | null
  approvedAmount: number | null
  approvalNote: string | null
  notes: string | null
  submittedAt: string | null
  approvedAt: string | null
  paidAt: string | null
  creatorName: string
  approverName: string | null
  accountName: string
  accountNumber: string
  sections: ComboVoucherSection[]
}

const SECTION_LABELS: Record<string, string> = {
  GROCERY: 'Grocery / Supplies',
  MONTHLY_CONTRIBUTION: 'Monthly Contribution',
  SCHOOL_FEES: 'School Fees',
  CUSTOM: 'Custom',
}

function fmtAmt(n: number | null): string {
  if (n === null) return '—'
  return `$${n.toFixed(2)}`
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text
}

export function generateComboVoucherPdf(data: ComboVoucherData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const pageH = 297
  const margin = 15
  const contentW = pageW - margin * 2
  let y = 0

  const BLACK: [number, number, number] = [0, 0, 0]
  const DARK: [number, number, number]  = [30, 30, 30]
  const MID: [number, number, number]   = [90, 90, 90]
  const LIGHT: [number, number, number] = [160, 160, 160]

  const refNumber = `CVR-${data.requestId.slice(0, 8).toUpperCase()}`
  const effectiveRequested = data.overrideAmount ?? data.requestedAmount

  // ── Guard: add page if near bottom ──────────────────────────────────────
  function guardPage(needed: number = 20) {
    if (y + needed > pageH - 20) {
      doc.addPage()
      y = 15
    }
  }

  // ── Section box helper ───────────────────────────────────────────────────
  function infoSection(title: string, rows: { label: string; value: string }[]) {
    const rowH = 7
    const boxH = 9 + rows.length * rowH + 2
    guardPage(boxH + 4)

    doc.setDrawColor(...BLACK)
    doc.setLineWidth(0.4)
    doc.rect(margin, y, contentW, boxH, 'S')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(title.toUpperCase(), margin + 3, y + 6)
    doc.setDrawColor(...LIGHT)
    doc.setLineWidth(0.2)
    doc.line(margin, y + 8, margin + contentW, y + 8)

    let rowY = y + 11
    rows.forEach(({ label, value }) => {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MID)
      doc.setFontSize(7.5)
      doc.text(label, margin + 3, rowY + 3)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.setFontSize(8)
      doc.text(value || '—', margin + 48, rowY + 3)
      rowY += rowH
    })

    y += boxH + 4
  }

  // ── 1. Header ────────────────────────────────────────────────────────────
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.8)
  doc.rect(margin, 8, contentW, 22, 'S')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('COMBO PAYMENT VOUCHER', margin + 4, 18)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID)
  doc.text(`${data.accountName}  (${data.accountNumber})`, margin + 4, 25)
  doc.text(refNumber, pageW - margin - 4, 18, { align: 'right' })
  doc.text(fmtDate(data.submittedAt), pageW - margin - 4, 25, { align: 'right' })

  y = 38

  // ── 2. Status / amounts bar ──────────────────────────────────────────────
  const barH = 18
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.5)
  doc.rect(margin, y, contentW, barH, 'S')

  // Dividers
  const col1 = margin + contentW / 3
  const col2 = margin + (contentW * 2) / 3
  doc.setLineWidth(0.2)
  doc.setDrawColor(...LIGHT)
  doc.line(col1, y, col1, y + barH)
  doc.line(col2, y, col2, y + barH)

  const barData = [
    { label: 'REQUESTED', value: fmtAmt(effectiveRequested), x: margin + 4 },
    { label: 'APPROVED', value: fmtAmt(data.approvedAmount), x: col1 + 4 },
    { label: 'STATUS', value: data.status.replace('_', ' '), x: col2 + 4 },
  ]
  barData.forEach(({ label, value, x }) => {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    doc.text(label, x, y + 7)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(value, x, y + 15)
  })

  y += barH + 5

  // ── 3. Request details ───────────────────────────────────────────────────
  infoSection('Request Details', [
    { label: 'Title', value: truncate(data.title, 60) },
    { label: 'Submitted by', value: data.creatorName },
    { label: 'Submitted', value: fmtDate(data.submittedAt) },
    ...(data.notes ? [{ label: 'Notes', value: truncate(data.notes, 60) }] : []),
  ])

  // ── 4. Approval details (if applicable) ──────────────────────────────────
  if (data.approvedAmount !== null && data.approverName) {
    infoSection('Approval Details', [
      { label: 'Approved by', value: data.approverName },
      { label: 'Approved date', value: fmtDate(data.approvedAt) },
      { label: 'Approved amount', value: fmtAmt(data.approvedAmount) },
      ...(data.approvalNote ? [{ label: 'Note', value: truncate(data.approvalNote, 60) }] : []),
    ])
  }

  // ── 5. Sections & items ──────────────────────────────────────────────────
  const COL = {
    desc: margin,
    descW: 72,
    qty: margin + 73,
    qtyW: 20,
    est: margin + 94,
    estW: 26,
    appr: margin + 121,
    apprW: 26,
    status: margin + 148,
    statusW: contentW - 148,
  }

  const TABLE_HEADER_H = 7
  const ITEM_ROW_H = 6.5

  function drawTableHeader() {
    guardPage(TABLE_HEADER_H + 4)
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, y, contentW, TABLE_HEADER_H, 'F')
    doc.setDrawColor(...LIGHT)
    doc.setLineWidth(0.2)
    doc.rect(margin, y, contentW, TABLE_HEADER_H, 'S')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MID)
    const headers = [
      { text: 'Description', x: COL.desc + 2 },
      { text: 'Qty / Unit', x: COL.qty + 1 },
      { text: 'Estimated', x: COL.est + 1 },
      { text: 'Approved', x: COL.appr + 1 },
      { text: 'Status', x: COL.status + 1 },
    ]
    headers.forEach(h => doc.text(h.text, h.x, y + 5))
    y += TABLE_HEADER_H
  }

  data.sections.forEach(section => {
    const sectionLabel = section.sectionName || SECTION_LABELS[section.sectionType] || section.sectionType
    const sectionEst = section.items.reduce((sum, i) => sum + (i.estimatedAmount ?? 0), 0)

    // Section header bar
    guardPage(10 + TABLE_HEADER_H + ITEM_ROW_H + 6)

    const sectionBarH = 9
    doc.setDrawColor(...BLACK)
    doc.setLineWidth(0.4)
    doc.rect(margin, y, contentW, sectionBarH, 'S')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(sectionLabel.toUpperCase(), margin + 3, y + 6)
    if (section.payeeType) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MID)
      doc.text(`Payee: ${section.payeeType}`, margin + 3, y + 6 + 5)
    }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(fmtAmt(sectionEst), pageW - margin - 3, y + 6, { align: 'right' })
    y += sectionBarH + 2

    // Items table header
    drawTableHeader()

    // Item rows
    section.items.forEach((item, idx) => {
      guardPage(ITEM_ROW_H + 3)

      const isNotFunded = item.approvedAmount !== null && item.approvedAmount === 0
      const rowBg = isNotFunded ? [255, 245, 245] as [number, number, number] : (idx % 2 === 0 ? [255, 255, 255] as [number, number, number] : [248, 248, 248] as [number, number, number])

      doc.setFillColor(...rowBg)
      doc.rect(margin, y, contentW, ITEM_ROW_H, 'F')
      doc.setDrawColor(...LIGHT)
      doc.setLineWidth(0.1)
      doc.line(margin, y + ITEM_ROW_H, margin + contentW, y + ITEM_ROW_H)

      const textY = y + 4.5

      doc.setFont('helvetica', isNotFunded ? 'italic' : 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(isNotFunded ? 180 : 30, 30, 30)
      doc.text(truncate(item.description, 38), COL.desc + 2, textY)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MID)
      const qtyUnit = [item.quantity, item.unit].filter(Boolean).join(' ') || '—'
      doc.text(truncate(qtyUnit, 10), COL.qty + 1, textY)

      doc.setTextColor(...DARK)
      doc.text(fmtAmt(item.estimatedAmount), COL.est + COL.estW - 2, textY, { align: 'right' })

      if (isNotFunded) {
        doc.setTextColor(200, 50, 50)
        doc.text('Not funded', COL.appr + 1, textY)
      } else {
        doc.setTextColor(...DARK)
        doc.text(
          item.approvedAmount !== null ? fmtAmt(item.approvedAmount) : fmtAmt(item.estimatedAmount),
          COL.appr + COL.apprW - 2, textY, { align: 'right' }
        )
      }

      // Status
      if (item.isPaid) {
        doc.setTextColor(0, 120, 60)
        doc.text(`✓ Paid${item.paidAmount !== null ? ' ' + fmtAmt(item.paidAmount) : ''}`, COL.status + 1, textY)
        if (item.receiptNumber) {
          doc.setFontSize(6.5)
          doc.setTextColor(...LIGHT)
          doc.text(`Rcpt: ${item.receiptNumber}`, COL.status + 1, textY + 3.5)
        }
      } else if (isNotFunded) {
        doc.setTextColor(180, 60, 60)
        doc.text('—', COL.status + 1, textY)
      } else {
        doc.setTextColor(...MID)
        doc.text('Pending', COL.status + 1, textY)
      }

      y += ITEM_ROW_H
    })

    y += 5
  })

  // ── 6. Totals ────────────────────────────────────────────────────────────
  const allItems = data.sections.flatMap(s => s.items)
  const totalPaid = allItems.reduce((sum, i) => sum + (i.paidAmount ?? 0), 0)
  const notFundedCount = allItems.filter(i => i.approvedAmount !== null && i.approvedAmount === 0).length
  const fundedCount = allItems.length - notFundedCount
  const paidCount = allItems.filter(i => i.isPaid).length
  const allFundedPaid = fundedCount > 0 && paidCount === fundedCount
  const changeToReturn = allFundedPaid && data.approvedAmount !== null && data.approvedAmount > totalPaid
    ? data.approvedAmount - totalPaid
    : null

  const totalsRows: { label: string; value: string }[] = [
    { label: 'Requested Total', value: fmtAmt(effectiveRequested) },
  ]
  if (data.approvedAmount !== null) {
    totalsRows.push({ label: 'Approved Total', value: fmtAmt(data.approvedAmount) })
  }
  if (totalPaid > 0) {
    totalsRows.push({ label: 'Total Paid Out', value: fmtAmt(totalPaid) })
  }
  infoSection('Totals', totalsRows)

  // Standalone change-to-return box (B&W printer friendly — border only, no fill)
  if (changeToReturn !== null) {
    guardPage(16)
    const boxH = 13
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...BLACK)
    doc.setLineWidth(1.2)
    doc.rect(margin, y, contentW, boxH, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLACK)
    doc.text('** CHANGE TO RETURN TO CASHIER **', margin + 4, y + 8.5)
    doc.text(fmtAmt(changeToReturn), pageW - margin - 4, y + 8.5, { align: 'right' })
    y += boxH + 4
  }

  // ── 7. Signature lines ────────────────────────────────────────────────────
  guardPage(40)

  const sigBoxH = 32
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.4)
  doc.rect(margin, y, contentW, sigBoxH, 'S')

  // Divider down the middle
  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(0.2)
  doc.line(margin + contentW / 2, y, margin + contentW / 2, y + sigBoxH)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('REQUESTER', margin + 4, y + 7)
  doc.text('CASHIER / APPROVER', margin + contentW / 2 + 4, y + 7)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID)
  doc.text(`Name: ${data.creatorName}`, margin + 4, y + 14)
  if (data.approverName) {
    doc.text(`Name: ${data.approverName}`, margin + contentW / 2 + 4, y + 14)
  }

  // Signature lines
  doc.setDrawColor(...MID)
  doc.setLineWidth(0.3)
  doc.line(margin + 4, y + sigBoxH - 6, margin + contentW / 2 - 8, y + sigBoxH - 6)
  doc.line(margin + contentW / 2 + 4, y + sigBoxH - 6, margin + contentW - 4, y + sigBoxH - 6)

  doc.setFontSize(6.5)
  doc.setTextColor(...LIGHT)
  doc.text('Signature & Date', margin + 4, y + sigBoxH - 2)
  doc.text('Signature & Date', margin + contentW / 2 + 4, y + sigBoxH - 2)

  y += sigBoxH + 6

  // ── 8. Footer ─────────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text(`Prepared by: ${data.creatorName}`, margin, y)
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageW - margin, y, { align: 'right' })

  y += 5
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...MID)
  doc.text(`Official record — ${refNumber}`, pageW / 2, y + 4, { align: 'center' })

  doc.save(`${refNumber}.pdf`)
}
