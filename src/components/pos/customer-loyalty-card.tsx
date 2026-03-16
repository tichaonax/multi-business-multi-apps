'use client'

import { useEffect, useRef } from 'react'
import { PrintCardToReceiptPrinter } from '@/components/ui/print-card-to-receipt-printer'

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const clean = phone.replace(/\s+/g, '')
  if (clean.startsWith('+263') && clean.length === 13) {
    return `+263 ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`
  }
  if (clean.startsWith('0') && clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
  }
  if (clean.length === 9 && /^[67]/.test(clean)) {
    return `0${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`
  }
  return phone
}

interface CustomerLoyaltyCardProps {
  customer: {
    id: string
    customerNumber: string
    name: string
    phone?: string | null
  }
  businessId?: string
  businessName?: string | null
  businessPhone?: string | null
  umbrellaBusinessName?: string | null
  printId?: string
}

export function CustomerLoyaltyCard({ customer, businessName, businessPhone, umbrellaBusinessName, printId = 'customer-loyalty-card' }: CustomerLoyaltyCardProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = barcodeRef.current
    if (!el) return
    import('jsbarcode').then((JsBarcode) => {
      if (!el.isConnected) return
      try {
        JsBarcode.default(el, customer.customerNumber, {
          format: 'CODE128',
          width: 1.2,
          height: 30,
          displayValue: false,
          margin: 8,
        })
        el.style.maxWidth = '100%'
        el.style.display = 'block'
      } catch {
        // Element may have been replaced between import and render
      }
    })
  }, [customer.customerNumber])

  return (
    <div
      id={printId}
      className="inline-block bg-white border-2 border-gray-800 rounded-lg overflow-hidden shadow-lg"
      style={{ width: '314px', fontFamily: 'sans-serif' }}
    >
      {/* Header strip */}
      <div className="bg-white px-3 py-1 border-b border-gray-300 flex items-center justify-between gap-2">
        <span className="text-black font-bold text-xs tracking-widest">LOYALTY CARD</span>
        {businessPhone && (
          <span className="text-gray-900 text-xs font-semibold">{formatPhone(businessPhone)}</span>
        )}
      </div>

      {/* Body — avatar + customer info */}
      <div className="px-3 pt-1 pb-1.5 flex gap-2 items-center">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-md bg-gray-100 border border-gray-300 flex items-center justify-center text-xl select-none">
            🛍️
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm leading-tight break-words">{customer.name}</div>

          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="text-gray-900 text-[11px] font-mono font-semibold">{customer.customerNumber}</span>
            {customer.phone && (
              <span className="text-gray-900 text-[11px] font-mono font-semibold shrink-0">{formatPhone(customer.phone)}</span>
            )}
          </div>

          {(businessName || umbrellaBusinessName) && (
            <div className="flex items-center justify-between gap-1 mt-0.5">
              {businessName && <span className="text-gray-800 text-[11px] font-semibold leading-tight">{businessName}</span>}
              {umbrellaBusinessName && <span className="text-gray-900 text-[12px] font-bold leading-tight text-right">{umbrellaBusinessName}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Barcode */}
      <div className="px-3 pb-2 flex flex-col items-center">
        <svg ref={barcodeRef} />
      </div>
    </div>
  )
}

// ─── Shared card HTML builder for print window ────────────────────────────────

export async function buildPrintCardHtml(
  customer: { customerNumber: string; name: string; phone?: string | null },
  businessName: string | null | undefined,
  businessPhone: string | null | undefined,
  umbrellaBusinessName: string | null | undefined,
): Promise<string> {
  const JsBarcode = (await import('jsbarcode')).default
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  document.body.appendChild(svg)
  try {
    JsBarcode(svg, customer.customerNumber, { format: 'CODE128', width: 1.2, height: 30, displayValue: false, margin: 8 })
  } catch { /* ignore */ }
  const barcodeSvg = svg.outerHTML
  document.body.removeChild(svg)

  const fmtPhone = (p: string | null | undefined) => {
    if (!p) return ''
    const clean = p.replace(/\s+/g, '')
    if (clean.startsWith('+263') && clean.length === 13) return `+263 ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`
    if (clean.startsWith('0') && clean.length === 10) return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
    if (clean.length === 9 && /^[67]/.test(clean)) return `0${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`
    return p
  }

  return `
    <div style="display:inline-block;background:#fff;border:2px solid #1f2937;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);width:314px;font-family:sans-serif;vertical-align:top;">
      <div style="background:#fff;padding:5px 12px;border-bottom:1px solid #d1d5db;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:700;font-size:11px;letter-spacing:.08em;color:#111;">LOYALTY CARD</span>
        ${businessPhone ? `<span style="font-size:11px;font-weight:600;color:#111;">${fmtPhone(businessPhone)}</span>` : ''}
      </div>
      <div style="padding:8px 12px;display:flex;gap:10px;align-items:center;">
        <div style="flex-shrink:0;width:48px;height:48px;border-radius:8px;background:#f3f4f6;border:1px solid #d1d5db;display:flex;align-items:center;justify-content:center;font-size:22px;">🛍️</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:13px;color:#111;word-break:break-word;">${customer.name}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:2px;">
            <span style="font-size:11px;font-family:monospace;font-weight:600;color:#111;">${customer.customerNumber}</span>
            ${customer.phone ? `<span style="font-size:11px;font-family:monospace;font-weight:600;color:#111;white-space:nowrap;">${fmtPhone(customer.phone)}</span>` : ''}
          </div>
          ${(businessName || umbrellaBusinessName) ? `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:2px;">
            ${businessName ? `<span style="font-size:11px;font-weight:600;color:#1f2937;">${businessName}</span>` : '<span></span>'}
            ${umbrellaBusinessName ? `<span style="font-size:12px;font-weight:700;color:#111;">${umbrellaBusinessName}</span>` : ''}
          </div>` : ''}
        </div>
      </div>
      <div style="padding:0 12px 8px;display:flex;flex-direction:column;align-items:center;">
        ${barcodeSvg}
      </div>
    </div>`
}

export function openCardPrintWindow(title: string, cardHtml: string) {
  const printWindow = window.open('', '_blank', 'width=960,height=600')
  if (!printWindow) return
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      html,body{margin:0;padding:0;}
      body{padding:16px;}
      .print-toolbar{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:12px;z-index:100;}
      .print-btn{background:#1f2937;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:14px;font-weight:600;cursor:pointer;}
      .print-btn:hover{background:#374151;}
      .print-title{font-size:13px;color:#64748b;font-family:sans-serif;}
      .card-row{display:flex;align-items:flex-start;justify-content:center;margin-bottom:24px;page-break-inside:avoid;}
      .fold-guide{width:0;align-self:stretch;border-left:2px dashed #aaa;}
      @media print{.print-toolbar{display:none;}.fold-guide{border-left-color:#ccc;}body{padding:0;}}
    </style>
    </head><body>
    <div class="print-toolbar">
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <span class="print-title">${title}</span>
    </div>
    <div class="card-row">${cardHtml}<div class="fold-guide"></div>${cardHtml}</div>
    </body></html>`)
  printWindow.document.close()
}

export function PrintLoyaltyCardButton({ customer, businessId, businessName, businessPhone, umbrellaBusinessName }: CustomerLoyaltyCardProps) {
  const handlePrint = async () => {
    const cardHtml = await buildPrintCardHtml(customer, businessName, businessPhone, umbrellaBusinessName)
    openCardPrintWindow(`Loyalty Card — ${customer.name}`, cardHtml)
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePrint}
        className="w-full py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center justify-center gap-2"
      >
        🖨️ Print / Save as PDF
      </button>
      {businessId && (
        <PrintCardToReceiptPrinter
          cardElementId="customer-loyalty-card"
          businessId={businessId}
          label="Print Card to Receipt Printer"
        />
      )}
    </div>
  )
}
