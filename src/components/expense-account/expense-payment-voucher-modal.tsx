'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { generatePaymentVoucherPdf, VoucherData } from './payment-voucher-pdf'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'

export interface PaymentSummary {
  id: string
  amount: number
  paymentDate: string
  payeeName: string
  payeeType: string
  purpose: string
  category?: string
  businessId: string
  businessName: string
}

interface ExistingVoucher {
  id: string
  voucherNumber: string
  collectorName: string
  collectorPhone?: string
  collectorIdNumber?: string
  collectorDlNumber?: string
  collectorSignature?: string
  notes?: string
  creator?: { firstName: string; lastName: string }
}

interface Props {
  payment: PaymentSummary
  existingVoucher?: ExistingVoucher | null
  userId: string         // session user id (resolved to employee server-side)
  creatorName: string    // display name shown on PDF
  onClose: () => void
  onSaved: (voucher: ExistingVoucher) => void
}

export function ExpensePaymentVoucherModal({
  payment,
  existingVoucher,
  userId,
  creatorName,
  onClose,
  onSaved,
}: Props) {
  const [collectorName, setCollectorName] = useState(existingVoucher?.collectorName ?? '')
  const [collectorPhone, setCollectorPhone] = useState(existingVoucher?.collectorPhone ?? '')
  const [collectorIdNumber, setCollectorIdNumber] = useState(existingVoucher?.collectorIdNumber ?? '')
  const [collectorIdTemplateId, setCollectorIdTemplateId] = useState<string | undefined>(undefined)
  const [collectorDlNumber, setCollectorDlNumber] = useState(existingVoucher?.collectorDlNumber ?? '')
  const [purpose, setPurpose] = useState(payment.purpose ?? '')
  const [notes, setNotes] = useState(existingVoucher?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Signature pad state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [hasSig, setHasSig] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [savedVoucherData, setSavedVoucherData] = useState<VoucherData | null>(null)
  const pendingSaved = useRef<ExistingVoucher | null>(null)

  // Pre-load existing signature into canvas
  useEffect(() => {
    if (existingVoucher?.collectorSignature && canvasRef.current) {
      const img = new Image()
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d')
        if (ctx) { ctx.clearRect(0, 0, 400, 120); ctx.drawImage(img, 0, 0) }
        setHasSig(true)
      }
      img.src = existingVoucher.collectorSignature
    }
  }, [existingVoucher?.collectorSignature])

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true
    const canvas = canvasRef.current!
    lastPos.current = getPos(e, canvas)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || !canvasRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    setHasSig(true)
  }, [])

  const stopDraw = useCallback(() => { drawing.current = false }, [])

  const clearSig = () => {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collectorName.trim()) { setError('Collector name is required'); return }
    if (!purpose.trim()) { setError('Please describe what this payment is for'); return }
    setSaving(true)
    setError('')

    const signature = hasSig ? canvasRef.current!.toDataURL('image/png') : undefined

    try {
      const res = await fetch('/api/payment-vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.id,
          businessId: payment.businessId,
          userId,
          collectorName: collectorName.trim(),
          collectorPhone: collectorPhone.trim() || undefined,
          collectorIdNumber: collectorIdNumber.trim() || undefined,
          collectorDlNumber: collectorDlNumber.trim() || undefined,
          collectorSignature: signature,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to save'); return }

      const saved: ExistingVoucher = json.data
      pendingSaved.current = saved

      // Show preview instead of downloading immediately
      const voucherData: VoucherData = {
        voucherNumber: saved.voucherNumber,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        payeeName: payment.payeeName,
        payeeType: payment.payeeType,
        purpose: purpose.trim(),
        collectorName: saved.collectorName,
        collectorPhone: saved.collectorPhone,
        collectorIdNumber: saved.collectorIdNumber,
        collectorDlNumber: saved.collectorDlNumber,
        collectorSignature: saved.collectorSignature,
        creatorName,
        businessName: payment.businessName,
        category: payment.category,
        notes: saved.notes,
      }
      setSavedVoucherData(voucherData)
      setShowPreview(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPdf = () => {
    if (savedVoucherData) generatePaymentVoucherPdf(savedVoucherData)
  }

  const handlePrintVoucher = () => {
    if (!previewRef.current || !savedVoucherData) return
    const content = previewRef.current.innerHTML
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <title>${savedVoucherData.voucherNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111; background: #fff; padding: 24px; max-width: 600px; margin: 0 auto; }
    .vch-header { border: 2px solid #000; padding: 12px 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
    .vch-header h1 { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
    .vch-header p { font-size: 11px; color: #555; }
    .vch-amount { border: 1px solid #000; padding: 10px 16px; margin-bottom: 10px; }
    .vch-amount p { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
    .vch-amount span { font-size: 22px; font-weight: bold; }
    .vch-section { border: 1px solid #000; padding: 10px 16px; margin-bottom: 8px; }
    .vch-section-title { font-size: 9px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
    .vch-row { display: flex; gap: 12px; padding: 2px 0; font-size: 11px; }
    .vch-label { color: #666; min-width: 120px; }
    .vch-value { font-weight: bold; }
    .sig-img { max-height: 56px; margin-top: 6px; }
    .vch-footer { margin-top: 10px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #000; padding-top: 6px; font-style: italic; }
    .vch-prepared { display: flex; justify-content: space-between; font-size: 10px; color: #888; margin-top: 8px; }
  </style>
</head><body>${content}</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
  }

  if (showPreview && savedVoucherData) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>
          {/* Preview header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">📄 Payment Voucher Preview</h2>
              <p className="text-xs text-gray-500">{savedVoucherData.voucherNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintVoucher}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                🖨️ Print
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium"
              >
                ⬇️ Save PDF
              </button>
              <button onClick={() => { if (pendingSaved.current) onSaved(pendingSaved.current); onClose() }} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-1">×</button>
            </div>
          </div>
          {/* Scrollable preview content */}
          <div className="flex-1 overflow-y-auto p-5">
            <div ref={previewRef} className="bg-white text-gray-900 font-sans">
              {/* Header */}
              <div className="vch-header border-2 border-black p-3 flex justify-between items-start mb-3">
                <div>
                  <h1 className="text-lg font-bold tracking-wide">PAYMENT VOUCHER</h1>
                  <p className="text-xs text-gray-500">{savedVoucherData.businessName}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold">{savedVoucherData.voucherNumber}</p>
                  <p className="text-gray-500">{new Date(savedVoucherData.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              {/* Amount */}
              <div className="vch-amount border border-black p-3 mb-2">
                <p className="vch-amount text-xs text-gray-500 uppercase tracking-wide">Amount Paid</p>
                <span className="text-2xl font-bold">${savedVoucherData.amount.toFixed(2)}</span>
              </div>
              {/* Paid To */}
              <div className="vch-section border border-black p-3 mb-2">
                <h3 className="vch-section-title text-xs font-bold uppercase tracking-widest mb-2 pb-1 border-b border-gray-200">Paid To (Payee)</h3>
                <div className="space-y-0.5 text-xs">
                  <div className="vch-row flex gap-3"><span className="vch-label text-gray-500 w-28">Name</span><span className="vch-value font-semibold">{savedVoucherData.payeeName}</span></div>
                  <div className="vch-row flex gap-3"><span className="vch-label text-gray-500 w-28">Type</span><span className="vch-value font-semibold">{savedVoucherData.payeeType}</span></div>
                  {savedVoucherData.purpose && <div className="vch-row flex gap-3"><span className="vch-label text-gray-500 w-28">Purpose</span><span className="vch-value font-semibold">{savedVoucherData.purpose}</span></div>}
                  {savedVoucherData.category && <div className="vch-row flex gap-3"><span className="vch-label text-gray-500 w-28">Category</span><span className="vch-value font-semibold">{savedVoucherData.category}</span></div>}
                </div>
              </div>
              {/* Collected By */}
              <div className="vch-section border border-black p-3 mb-2">
                <h3 className="vch-section-title text-xs font-bold uppercase tracking-widest mb-2 pb-1 border-b border-gray-200">Collected By</h3>
                <div className="space-y-0.5 text-xs">
                  <div className="vch-row flex gap-3"><span className="vch-label text-gray-500 w-28">Full Name</span><span className="vch-value font-semibold">{savedVoucherData.collectorName}</span></div>
                  {savedVoucherData.collectorPhone && <div className="vch-row flex gap-3"><span className="vch-label text-gray-500 w-28">Phone</span><span className="vch-value font-semibold">{savedVoucherData.collectorPhone}</span></div>}
                  {savedVoucherData.collectorIdNumber && <div className="vch-row flex gap-3"><span className="vch-label text-gray-500 w-28">National ID</span><span className="vch-value font-semibold">{savedVoucherData.collectorIdNumber}</span></div>}
                  {savedVoucherData.collectorDlNumber && <div className="vch-row flex gap-3"><span className="vch-label text-gray-500 w-28">Driver&#39;s Licence</span><span className="vch-value font-semibold">{savedVoucherData.collectorDlNumber}</span></div>}
                </div>
              </div>
              {/* Notes */}
              {savedVoucherData.notes && (
                <div className="vch-section border border-black p-3 mb-2">
                  <h3 className="vch-section-title text-xs font-bold uppercase tracking-widest mb-2 pb-1 border-b border-gray-200">Additional Notes</h3>
                  <p className="text-xs text-gray-700">{savedVoucherData.notes}</p>
                </div>
              )}
              {/* Signature */}
              <div className="vch-section border border-black p-3 mb-3">
                <h3 className="vch-section-title text-xs font-bold uppercase tracking-widest mb-2 pb-1 border-b border-gray-200">Collector&#39;s Signature</h3>
                {savedVoucherData.collectorSignature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={savedVoucherData.collectorSignature} alt="Collector signature" className="sig-img max-h-14 mt-1" />
                ) : (
                  <div className="h-10 flex items-end pb-1"><div className="border-b border-gray-400 w-36" /></div>
                )}
              </div>
              {/* Prepared by */}
              <div className="vch-prepared flex justify-between text-xs text-gray-400">
                <span>Prepared by: {savedVoucherData.creatorName}</span>
                <span>Generated: {new Date().toLocaleString('en-GB')}</span>
              </div>
              {/* Footer */}
              <div className="vch-footer mt-3 pt-2 text-center text-xs italic text-gray-400 border-t border-black">
                This is an official payment record of {savedVoucherData.businessName} — {savedVoucherData.voucherNumber}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              📄 Payment Voucher
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {existingVoucher ? `Edit — ${existingVoucher.voucherNumber}` : 'Capture collector details'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Payment summary (read-only) */}
        <div className="mx-4 mt-4 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-medium uppercase tracking-wide">Paid to</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{payment.payeeName}</p>
              {payment.purpose && <p className="text-xs text-gray-500 mt-0.5">{payment.purpose}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-teal-600 dark:text-teal-400 font-medium uppercase tracking-wide">Amount</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">${payment.amount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Collector details */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Collector Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={collectorName}
                  onChange={e => setCollectorName(e.target.value)}
                  placeholder="Name of person who collected"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <PhoneNumberInput
                    label="Phone Number"
                    value={collectorPhone}
                    onChange={(fullNumber) => setCollectorPhone(fullNumber)}
                  />
              <NationalIdInput
                    label="National ID"
                    value={collectorIdNumber}
                    templateId={collectorIdTemplateId}
                    onChange={(id, tmplId) => { setCollectorIdNumber(id); if (tmplId) setCollectorIdTemplateId(tmplId) }}
                    onTemplateChange={(tmplId) => setCollectorIdTemplateId(tmplId)}
                    showTemplateSelector={true}
                  />
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Driver's Licence No.</label>
                <input
                  type="text"
                  value={collectorDlNumber}
                  onChange={e => setCollectorDlNumber(e.target.value)}
                  placeholder="Licence number (optional)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What is this payment for? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g. School fees Term 1 — Chisamba Primary"
                  rows={2}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional notes about this payment..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Signature pad */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Collector Signature</h3>
              {hasSig && (
                <button type="button" onClick={clearSig} className="text-xs text-red-500 hover:text-red-700">
                  Clear
                </button>
              )}
            </div>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={560}
                height={120}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Draw signature above using mouse or touch</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : '📄 Save & Generate PDF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
