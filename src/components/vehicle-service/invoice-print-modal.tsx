'use client'

import { useRef, useState } from 'react'
import { formatPhoneNumberLocal, formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface InvoicePrintModalProps {
  isOpen: boolean
  onClose: () => void
  job: any
  billParts: Array<{ name: string; quantity: number; unitPrice: number }>
  otherCharges: Array<{ description: string; amount: string }>
  result: { orderNumber: string; subtotal: number; taxAmount: number; discountAmount: number; totalAmount: number } | null
  taxLabel: string
}

// In-app print preview for the generated customer invoice — same
// same-tab-preview-then-throwaway-popup technique as JobCardPrintModal (see
// MBM-264 follow-ups), and the same "no bare/collision-prone class names on
// the live preview" fix from the dark-mode bugfix that followed it.
//
// Deliberately shows full pricing (unlike the Job Card) — this document IS
// the customer invoice. Payment hasn't been collected yet at this point
// (see MBM-266) — that happens later, separately, via Collect Payment.
export function InvoicePrintModal({ isOpen, onClose, job, billParts, otherCharges, result, taxLabel }: InvoicePrintModalProps) {
  const { format: dateFormat } = useDateFormat()
  const contentRef = useRef<HTMLDivElement>(null)
  const [printing, setPrinting] = useState(false)

  if (!isOpen || !job || !result) return null

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const otherLines = otherCharges.filter(c => c.description && parseFloat(c.amount) > 0)

  const handlePrint = () => {
    if (!contentRef.current) return
    setPrinting(true)
    const content = contentRef.current.innerHTML
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) { setPrinting(false); return }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice — ${result.orderNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #111; background: #fff; margin: 0; padding: 32px; }
    table { width: 100%; font-size: 14px; border-collapse: collapse; }
    th { text-align: left; padding: 4px 0; border-bottom: 1px solid #999; }
    td { padding: 6px 8px 6px 0; border-bottom: 1px solid #eee; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
${content}
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
      setPrinting(false)
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col w-full max-w-2xl" style={{ maxHeight: '90vh' }}>

        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Invoice — Print Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {printing ? 'Opening…' : '🖨️ Print / Save PDF'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1 text-lg leading-none">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-800">
          <div ref={contentRef} style={{ background: '#fff', color: '#111', padding: 24, fontSize: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 16 }}>
              <h1 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>INVOICE</h1>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div>Invoice #{result.orderNumber}</div>
                <div>{formatDateByFormat(new Date().toISOString(), dateFormat)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', margin: '0 0 2px' }}>Vehicle</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{[job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ') || '—'}</p>
                {job.vehiclePlate && <p style={{ margin: 0 }}>Plate: {job.vehiclePlate}</p>}
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', margin: '0 0 2px' }}>Customer</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{job.business_customers?.name || 'Walk-in customer'}</p>
                {job.business_customers?.phone && <p style={{ margin: 0 }}>{formatPhoneNumberLocal(job.business_customers.phone)}</p>}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {job.tasks?.map((t: any) => (
                  <tr key={t.id}>
                    <td>{t.subcategory?.emoji} {t.subcategory?.name} — Labour</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(Number(t.customerPriceOverride ?? t.customerLabourRate ?? t.agreedFeeAmount))}</td>
                  </tr>
                ))}
                {job.jobParts?.map((jp: any) => (
                  <tr key={jp.id}>
                    <td>{jp.productVariant?.business_products?.name} × {jp.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(Number(jp.unitPrice) * jp.quantity)}</td>
                  </tr>
                ))}
                {billParts.map((p, i) => (
                  <tr key={`bp-${i}`}>
                    <td>{p.name} × {p.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(p.unitPrice * p.quantity)}</td>
                  </tr>
                ))}
                {otherLines.map((c, i) => (
                  <tr key={`oc-${i}`}>
                    <td>{c.description}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(parseFloat(c.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 16, marginLeft: 'auto', maxWidth: 260 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Subtotal</span><span>{formatCurrency(result.subtotal)}</span></div>
              {result.taxAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>{taxLabel}</span><span>{formatCurrency(result.taxAmount)}</span></div>}
              {result.discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Discount</span><span>-{formatCurrency(result.discountAmount)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '2px solid #000', fontWeight: 'bold', fontSize: 16 }}>
                <span>Total Due</span><span>{formatCurrency(result.totalAmount)}</span>
              </div>
            </div>

            <div style={{ marginTop: 24, padding: '10px 12px', border: '1px solid #d97706', background: '#fffbeb', color: '#92400e', fontSize: 13, textAlign: 'center' }}>
              AWAITING PAYMENT — please present this invoice to the cashier to pay.
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
