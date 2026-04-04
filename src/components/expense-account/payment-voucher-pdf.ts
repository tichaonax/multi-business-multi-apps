import { jsPDF } from 'jspdf'

export interface VoucherData {
  voucherNumber: string
  paymentDate: string        // ISO string
  amount: number
  payeeName: string
  payeeType: string
  purpose: string            // notes / category
  collectorName: string
  collectorPhone?: string
  collectorIdNumber?: string
  collectorDlNumber?: string
  collectorSignature?: string  // base64 PNG
  creatorName: string
  businessName: string
  notes?: string
}

export function generatePaymentVoucherPdf(data: VoucherData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 18
  const contentW = pageW - margin * 2
  let y = 0

  // All colours set to black/dark-grey — no filled regions to save toner.
  const BLACK = [0, 0, 0] as const
  const DARK  = [30, 30, 30] as const
  const MID   = [90, 90, 90] as const
  const LIGHT = [160, 160, 160] as const

  // ── Header (border only, no fill) ────────────────────────────────────────
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.8)
  doc.rect(margin, 6, contentW, 22, 'S')     // outline box, no fill

  doc.setTextColor(...DARK)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT VOUCHER', margin + 4, 16)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID)
  doc.text(data.businessName, margin + 4, 23)
  doc.text(data.voucherNumber, pageW - margin - 4, 16, { align: 'right' })
  doc.text(new Date(data.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), pageW - margin - 4, 23, { align: 'right' })

  y = 36

  // ── Amount box (border only) ─────────────────────────────────────────────
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.5)
  doc.rect(margin, y, contentW, 18, 'S')

  doc.setTextColor(...MID)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('AMOUNT PAID', margin + 4, y + 7)

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(`$${data.amount.toFixed(2)}`, margin + 4, y + 15)

  y += 24

  // ── Helper: draw a bordered section with labelled rows ───────────────────
  const section = (title: string, lines: { label: string; value: string }[]) => {
    const rowH = 7
    const boxH = 8 + lines.length * rowH + 3
    doc.setDrawColor(...BLACK)
    doc.setLineWidth(0.4)
    doc.rect(margin, y, contentW, boxH, 'S')

    // Section title — underlined by a thin rule
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(title.toUpperCase(), margin + 3, y + 6)
    doc.setDrawColor(...LIGHT)
    doc.setLineWidth(0.2)
    doc.line(margin, y + 8, margin + contentW, y + 8)

    let rowY = y + 10
    lines.forEach(({ label, value }) => {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MID)
      doc.setFontSize(7.5)
      doc.text(label, margin + 3, rowY + 4)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.setFontSize(8)
      doc.text(value || '—', margin + 46, rowY + 4)

      rowY += rowH
    })

    y += boxH + 4
  }

  // ── Payee section ────────────────────────────────────────────────────────
  section('Paid To (Payee)', [
    { label: 'Name', value: data.payeeName },
    { label: 'Type', value: data.payeeType },
    { label: 'Purpose', value: data.purpose || '—' },
  ])

  // ── Collector section ────────────────────────────────────────────────────
  section('Collected By', [
    { label: 'Full Name', value: data.collectorName },
    { label: 'Phone', value: data.collectorPhone || '—' },
    { label: 'National ID', value: data.collectorIdNumber || '—' },
    { label: "Driver's Licence", value: data.collectorDlNumber || '—' },
  ])

  // ── Notes ────────────────────────────────────────────────────────────────
  if (data.notes) {
    section('Additional Notes', [{ label: 'Notes', value: data.notes }])
  }

  // ── Signature box (border only) ────────────────────────────────────────
  const sigBoxH = 36
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.4)
  doc.rect(margin, y, contentW, sigBoxH, 'S')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text("COLLECTOR'S SIGNATURE", margin + 3, y + 6)
  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(0.2)
  doc.line(margin, y + 8, margin + contentW, y + 8)

  if (data.collectorSignature) {
    try {
      doc.addImage(data.collectorSignature, 'PNG', margin + 3, y + 10, 76, 20)
    } catch {
      // Signature image failed — leave blank
    }
  }

  // Authorised signature line (right side)
  doc.setDrawColor(...MID)
  doc.setLineWidth(0.3)
  doc.line(margin + contentW - 68, y + 30, margin + contentW - 4, y + 30)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text('Authorised Signature', margin + contentW - 68, y + 34)

  y += sigBoxH + 6

  // ── Prepared by ──────────────────────────────────────────────────────────
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text(`Prepared by: ${data.creatorName}`, margin, y)
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageW - margin, y, { align: 'right' })

  y += 5

  // ── Footer (border only) ─────────────────────────────────────────────────
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageW - margin, y)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...MID)
  doc.text(`This is an official payment record of ${data.businessName} — ${data.voucherNumber}`, pageW / 2, y + 5, { align: 'center' })

  doc.save(`${data.voucherNumber}.pdf`)
}
