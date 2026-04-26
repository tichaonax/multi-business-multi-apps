'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { globalBarcodeService } from '@/lib/services/global-barcode-service'

export interface OrderSummary {
  orderId: string
  orderNumber: string
  totalAmount: number
  paymentMethod: string
  createdAt: string
  // EcoCash breakdown
  grossAmount?: number
  feeDeducted?: number
  refundAmount?: number
  isEcocash?: boolean
}

interface ManagerOverrideModalProps {
  order: OrderSummary
  businessId: string
  onApproved: (managerId: string, managerName: string, finalRefundAmount: number, staffReason: string) => void
  onAborted: () => void
}

type Step =
  | 'REASON'
  | 'CODE_ENTRY'
  | 'APPROVE_DENY'
  | 'DENIAL_REASON'
  | 'DENIED_FINAL'
  | 'SUCCESS'

export function ManagerOverrideModal({
  order,
  businessId,
  onApproved,
  onAborted,
}: ManagerOverrideModalProps) {
  const [step, setStep] = useState<Step>('REASON')
  const [staffReason, setStaffReason] = useState('')
  const [codeValue, setCodeValue] = useState('')
  const [codeError, setCodeError] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isResolving, setIsResolving] = useState(false)
  const [manager, setManager] = useState<{ id: string; name: string } | null>(null)
  const [denialReason, setDenialReason] = useState('')
  const [isSubmittingDenial, setIsSubmittingDenial] = useState(false)
  // For non-EcoCash: manager can adjust the refund downward
  const [managerRefundAmount, setManagerRefundAmount] = useState(
    String(order.isEcocash ? (order.refundAmount ?? order.totalAmount) : order.totalAmount)
  )
  const [refundError, setRefundError] = useState('')

  const codeInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const scanBufRef = useRef('')
  const lastScanKeyRef = useRef(0)
  const isScanningRef = useRef(false)
  // Keep resolveValue stable ref so scan listener always calls the latest version
  const resolveValueRef = useRef<(val: string) => Promise<void>>(async () => {})

  const LOCK_AFTER = 3

  // Disable global barcode scanning while code-entry step is active; reset state and anchor focus
  useEffect(() => {
    if (step === 'CODE_ENTRY') {
      globalBarcodeService.disable()
      setCodeValue('')
      setCodeError('')
      scanBufRef.current = ''
      setTimeout(() => modalRef.current?.focus(), 0)
    }
    return () => {
      if (step === 'CODE_ENTRY') {
        globalBarcodeService.enable()
      }
    }
  }, [step])

  // Re-enable on unmount (any exit path)
  useEffect(() => {
    return () => {
      globalBarcodeService.enable()
    }
  }, [])

  // Capture-phase scan listener — intercepts rapid card-scanner sequences.
  // Key insight: scanner chars arrive < 80ms apart. We detect this even when the input has focus.
  // First char may leak into the input; char 2+ are intercepted. On Enter we clear the input
  // and resolve from the buffer (not from codeValue).
  useEffect(() => {
    if (step !== 'CODE_ENTRY') return

    const GAP_MS = 80

    const onKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const gap = now - lastScanKeyRef.current
      lastScanKeyRef.current = now

      // Slow gap — reset; treat as start of a new (possibly manual) sequence
      if (gap > GAP_MS) {
        scanBufRef.current = ''
        isScanningRef.current = false
      }

      if (e.key === 'Enter') {
        if (isScanningRef.current) {
          const code = scanBufRef.current.trim()
          scanBufRef.current = ''
          isScanningRef.current = false
          if (code.length >= 4) {
            e.stopImmediatePropagation()
            e.preventDefault()
            setCodeValue('') // clear any char(s) that leaked into the input
            resolveValueRef.current(code)
          }
        }
        return
      }

      if (e.key && e.key.length === 1) {
        scanBufRef.current += e.key
        // Once 2+ rapid chars accumulated — confirmed scanner, intercept from here
        if (scanBufRef.current.length >= 2) {
          isScanningRef.current = true
          e.stopImmediatePropagation()
          e.preventDefault() // prevent remaining chars entering the input
        }
      }
    }

    window.addEventListener('keydown', onKeyDown, true) // capture phase — fires first
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [step])

  // Core resolve logic — used by both scan path (direct value) and manual input path (codeValue)
  const resolveValue = useCallback(async (val: string) => {
    if (!val.trim() || isResolving || failedAttempts >= LOCK_AFTER) return

    setIsResolving(true)
    setCodeError('')

    try {
      const res = await fetch('/api/manager-override/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val.trim(), businessId }),
      })
      const data = await res.json()

      if (!res.ok) {
        const newAttempts = failedAttempts + 1
        setFailedAttempts(newAttempts)
        setCodeValue('')
        setCodeError(
          newAttempts >= LOCK_AFTER
            ? 'Too many failed attempts — input locked.'
            : data.error || 'Invalid code or unrecognised card'
        )
        setTimeout(() => modalRef.current?.focus(), 50)
        await fetch(`/api/orders/${order.orderId}/cancel/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outcome: 'FAILED_CODE', staffReason, businessId }),
        }).catch(() => {})
      } else {
        setManager({ id: data.managerId, name: data.managerName })
        setStep('APPROVE_DENY')
      }
    } catch {
      setCodeError('Connection error — please try again')
    } finally {
      setIsResolving(false)
    }
  }, [isResolving, failedAttempts, businessId, order.orderId, staffReason])

  // Keep ref in sync so scan listener always uses latest closured state
  resolveValueRef.current = resolveValue

  const handleResolveCode = useCallback(async () => {
    await resolveValue(codeValue)
  }, [codeValue, resolveValue])

  const handleApprove = () => {
    if (!manager) return

    // For cash: validate the manager-set refund amount
    if (!order.isEcocash) {
      const val = parseFloat(managerRefundAmount)
      if (isNaN(val) || val <= 0) {
        setRefundError('Refund amount must be greater than 0')
        return
      }
      if (val > order.totalAmount) {
        setRefundError(`Refund cannot exceed order total ($${fmt(order.totalAmount)})`)
        return
      }
      setRefundError('')
      onApproved(manager.id, manager.name, val, staffReason)
    } else {
      onApproved(manager.id, manager.name, order.refundAmount ?? order.totalAmount, staffReason)
    }
    setStep('SUCCESS')
  }

  const handleDenyClick = () => {
    setDenialReason('')
    setStep('DENIAL_REASON')
  }

  const handleConfirmDenial = async () => {
    if (!manager || !denialReason.trim()) return
    setIsSubmittingDenial(true)
    await fetch(`/api/orders/${order.orderId}/cancel/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome: 'DENIED',
        managerId: manager.id,
        staffReason,
        denialReason: denialReason.trim(),
        businessId,
      }),
    }).catch(() => {})
    setIsSubmittingDenial(false)
    setStep('DENIED_FINAL')
  }

  const handleAbort = async () => {
    await fetch(`/api/orders/${order.orderId}/cancel/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome: 'ABORTED',
        managerId: manager?.id ?? null,
        staffReason,
        businessId,
      }),
    }).catch(() => {})
    onAborted()
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} tabIndex={-1} className="bg-white rounded-2xl shadow-2xl w-full max-w-md outline-none">

        {/* ── Step 1: Staff Reason ─────────────────────────────────── */}
        {step === 'REASON' && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              Cancel Order #{order.orderNumber}
            </h2>
            <p className="text-sm text-gray-500">
              ${fmt(order.totalAmount)} · {order.paymentMethod} ·{' '}
              {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} today
            </p>

            {order.isEcocash && order.feeDeducted != null && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-1">
                <p className="font-semibold text-amber-800">EcoCash Refund Notice</p>
                <p className="text-amber-700 text-xs">
                  EcoCash charges fees on both the original payment and the refund.
                </p>
                <div className="space-y-0.5 text-amber-900 text-xs pt-1">
                  <div className="flex justify-between">
                    <span>Order total:</span>
                    <span>${fmt(order.grossAmount!)}</span>
                  </div>
                  <div className="flex justify-between text-red-700">
                    <span>Fee deducted:</span>
                    <span>− ${fmt(order.feeDeducted)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-amber-300 pt-0.5">
                    <span>Customer refund:</span>
                    <span>${fmt(order.refundAmount!)}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Minimum 10 characters…"
                value={staffReason}
                onChange={(e) => setStaffReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAbort}
                className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('CODE_ENTRY')}
                disabled={staffReason.trim().length < 10}
                className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Request Manager Authorisation
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Manager Code Entry ───────────────────────────── */}
        {step === 'CODE_ENTRY' && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Manager Authorisation Required</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Order #{order.orderNumber}</p>
              <p className="font-medium">
                Refund to customer: ${fmt(order.isEcocash ? order.refundAmount! : order.totalAmount)}
                {order.isEcocash && (
                  <span className="text-gray-400 font-normal"> (EcoCash, net of fees)</span>
                )}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1 font-medium">Staff reason:</p>
              <p>{staffReason}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-medium">Scan card</span> — or click the field below to type the override code manually.
              </p>
              {isResolving && (
                <p className="text-blue-600 text-xs mb-2 animate-pulse">Verifying…</p>
              )}
              <label className="block text-xs text-gray-500 mb-1">
                Type override code:
              </label>
              <div className="flex gap-2">
                <input
                  ref={codeInputRef}
                  type="password"
                  autoComplete="off"
                  value={codeValue}
                  onChange={(e) => {
                    if (failedAttempts < LOCK_AFTER) setCodeValue(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleResolveCode()
                  }}
                  disabled={failedAttempts >= LOCK_AFTER || isResolving}
                  placeholder="••••••"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleResolveCode}
                  disabled={!codeValue.trim() || failedAttempts >= LOCK_AFTER || isResolving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isResolving ? '…' : 'OK'}
                </button>
              </div>
              {codeError && (
                <p className="text-red-600 text-xs mt-1">{codeError}</p>
              )}
              {failedAttempts < LOCK_AFTER && !codeError && (
                <p className="text-gray-400 text-xs mt-1">Press Enter or click OK to submit code</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAbort}
                className="w-full py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Abort
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3a: Approve or Deny ─────────────────────────────── */}
        {step === 'APPROVE_DENY' && manager && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <span className="text-xl">✓</span>
              <span className="font-semibold">Identified: {manager.name}</span>
            </div>

            <div className="text-sm text-gray-700 space-y-1">
              <p>Order #{order.orderNumber}</p>
              <p className="text-gray-500">Staff reason: "{staffReason}"</p>
            </div>

            {/* EcoCash: fixed refund breakdown */}
            {order.isEcocash && order.refundAmount != null && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-0.5">
                <div className="flex justify-between text-amber-900 text-xs">
                  <span>Order total:</span><span>${fmt(order.grossAmount!)}</span>
                </div>
                <div className="flex justify-between text-red-700 text-xs">
                  <span>Fee deducted:</span><span>− ${fmt(order.feeDeducted!)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-900 border-t border-amber-300 pt-0.5 text-sm">
                  <span>Customer refund:</span><span>${fmt(order.refundAmount)}</span>
                </div>
              </div>
            )}

            {/* Cash/other: manager can adjust refund amount */}
            {!order.isEcocash && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refund amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={order.totalAmount}
                    value={managerRefundAmount}
                    onChange={(e) => {
                      setManagerRefundAmount(e.target.value)
                      setRefundError('')
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  Max: ${fmt(order.totalAmount)} (order total)
                </p>
                {refundError && (
                  <p className="text-red-600 text-xs mt-1">{refundError}</p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDenyClick}
                className="flex-1 py-2.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                ✗ Deny Request
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ✓ Approve Cancellation
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3b: Denial Reason ───────────────────────────────── */}
        {step === 'DENIAL_REASON' && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Denial Reason</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for denial <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                rows={3}
                placeholder="Enter reason for denying this cancellation…"
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('APPROVE_DENY')}
                className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirmDenial}
                disabled={!denialReason.trim() || isSubmittingDenial}
                className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmittingDenial ? 'Saving…' : 'Confirm Denial'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3c: Denied Final ────────────────────────────────── */}
        {step === 'DENIED_FINAL' && (
          <div className="p-6 space-y-4 text-center">
            <div className="text-4xl">✗</div>
            <h2 className="text-lg font-bold text-gray-900">Cancellation Denied</h2>
            <p className="text-sm text-gray-600">
              {manager?.name}: "{denialReason}"
            </p>
            <p className="text-xs text-gray-400">
              This cancellation request has been denied. The first denial is final — no further attempts are permitted for this order.
            </p>
            <button
              onClick={onAborted}
              className="w-full py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        )}

        {/* ── Step 4: Success ──────────────────────────────────────── */}
        {step === 'SUCCESS' && (
          <div className="p-6 space-y-4 text-center">
            <div className="text-4xl">✅</div>
            <h2 className="text-lg font-bold text-gray-900">Order Cancelled</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                Refund to customer:{' '}
                <span className="font-semibold">
                  ${fmt(
                    order.isEcocash
                      ? (order.refundAmount ?? order.totalAmount)
                      : parseFloat(managerRefundAmount) || order.totalAmount
                  )}
                </span>
              </p>
              {order.isEcocash && order.feeDeducted != null && order.feeDeducted > 0 && (
                <p className="text-gray-400 text-xs">(EcoCash fee deducted: ${fmt(order.feeDeducted)})</p>
              )}
              <p className="text-gray-500">Authorised by: {manager?.name}</p>
            </div>
            <button
              onClick={onAborted}
              className="w-full py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
