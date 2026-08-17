'use client'

import { useRef, useState } from 'react'
import { formatPhoneNumberLocal, formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface JobCardPrintModalProps {
  isOpen: boolean
  onClose: () => void
  job: any
}

// In-app print preview — opens in the same tab (no app-route navigation, so the
// app itself never reloads). "Print" writes the preview's markup into a small
// blank popup and calls window.print() on it, the same technique used by
// StockTakePrintModal — only that throwaway popup ever sees a print dialog.
//
// Work document only — deliberately renders no pricing, fees, or charges
// anywhere, even though the underlying job detail API returns them to
// authorised viewers. See MBM-262 Decision #2.
export function JobCardPrintModal({ isOpen, onClose, job }: JobCardPrintModalProps) {
  const { format: dateFormat } = useDateFormat()
  const contentRef = useRef<HTMLDivElement>(null)
  const [printing, setPrinting] = useState(false)

  if (!isOpen || !job) return null

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
  <title>Job Card — ${job.id.slice(0, 8).toUpperCase()}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #111; background: #fff; margin: 0; padding: 32px; }
    .card { border: 2px solid #000; padding: 24px; max-width: 640px; margin: 0 auto; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: bold; margin: 0; }
    .meta { text-align: right; font-size: 12px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 14px; }
    .label { font-size: 11px; color: #666; text-transform: uppercase; margin: 0 0 2px; }
    .value { font-weight: 600; margin: 0; }
    .section { margin-bottom: 16px; font-size: 14px; }
    .worktitle { border-top: 2px solid #000; padding-top: 12px; }
    table { width: 100%; font-size: 14px; border-collapse: collapse; }
    th { text-align: left; padding: 4px 0; border-bottom: 1px solid #999; }
    td { padding: 8px 8px 8px 0; border-bottom: 1px solid #ddd; }
    .sign { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ccc; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; font-size: 12px; }
    .sign-line { border-bottom: 1px solid #666; height: 32px; }
    @media print { body { padding: 0; } .card { border: none; max-width: none; } }
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
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Job Card — Print Preview</h2>
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
          <div ref={contentRef} className="bg-white text-gray-900 rounded shadow-sm" style={{ background: '#fff', color: '#111' }}>
            <div style={{ border: '2px solid #000', padding: 24, background: '#fff', color: '#111' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 16 }}>
                <h1 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>JOB CARD</h1>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <div>Job #{job.id.slice(0, 8).toUpperCase()}</div>
                  <div>{formatDateByFormat(job.createdAt, dateFormat)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, fontSize: 14 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', margin: '0 0 2px' }}>Vehicle</p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{[job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ') || '—'}</p>
                  {job.vehiclePlate && <p style={{ margin: 0 }}>Plate: {job.vehiclePlate}</p>}
                  {job.vehicleVin && <p style={{ margin: 0 }}>VIN: {job.vehicleVin}</p>}
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', margin: '0 0 2px' }}>Customer</p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{job.business_customers?.name || 'Walk-in customer'}</p>
                  {job.business_customers?.phone && <p style={{ margin: 0 }}>{formatPhoneNumberLocal(job.business_customers.phone)}</p>}
                </div>
              </div>

              <div style={{ marginBottom: 16, fontSize: 14 }}>
                <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', margin: '0 0 2px' }}>Primary Contractor</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{job.primaryContractor?.persons?.fullName || '—'}</p>
              </div>

              {job.notes && (
                <div style={{ marginBottom: 16, fontSize: 14 }}>
                  <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', margin: '0 0 2px' }}>Job Notes</p>
                  <p style={{ margin: 0 }}>{job.notes}</p>
                </div>
              )}

              <div style={{ borderTop: '2px solid #000', paddingTop: 12 }}>
                <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', margin: '0 0 8px' }}>Work Required</p>
                <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px 0', borderBottom: '1px solid #999' }}>Service</th>
                      <th style={{ textAlign: 'left', padding: '4px 0', borderBottom: '1px solid #999' }}>Assigned To</th>
                      <th style={{ textAlign: 'left', padding: '4px 0', borderBottom: '1px solid #999' }}>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.tasks.map((t: any) => (
                      <tr key={t.id}>
                        <td style={{ padding: '8px 8px 8px 0', borderBottom: '1px solid #ddd' }}>{t.subcategory.emoji} {t.subcategory.name}</td>
                        <td style={{ padding: '8px 8px 8px 0', borderBottom: '1px solid #ddd' }}>{t.contractor.persons.fullName}</td>
                        <td style={{ padding: '8px 8px 8px 0', borderBottom: '1px solid #ddd' }}>{t.workDescription || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #ccc', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, fontSize: 12 }}>
                <div>
                  <div style={{ borderBottom: '1px solid #666', height: 32 }}></div>
                  <p style={{ marginTop: 4 }}>Contractor signature / collected by</p>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #666', height: 32 }}></div>
                  <p style={{ marginTop: 4 }}>Date collected</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
