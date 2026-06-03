'use client'

import { useState, useEffect } from 'react'
import { UnifiedReceiptPreviewModal } from '@/components/receipts/unified-receipt-preview-modal'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'
import type { ReceiptData } from '@/types/printing'

interface Line {
  categoryName: string
  weightKg: number
  pricePerKg: number
  totalAmount: number
}

interface Session {
  id: string
  status: string
  totalWeightKg: number
  totalAmount: number
  submittedAt: string | null
  createdAt: string
  business_suppliers: { name: string; phone?: string | null } | null
  livestock_purchase_lines: Line[]
}

interface Props {
  businessId: string
  businessType: 'grocery' | 'restaurant'
}

export function LivestockReprintHistory({ businessId, businessType }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [reprintData, setReprintData] = useState<ReceiptData | null>(null)

  useEffect(() => {
    fetch(`/api/livestock-purchase/sessions?businessId=${businessId}`)
      .then(r => r.json())
      .then((data: Session[]) => {
        const submitted = Array.isArray(data) ? data.filter(s => s.status === 'SUBMITTED') : []
        setSessions(submitted.slice(0, 10))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [businessId])

  async function handleReprint(s: Session) {
    const businessRes = await fetch(`/api/business/${businessId}`)
    const businessData = businessRes.ok ? await businessRes.json() : {}
    const biz = businessData.data ?? businessData

    const shortId = s.id.slice(-6).toUpperCase()
    const receipt: ReceiptData = {
      receiptNumber: {
        globalId: s.id,
        dailySequence: shortId,
        formattedNumber: `LSP-${shortId}`,
      },
      businessId,
      businessType,
      businessName: biz.businessName ?? biz.name ?? 'Business',
      businessAddress: biz.address ?? '',
      businessPhone: biz.phone ?? '',
      transactionId: s.id,
      transactionDate: new Date(s.submittedAt ?? s.createdAt),
      salespersonName: s.business_suppliers?.name ?? 'Unknown Vendor',
      salespersonId: 'vendor',
      items: s.livestock_purchase_lines.map(l => ({
        name: `${l.categoryName}`,
        quantity: 1,
        unitPrice: Number(l.totalAmount),
        totalPrice: Number(l.totalAmount),
        notes: `${Number(l.weightKg).toFixed(3)} kg @ $${Number(l.pricePerKg).toFixed(2)}/kg`,
      })),
      subtotal: Number(s.totalAmount),
      tax: 0,
      hideTax: true,
      total: Number(s.totalAmount),
      paymentMethod: 'Expense Account',
      footerMessage: [
        s.business_suppliers?.phone ? `Tel: ${s.business_suppliers.phone}` : '',
        'Present this voucher to the cashier to claim payment.',
      ].filter(Boolean).join('  \u2022  '),
      isReprint: true,
    }
    setReprintData(receipt)
  }

  if (loading) return null

  if (sessions.length === 0) return null

  return (
    <>
      <div className="mt-6 max-w-md">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Vendor Payments</h2>
        <div className="space-y-2">
          {sessions.map(s => (
            <div
              key={s.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {s.business_suppliers?.name ?? '—'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(s.submittedAt ?? s.createdAt).toLocaleDateString()} · {Number(s.totalWeightKg).toFixed(2)} kg
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  ${Number(s.totalAmount).toFixed(2)}
                </span>
                <button
                  onClick={() => handleReprint(s)}
                  className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Reprint
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <UnifiedReceiptPreviewModal
        isOpen={reprintData != null}
        receiptData={reprintData}
        businessType={businessType}
        title="Print Voucher"
        onClose={() => setReprintData(null)}
        onPrintConfirm={async (options) => {
          if (!reprintData) return
          await ReceiptPrintManager.printReceipt(reprintData, businessType, {
            ...options,
            autoPrint: true,
          })
        }}
      />
    </>
  )
}
