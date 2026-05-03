'use client'

import { useState } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { generateComboVoucherPdf, ComboVoucherData } from './combo-payment-voucher-pdf'

interface VoucherItem {
  id: string
  description: string
  quantity: number | null
  unit: string | null
  estimatedAmount: number | null
  approvedAmount: number | null
  isPaid: boolean
  paidAmount: number | null
  receiptNumber: string | null
}

interface VoucherSection {
  id: string
  sectionType: string
  sectionName: string | null
  payeeType: string | null
  items: VoucherItem[]
}

interface VoucherRequest {
  id: string
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
  creator: { id: string; name: string }
  approver: { id: string; name: string } | null
  sections: VoucherSection[]
}

interface ComboVoucherModalProps {
  isOpen: boolean
  onClose: () => void
  request: VoucherRequest
  accountName: string
  accountNumber: string
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  PARTIALLY_APPROVED: 'Partially Approved',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
}

function fmt(n: number | null) {
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

export function ComboVoucherModal({
  isOpen,
  onClose,
  request,
  accountName,
  accountNumber,
}: ComboVoucherModalProps) {
  const toast = useToastContext()
  const [generating, setGenerating] = useState(false)

  if (!isOpen) return null

  const effectiveRequested = request.overrideAmount ?? request.requestedAmount
  const allItems = request.sections.flatMap(s => s.items)
  const totalItems = allItems.length
  const paidItems = allItems.filter(i => i.isPaid).length
  const notFundedItems = allItems.filter(i => i.approvedAmount !== null && i.approvedAmount === 0).length
  const fundedItems = totalItems - notFundedItems
  const allFundedPaid = paidItems === fundedItems && fundedItems > 0
  const totalPaid = allItems.reduce((sum, i) => sum + (i.paidAmount ?? 0), 0)
  const changeToReturn = allFundedPaid && request.approvedAmount !== null && request.approvedAmount > totalPaid
    ? request.approvedAmount - totalPaid
    : null

  function handleDownload() {
    setGenerating(true)
    try {
      const voucherData: ComboVoucherData = {
        requestId: request.id,
        title: request.title,
        status: STATUS_LABELS[request.status] ?? request.status,
        requestedAmount: request.requestedAmount,
        overrideAmount: request.overrideAmount,
        approvedAmount: request.approvedAmount,
        approvalNote: request.approvalNote,
        notes: request.notes,
        submittedAt: request.submittedAt,
        approvedAt: request.approvedAt,
        paidAt: request.paidAt,
        creatorName: request.creator.name,
        approverName: request.approver?.name ?? null,
        accountName,
        accountNumber,
        sections: request.sections.map(s => ({
          sectionType: s.sectionType,
          sectionName: s.sectionName,
          payeeType: s.payeeType,
          items: s.items.map(i => ({
            description: i.description,
            quantity: i.quantity,
            unit: i.unit,
            estimatedAmount: i.estimatedAmount,
            approvedAmount: i.approvedAmount,
            isPaid: i.isPaid,
            paidAmount: i.paidAmount,
            receiptNumber: i.receiptNumber,
          })),
        })),
      }
      generateComboVoucherPdf(voucherData)
      toast.push('Voucher downloaded')
    } catch {
      toast.error('Failed to generate voucher')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payment Voucher</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview summary */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Request</span>
              <span className="font-medium text-gray-900 text-right max-w-[60%] truncate">{request.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account</span>
              <span className="font-medium text-gray-900">{accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-gray-900">{STATUS_LABELS[request.status] ?? request.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Requested</span>
              <span className="font-medium text-gray-900">{fmt(effectiveRequested)}</span>
            </div>
            {request.approvedAmount !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Approved</span>
                <span className="font-medium text-green-700">{fmt(request.approvedAmount)}</span>
              </div>
            )}
            {changeToReturn !== null && (
              <div className="flex justify-between bg-amber-50 border border-amber-200 rounded px-2 py-1.5 -mx-1">
                <span className="text-amber-700 font-medium">⚠ Change to Return</span>
                <span className="font-bold text-amber-800">{fmt(changeToReturn)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="text-gray-500">Items</span>
              <span className="text-gray-700">
                {totalItems} total
                {paidItems > 0 && ` · ${paidItems} paid`}
                {notFundedItems > 0 && ` · ${notFundedItems} not funded`}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            The PDF includes all sections, line items, approval details, settlement summary, and signature lines.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <>Generating...</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
