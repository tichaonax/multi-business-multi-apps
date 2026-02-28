'use client'

import { useEffect, useRef } from 'react'

interface EmployeeIdCardProps {
  employee: {
    id: string
    fullName: string
    employeeNumber: string
    phone?: string | null
    profilePhotoUrl?: string | null
    scheduledStartTime?: string | null
    scheduledEndTime?: string | null
    jobTitle?: { title: string; department?: string | null } | null
    primaryBusiness?: { name: string; phone?: string | null; umbrellaBusinessPhone?: string | null } | null
  }
}

export function EmployeeIdCard({ employee }: EmployeeIdCardProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!barcodeRef.current) return
    import('jsbarcode').then((JsBarcode) => {
      JsBarcode.default(barcodeRef.current!, employee.employeeNumber, {
        format: 'CODE128',
        width: 1.2,
        height: 30,
        displayValue: true,
        fontSize: 9,
        margin: 3,
      })
    })
  }, [employee.employeeNumber])

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
      <div className="bg-blue-600 px-3 py-1.5 flex items-center justify-between">
        <span className="text-white font-bold text-xs tracking-wide">EMPLOYEE ID CARD</span>
        {employee.primaryBusiness?.name && (
          <span className="text-blue-200 text-xs truncate ml-2 max-w-[140px]">{employee.primaryBusiness.name}</span>
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
              className="w-14 h-14 rounded-md object-cover border border-gray-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl">
              👤
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="font-bold text-gray-900 text-sm leading-tight truncate">{employee.fullName}</div>
          {employee.jobTitle && (
            <div className="text-blue-700 text-xs font-medium mt-0.5 truncate">{employee.jobTitle.title}</div>
          )}
          {employee.jobTitle?.department && (
            <div className="text-gray-500 text-xs truncate">{employee.jobTitle.department}</div>
          )}
          {(employee.primaryBusiness?.phone || employee.primaryBusiness?.umbrellaBusinessPhone || employee.phone) && (
            <div className="text-gray-600 text-xs mt-0.5">
              {employee.primaryBusiness?.phone || employee.primaryBusiness?.umbrellaBusinessPhone || employee.phone}
            </div>
          )}
          {hours && (
            <div className="text-gray-500 text-xs mt-0.5">
              <span className="font-medium text-gray-700">{hours}</span>
            </div>
          )}
        </div>
      </div>

      {/* Barcode */}
      <div className="px-3 pb-3 flex justify-center">
        <svg ref={barcodeRef} />
      </div>
    </div>
  )
}

export function PrintIdCardButton({ employee }: EmployeeIdCardProps) {
  const printCard = () => {
    const cardEl = document.getElementById('employee-id-card')
    if (!cardEl) return

    const printWindow = window.open('', '_blank', 'width=720,height=420')
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
            body { margin: 20px; display: flex; justify-content: center; align-items: flex-start; }
            .card-pair { display: inline-flex; align-items: flex-start; gap: 0; }
            .fold-guide { width: 0; align-self: stretch; border-left: 2px dashed #888; }
            @media print {
              body { margin: 0; padding: 10px; }
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
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
    >
      🖨️ Print ID Card
    </button>
  )
}
