'use client'

import { useEffect, useRef } from 'react'

interface CustomerLoyaltyCardProps {
  customer: {
    id: string
    customerNumber: string
    name: string
    phone?: string | null
    businessName?: string | null
  }
}

export function CustomerLoyaltyCard({ customer }: CustomerLoyaltyCardProps) {
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
      id="customer-loyalty-card"
      className="inline-block bg-white border-2 border-teal-600 rounded-lg overflow-hidden shadow-lg"
      style={{ width: '314px', fontFamily: 'sans-serif' }}
    >
      {/* Header strip */}
      <div className="bg-teal-600 px-3 py-1.5 flex items-center justify-between">
        <span className="text-white font-bold text-xs tracking-wide">LOYALTY CARD</span>
        {customer.businessName && (
          <span className="text-teal-200 text-xs truncate ml-2 max-w-[160px]">{customer.businessName}</span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 pt-3 pb-1 flex gap-3 items-center">
        {/* Avatar placeholder — future: customer photo */}
        <div className="flex-shrink-0">
          <div className="w-14 h-14 rounded-md bg-teal-50 border border-teal-200 flex items-center justify-center text-2xl select-none">
            🛍️
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="font-bold text-gray-900 text-sm leading-tight truncate">{customer.name}</div>
          <div className="text-teal-700 text-xs font-medium mt-0.5 font-mono">{customer.customerNumber}</div>
          {customer.phone && (
            <div className="text-gray-600 text-xs mt-0.5">{customer.phone}</div>
          )}
        </div>
      </div>

      {/* Barcode */}
      <div className="px-3 pb-3 flex flex-col items-center">
        <svg ref={barcodeRef} />
        <span className="text-xs text-gray-500 mt-0.5 font-mono tracking-wide">{customer.customerNumber}</span>
      </div>
    </div>
  )
}

export function PrintLoyaltyCardButton({ customer }: CustomerLoyaltyCardProps) {
  const printCard = () => {
    const cardEl = document.getElementById('customer-loyalty-card')
    if (!cardEl) return

    const printWindow = window.open('', '_blank', 'width=900,height=460')
    if (!printWindow) return

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n')
        } catch {
          return ''
        }
      })
      .join('\n')

    const cardHtml = cardEl.outerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loyalty Card — ${customer.name}</title>
          <style>
            ${styles}
            html, body { height: 100%; margin: 0; padding: 0; }
            body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .card-pair { display: inline-flex; align-items: flex-start; gap: 0; }
            .fold-guide { width: 0; align-self: stretch; border-left: 2px dashed #888; }
            @media print {
              html, body { height: 100vh; margin: 0; padding: 0; }
              .fold-guide { border-left-color: #bbb; }
            }
          </style>
        </head>
        <body>
          <div class="card-pair">
            ${cardHtml}
            <div class="fold-guide"></div>
            ${cardHtml}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <button
      onClick={printCard}
      className="w-full py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center justify-center gap-2"
    >
      🖨️ Print Loyalty Card
    </button>
  )
}
