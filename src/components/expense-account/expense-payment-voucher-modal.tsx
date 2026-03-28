'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { generatePaymentVoucherPdf, VoucherData } from './payment-voucher-pdf'

export interface PaymentSummary {
  id: string
  amount: number
  paymentDate: string
  payeeName: string
  payeeType: string
  purpose: string
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
  const [collectorDlNumber, setCollectorDlNumber] = useState(existingVoucher?.collectorDlNumber ?? '')
  const [notes, setNotes] = useState(existingVoucher?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Signature pad state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [hasSig, setHasSig] = useState(false)

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
      onSaved(saved)

      // Generate and download the PDF immediately
      const voucherData: VoucherData = {
        voucherNumber: saved.voucherNumber,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        payeeName: payment.payeeName,
        payeeType: payment.payeeType,
        purpose: payment.purpose,
        collectorName: saved.collectorName,
        collectorPhone: saved.collectorPhone,
        collectorIdNumber: saved.collectorIdNumber,
        collectorDlNumber: saved.collectorDlNumber,
        collectorSignature: saved.collectorSignature,
        creatorName,
        businessName: payment.businessName,
        notes: saved.notes,
      }
      generatePaymentVoucherPdf(voucherData)
      onClose()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={collectorPhone}
                    onChange={e => setCollectorPhone(e.target.value)}
                    placeholder="+263..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">National ID</label>
                  <input
                    type="text"
                    value={collectorIdNumber}
                    onChange={e => setCollectorIdNumber(e.target.value)}
                    placeholder="ID number"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
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
