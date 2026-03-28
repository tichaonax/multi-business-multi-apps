'use client'

import { useRef, useState } from 'react'
import { generatePayrollEntryPDF, PayrollEntryData } from '@/lib/pdf-utils'

interface PayrollSlipPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  data: PayrollEntryData
  fileName: string
}

function fmt(n: number) {
  return `$${Number(n).toFixed(2)}`
}

function Row({ label, value, bold, indent, color }: {
  label: string
  value: string
  bold?: boolean
  indent?: boolean
  color?: string
}) {
  return (
    <div className={`flex justify-between items-baseline py-0.5 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-bold text-gray-900' : color ? color : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-gray-200 my-2" />
}

function Section({ title }: { title: string }) {
  return (
    <div className="mt-3 mb-1">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</span>
    </div>
  )
}

export function PayrollSlipPreviewModal({ isOpen, onClose, data, fileName }: PayrollSlipPreviewModalProps) {
  const slipRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  if (!isOpen) return null

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await generatePayrollEntryPDF(data, fileName)
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    if (!slipRef.current) return
    const content = slipRef.current.innerHTML
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${fileName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111; background: #fff; padding: 24px; }
    .slip-header { text-align: center; margin-bottom: 16px; }
    .slip-header h1 { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
    .slip-header p { font-size: 11px; color: #555; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 11px; margin-bottom: 12px; }
    .info-grid .label { color: #777; }
    .info-grid .value { font-weight: 600; }
    hr { border: none; border-top: 1px solid #ddd; margin: 8px 0; }
    .section-title { font-size: 9px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #aaa; margin: 10px 0 4px; }
    .row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
    .row.indent { padding-left: 14px; }
    .row.bold { font-weight: bold; font-size: 12px; color: #111; }
    .row.deduction .value { color: #c00; }
    .row.net { font-size: 14px; font-weight: bold; color: #111; margin-top: 6px; }
    .footer { font-size: 9px; color: #aaa; text-align: center; margin-top: 16px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
${content}
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col w-full max-w-lg" style={{ maxHeight: '90vh' }}>

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Payroll Slip Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? 'Saving…' : 'Save PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1 text-lg leading-none">✕</button>
          </div>
        </div>

        {/* Slip content — scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          <div ref={slipRef} className="bg-white text-gray-900 rounded-lg border border-gray-200 p-6 shadow-sm">

            {/* Slip header */}
            <div className="slip-header text-center mb-4">
              <h1 className="text-lg font-bold tracking-wide uppercase">Projected Payroll Slip</h1>
              <p className="text-xs text-gray-500 mt-0.5">{data.periodMonth} {data.periodYear}</p>
              <p className="text-[10px] text-gray-400 italic">(Before required government deductions)</p>
              {data.businessName && <p className="text-xs font-semibold text-gray-700 mt-1">{data.businessName}</p>}
            </div>

            <hr className="border-gray-300 mb-3" />

            {/* Employee info grid */}
            <div className="info-grid grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
              <div><span className="text-gray-500">Name: </span><span className="font-semibold">{data.employeeName}</span></div>
              <div><span className="text-gray-500">Employee #: </span><span className="font-semibold">{data.employeeNumber}</span></div>
              <div><span className="text-gray-500">ID: </span><span className="font-semibold">{data.nationalId}</span></div>
              {data.jobTitle && <div><span className="text-gray-500">Position: </span><span className="font-semibold">{data.jobTitle}</span></div>}
              {data.startDate && <div><span className="text-gray-500">Start Date: </span><span className="font-semibold">{data.startDate}</span></div>}
              <div>
                <span className="text-gray-500">Days: </span>
                <span className="font-semibold">
                  {data.workDays}W {data.sickDays > 0 ? `/ ${data.sickDays}S` : ''} {data.absenceDays > 0 ? `/ ${data.absenceDays}A` : ''}
                </span>
              </div>
            </div>

            <hr className="border-gray-300 mb-1" />

            {/* Earnings */}
            <Section title="Earnings" />
            <Row label="Base Salary" value={fmt(data.baseSalary)} />
            {data.commission > 0 && <Row label="Commission" value={fmt(data.commission)} indent />}
            {data.overtimePay > 0 && <Row label="Overtime Pay" value={fmt(data.overtimePay)} indent />}
            {(data.perDiem ?? 0) > 0 && <Row label="Per Diem" value={fmt(data.perDiem!)} indent />}
            {data.benefits.map((b, i) => (
              <Row key={i} label={b.name} value={fmt(b.amount)} indent />
            ))}
            {data.adjustments > 0 && <Row label="Additions / Adjustments" value={fmt(data.adjustments)} indent />}
            {(data.absenceDeduction ?? 0) > 0 && (
              <Row label="Absence Deduction" value={`-${fmt(data.absenceDeduction!)}`} indent color="text-red-600" />
            )}

            <Divider />
            <Row label="Gross Pay" value={fmt(data.grossPay)} bold />

            {/* Deductions */}
            <Section title="Deductions" />
            {data.advances.map((a, i) => (
              <Row key={i} label={a.description} value={`-${fmt(a.amount)}`} indent color="text-red-600" />
            ))}
            {data.loans.map((l, i) => (
              <Row key={i} label={l.description} value={`-${fmt(l.amount)}`} indent color="text-red-600" />
            ))}
            {data.miscDeductions > 0 && (
              <Row label="Misc Deductions" value={`-${fmt(data.miscDeductions)}`} indent color="text-red-600" />
            )}
            {data.otherDeductions.map((d, i) => (
              <Row key={i} label={d.description} value={`-${fmt(d.amount)}`} indent color="text-red-600" />
            ))}
            {data.totalDeductions > 0 ? (
              <>
                <Divider />
                <Row label="Total Deductions" value={`-${fmt(data.totalDeductions)}`} bold color="text-red-600" />
              </>
            ) : (
              <Row label="No deductions" value="—" indent />
            )}

            {/* Net pay */}
            <div className="mt-3 pt-3 border-t-2 border-gray-900 flex justify-between items-baseline">
              <span className="text-base font-bold uppercase tracking-wide text-gray-900">Net Pay</span>
              <span className="text-xl font-bold text-green-700">{fmt(data.netPay)}</span>
            </div>

            {/* Footer */}
            <p className="text-[9px] text-gray-400 text-center mt-4">
              This is a projected payslip and does not include statutory deductions (PAYE, NSSA, etc).
              Generated {new Date().toLocaleDateString()}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
