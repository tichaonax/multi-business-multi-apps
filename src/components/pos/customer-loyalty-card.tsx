'use client'

import { useEffect, useRef } from 'react'
import { PrintCardToReceiptPrinter } from '@/components/ui/print-card-to-receipt-printer'

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
  printId?: string
}

export function CustomerLoyaltyCard({ customer, businessName, businessPhone, printId = 'customer-loyalty-card' }: CustomerLoyaltyCardProps) {
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
    <span className="text-black font-bold text-xs tracking-widest">
      LOYALTY CARD
    </span>
    {businessPhone && (
      <span className="text-gray-900 text-xs font-semibold">
        {businessPhone}
      </span>
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
          <span className="text-gray-900 text-[11px] font-mono font-semibold shrink-0">{customer.phone}</span>
        )}
      </div>

      {businessName && (
        <div className="text-gray-800 text-[11px] font-semibold leading-tight mt-0.5">{businessName}</div>
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

function buildPrintWindow(cardHtml: string, styles: string, title: string, autoPrint: boolean) {
  const printWindow = window.open('', '_blank', 'width=900,height=460')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
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
        ${autoPrint ? '<script>window.onload = () => { window.print(); window.close(); }<\/script>' : ''}
      </body>
    </html>
  `)
  printWindow.document.close()
}

export function PrintLoyaltyCardButton({ customer, businessId }: CustomerLoyaltyCardProps) {
  const getCardData = () => {
    const cardEl = document.getElementById('customer-loyalty-card')
    if (!cardEl) return null

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n')
        } catch {
          return ''
        }
      })
      .join('\n')

    return { cardHtml: cardEl.outerHTML, styles }
  }

  const printCard = () => {
    const data = getCardData()
    if (!data) return
    buildPrintWindow(data.cardHtml, data.styles, `Loyalty Card — ${customer.name}`, true)
  }

  const openPreview = () => {
    const data = getCardData()
    if (!data) return
    buildPrintWindow(data.cardHtml, data.styles, `Loyalty Card — ${customer.name}`, false)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={printCard}
          className="flex-1 py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center justify-center gap-2"
        >
          🖨️ Print Loyalty Card
        </button>
        <button
          onClick={openPreview}
          title="Open card — use browser Print (Ctrl+P) to save as PDF or send to a file printer"
          className="px-3 py-1.5 text-sm border border-teal-600 text-teal-700 dark:text-teal-400 rounded-md hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-1"
        >
          💾 Save
        </button>
      </div>
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
