'use client'

import { useEffect, useRef } from 'react'
import { PrintCardToReceiptPrinter } from '@/components/ui/print-card-to-receipt-printer'

interface EmployeeIdCardProps {
  employee: {
    id: string
    fullName: string
    employeeNumber: string
    scanToken: string
    phone?: string | null
    businessContactPhone?: string | null
    profilePhotoUrl?: string | null
    scheduledStartTime?: string | null
    scheduledEndTime?: string | null
    jobTitle?: { title: string; department?: string | null } | null
    primaryBusiness?: { id?: string; name: string; phone?: string | null; umbrellaBusinessPhone?: string | null } | null
  }
}

export function EmployeeIdCard({ employee }: EmployeeIdCardProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = barcodeRef.current
    if (!el) return
    import('jsbarcode').then((JsBarcode) => {
      if (!el.isConnected) return
      try {
        JsBarcode.default(el, employee.scanToken, {
          format: 'CODE128',
          width: 1.2,
          height: 30,
          displayValue: false,
          margin: 8,
        })
        // Constrain after render — CSS style overrides jsbarcode's fixed width attribute
        el.style.maxWidth = '100%'
        el.style.display = 'block'
      } catch {
        // Element may have been replaced between import and render — safe to ignore
      }
    })
  }, [employee.scanToken])

  const hours =
    employee.scheduledStartTime && employee.scheduledEndTime
      ? `${employee.scheduledStartTime} – ${employee.scheduledEndTime}`
      : null

  return (
    <div
      id="employee-id-card"
      className="inline-block bg-white border-2 border-blue-600 rounded-lg overflow-hidden shadow-lg"
      style={{ width: '314px', fontFamily: 'sans-serif' }}
    >
      {/* Header strip */}
      <div className="bg-blue-600 px-3 py-2 flex items-center justify-between">
        <span className="text-white font-bold text-xs tracking-wide leading-normal">EMPLOYEE ID CARD</span>
        {employee.primaryBusiness?.name && (
          <span className="text-blue-200 text-xs ml-2 max-w-[140px] whitespace-nowrap leading-normal" style={{overflow:'visible'}}>{employee.primaryBusiness.name}</span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 pt-3 pb-1 flex gap-3">
        {/* Photo */}
        <div className="flex-shrink-0">
          {employee.profilePhotoUrl ? (
            <img
              src={employee.profilePhotoUrl}
              alt={employee.fullName}
              className="w-14 h-14 rounded-md object-cover border border-gray-200" style={{ filter: 'brightness(1.9) contrast(0.7)' }}
            />
          ) : (
            <div className="w-14 h-14 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl">
              👤
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="font-bold text-gray-900 text-sm leading-relaxed whitespace-nowrap">{employee.fullName}</div>
          {employee.jobTitle && (
            <div className="text-blue-700 text-xs font-medium mt-0.5 leading-relaxed whitespace-nowrap">{employee.jobTitle.title}</div>
          )}
          {employee.jobTitle?.department && (
            <div className="text-gray-500 text-xs leading-relaxed whitespace-nowrap">{employee.jobTitle.department}</div>
          )}
          {(employee.businessContactPhone || employee.primaryBusiness?.phone || employee.primaryBusiness?.umbrellaBusinessPhone || employee.phone) && (
            <div className="text-gray-600 text-xs mt-0.5">
              {employee.businessContactPhone || employee.primaryBusiness?.phone || employee.primaryBusiness?.umbrellaBusinessPhone || employee.phone}
            </div>
          )}
          {hours && (
            <div className="text-gray-500 text-xs mt-0.5 leading-normal">
              <span className="font-medium text-gray-700">{hours}</span>
            </div>
          )}
        </div>
      </div>

      {/* Barcode */}
      <div className="px-3 pb-3 flex flex-col items-center">
        <svg ref={barcodeRef} />
        <span className="text-xs text-gray-500 mt-0.5 tracking-wide">{employee.employeeNumber}</span>
      </div>
    </div>
  )
}

export function PrintIdCardButton({ employee }: EmployeeIdCardProps) {
  const printCard = () => {
    const cardEl = document.getElementById('employee-id-card')
    if (!cardEl) return

    const printWindow = window.open('', '_blank', 'width=900,height=520')
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
          <title>Employee ID Card — ${employee.fullName}</title>
          <style>
            ${styles}
            html, body { height: 100%; margin: 0; padding: 0; }
            body { display: flex; flex-direction: column; align-items: center; padding: 16px; }
            .print-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding: 10px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%; max-width: 700px; box-sizing: border-box; }
            .print-btn { background: #1f2937; color: #fff; border: none; border-radius: 6px; padding: 8px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
            .print-btn:hover { background: #374151; }
            .print-title { font-size: 13px; color: #64748b; }
            .card-pair { display: inline-flex; align-items: flex-start; gap: 0; }
            .fold-guide { width: 0; align-self: stretch; border-left: 2px dashed #888; }
            @media print {
              .print-toolbar { display: none; }
              body { padding: 5mm; }
              .fold-guide { border-left-color: #bbb; }
            }
          </style>
        </head>
        <body>
          <div class="print-toolbar">
            <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
            <span class="print-title">ID Card — ${employee.fullName}</span>
          </div>
          <div class="card-pair">
            ${cardHtml}
            <div class="fold-guide"></div>
            ${cardHtml}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={printCard}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
      >
        🖨️ Print ID Card
      </button>
      {employee.primaryBusiness?.id && (
        <PrintCardToReceiptPrinter
          cardElementId="employee-id-card"
          businessId={employee.primaryBusiness.id}
          label="Print Card to Receipt Printer"
        />
      )}
    </div>
  )
}

export function EmployeeIdCardModal({
  employee,
  onClose,
}: {
  employee: EmployeeIdCardProps['employee']
  onClose: () => void
}) {
  const printDoubleCard = () => {
    const cardEl = document.getElementById('employee-id-card')
    if (!cardEl) return
    const printWindow = window.open('', '_blank', 'width=900,height=520')
    if (!printWindow) return
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n') }
        catch { return '' }
      })
      .join('\n')
    const cardHtml = cardEl.outerHTML
    printWindow.document.write(`<!DOCTYPE html><html><head><title>ID Card \u2014 ${employee.fullName}</title><style>${styles}
      html,body{height:100%;margin:0;padding:0;}
      body{display:flex;flex-direction:column;align-items:center;padding:16px;}
      .print-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;width:100%;max-width:700px;box-sizing:border-box;}
      .print-btn{background:#1f2937;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:14px;font-weight:600;cursor:pointer;}
      .print-btn:hover{background:#374151;}
      .print-title{font-size:13px;color:#64748b;}
      .card-pair{display:inline-flex;align-items:flex-start;}
      .fold-guide{width:0;align-self:stretch;border-left:2px dashed #888;}
      @media print{.print-toolbar{display:none;}body{padding:5mm;}.fold-guide{border-left-color:#bbb;}}
    </style></head><body>
    <div class="print-toolbar">
      <button class="print-btn" onclick="window.print()">${'\uD83D\uDDA8'} Print / Save as PDF</button>
      <span class="print-title">ID Card \u2014 ${employee.fullName}</span>
    </div>
    <div class="card-pair">${cardHtml}<div class="fold-guide"></div>${cardHtml}</div>
    </body></html>`)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-5 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">🪪 Employee ID Card</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
        <EmployeeIdCard employee={employee} />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Close
          </button>
          <button
            onClick={printDoubleCard}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            🖨️ Print
          </button>
        </div>
        {employee.primaryBusiness?.id && (
          <div className="mt-3">
            <PrintCardToReceiptPrinter
              cardElementId="employee-id-card"
              businessId={employee.primaryBusiness.id}
              label="Print to Receipt Printer"
            />
          </div>
        )}
      </div>
    </div>
  )
}
