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

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(15, 118, 110) // teal-700
  doc.rect(0, 0, pageW, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT VOUCHER', margin, 14)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(data.businessName, margin, 22)
  doc.text(data.voucherNumber, pageW - margin, 14, { align: 'right' })
  doc.text(new Date(data.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), pageW - margin, 22, { align: 'right' })

  y = 40

  // ── Amount box ───────────────────────────────────────────────────────────
  doc.setFillColor(240, 253, 250) // teal-50
  doc.setDrawColor(13, 148, 136)  // teal-600
  doc.roundedRect(margin, y, contentW, 22, 3, 3, 'FD')

  doc.setTextColor(15, 118, 110)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('AMOUNT PAID', margin + 6, y + 8)

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(`$${data.amount.toFixed(2)}`, margin + 6, y + 18)

  y += 30

  // ── Helper: section label + body lines ──────────────────────────────────
  const section = (title: string, lines: { label: string; value: string }[]) => {
    doc.setFillColor(249, 250, 251) // gray-50
    doc.setDrawColor(209, 213, 219) // gray-300
    doc.rect(margin, y, contentW, 7, 'FD')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(55, 65, 81) // gray-700
    doc.text(title.toUpperCase(), margin + 3, y + 5)
    y += 10

    const lineH = 8
    lines.forEach(({ label, value }) => {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128) // gray-500
      doc.setFontSize(8)
      doc.text(label, margin + 3, y + 5)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39) // gray-900
      doc.setFontSize(9)
      doc.text(value || '—', margin + 48, y + 5)

      y += lineH
    })
    y += 4
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

  // ── Signature ────────────────────────────────────────────────────────────
  const sigBoxH = 38
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(209, 213, 219)
  doc.rect(margin, y, contentW, sigBoxH, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(55, 65, 81)
  doc.text("COLLECTOR'S SIGNATURE", margin + 3, y + 6)

  if (data.collectorSignature) {
    try {
      doc.addImage(data.collectorSignature, 'PNG', margin + 3, y + 8, 80, 24)
    } catch {
      // Signature image failed — leave blank
    }
  }

  // Signature line on right side
  doc.setDrawColor(156, 163, 175) // gray-400
  doc.line(margin + contentW - 70, y + 30, margin + contentW - 4, y + 30)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text('Authorised Signature', margin + contentW - 70, y + 35)

  y += sigBoxH + 8

  // ── Prepared by ──────────────────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text(`Prepared by: ${data.creatorName}`, margin, y)
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageW - margin, y, { align: 'right' })

  y += 6

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setFillColor(15, 118, 110)
  doc.rect(0, 287, pageW, 10, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(255, 255, 255)
  doc.text(`This is an official payment record of ${data.businessName} — ${data.voucherNumber}`, pageW / 2, 293, { align: 'center' })

  doc.save(`${data.voucherNumber}.pdf`)
}
