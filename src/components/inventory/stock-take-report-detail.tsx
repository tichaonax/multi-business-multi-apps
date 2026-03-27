'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface ReportEmployee {
  id: string
  employeeId: string
  signedAt: string | null
  signedByUserId: string | null
  employee: { id: string; fullName: string; employeeNumber: string; primaryBusinessId: string }
  signedByUser: { id: string; name: string } | null
}

interface ReportData {
  id: string
  businessId: string
  status: 'PENDING_SIGNOFF' | 'SIGNED_OFF' | 'VOIDED'
  createdAt: string
  fullySignedOffAt: string | null
  managerSignedAt: string | null
  managerSignedById: string | null
  totalShortfallQty: number
  totalShortfallValue: string | number
  totalNewStockValue: string | number
  totalStockValueAfter: string | number
  employeeCount: number
  reportData: { items: ReportItem[] } | null
  submittedBy: { id: string; name: string } | null
  managerSignedBy: { id: string; name: string } | null
  employees: ReportEmployee[]
}

interface ReportItem {
  barcode: string | null
  productName: string
  isExistingItem: boolean
  systemQty: number | null
  physicalCount: number | null
  variance: number | null
  newStockAdded: number
  sellingPrice: number
  shortfallValue: number
}

interface StockTakeReportDetailProps {
  reportId: string
  businessName: string
  canManage: boolean
  onBack: () => void
  onClose: () => void
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING_SIGNOFF: { label: 'Pending Sign-off', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  SIGNED_OFF:      { label: 'Signed Off',        cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  VOIDED:          { label: 'Voided',             cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
}

function fmt(n: number | string) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function StockTakeReportDetail({ reportId, businessName, canManage, onBack, onClose }: StockTakeReportDetailProps) {
  const { data: session } = useSession()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signingAs, setSigningAs] = useState<string | null>(null)  // 'manager' | empRowId
  const [signError, setSignError] = useState('')
  const [voidLoading, setVoidLoading] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [showVoidConfirm, setShowVoidConfirm] = useState(false)

  const fetchReport = () => {
    setLoading(true)
    setError('')
    fetch(`/api/stock-take/reports/${reportId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setError(d.error || 'Failed to load report'); return }
        setReport(d.data)
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReport() }, [reportId])

  const handleSignOff = async (role: 'employee' | 'manager', employeeId?: string) => {
    if (!report) return
    setSigningAs(role === 'manager' ? 'manager' : 'employee')
    setSignError('')
    try {
      const res = await fetch(`/api/stock-take/reports/${reportId}/sign-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, ...(employeeId ? { employeeId } : {}) }),
      })
      const d = await res.json()
      if (!d.success) { setSignError(d.error || 'Sign-off failed'); return }
      fetchReport()
      window.dispatchEvent(new CustomEvent('inventory:refresh'))
    } catch (e: any) {
      setSignError(e.message || 'Sign-off failed')
    } finally {
      setSigningAs(null)
    }
  }

  const handleVoid = async () => {
    setVoidLoading(true)
    setSignError('')
    try {
      const res = await fetch(`/api/stock-take/reports/${reportId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      })
      const d = await res.json()
      if (!d.success) { setSignError(d.error || 'Void failed'); return }
      setShowVoidConfirm(false)
      fetchReport()
    } catch (e: any) {
      setSignError(e.message || 'Void failed')
    } finally {
      setVoidLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[55] bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="fixed inset-0 z-[55] bg-white dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || 'Report not found'}</p>
        <button onClick={onBack} className="text-sm text-indigo-600 hover:underline">← Back to list</button>
      </div>
    )
  }

  const statusInfo = STATUS_LABEL[report.status] ?? { label: report.status, cls: '' }
  const items: ReportItem[] = report.reportData?.items ?? []
  const existingItems = items.filter(i => i.isExistingItem)
  const newItems = items.filter(i => !i.isExistingItem)

  const unsignedEmployees = report.employees.filter(e => !e.signedAt)
  const canStillSignOff = report.status === 'PENDING_SIGNOFF'

  const currentUserEmail = session?.user?.email ?? ''

  return (
    <div className="fixed inset-0 z-[55] bg-white dark:bg-gray-900 flex flex-col overflow-hidden pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shrink-0">
          ← Reports
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">
            Stock Take Report — {businessName} — {new Date(report.createdAt).toLocaleDateString()}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.cls}`}>{statusInfo.label}</span>
            {report.fullySignedOffAt && (
              <span className="text-xs text-gray-400">Signed off {new Date(report.fullySignedOffAt).toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onClose}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg">
            📦 Inventory
          </button>
          {canManage && canStillSignOff && (
            <button onClick={() => setShowVoidConfirm(true)}
              className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg">
              Void Report
            </button>
          )}
        </div>
      </div>

      {/* Quick sign-off bar — shown at top when sign-off is still pending */}
      {canStillSignOff && (
        <div className="shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400 shrink-0">Sign-off:</span>
          {report.employees.map(empRow => (
            empRow.signedAt ? (
              <span key={empRow.id} className="text-xs text-green-600 dark:text-green-400 font-medium">✅ {empRow.employee.fullName.split(' ')[0]}</span>
            ) : (
              <button key={empRow.id}
                onClick={() => handleSignOff('employee', empRow.employeeId)}
                disabled={signingAs === 'employee'}
                className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium">
                {signingAs === 'employee' ? 'Signing…' : `Sign — ${empRow.employee.fullName.split(' ')[0]}`}
              </button>
            )
          ))}
          {report.managerSignedAt ? (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">✅ Manager</span>
          ) : canManage ? (
            <button
              onClick={() => handleSignOff('manager')}
              disabled={signingAs === 'manager'}
              className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium">
              {signingAs === 'manager' ? 'Signing…' : 'Sign as Manager'}
            </button>
          ) : (
            <span className="text-xs text-amber-600 dark:text-amber-400">Awaiting manager</span>
          )}
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

        {/* Existing Items */}
        {existingItems.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Existing Items ({existingItems.length})
            </h2>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-max w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Barcode</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-center w-16">System</th>
                    <th className="px-3 py-2 text-center w-20">Physical</th>
                    <th className="px-3 py-2 text-center w-20">Variance</th>
                    <th className="px-3 py-2 text-center w-16">+New</th>
                    <th className="px-3 py-2 text-right w-20">Price</th>
                    <th className="px-3 py-2 text-right w-24">Shortfall $</th>
                  </tr>
                </thead>
                <tbody>
                  {existingItems.map((item, i) => (
                    <tr key={i} className={`border-t border-gray-100 dark:border-gray-700 ${item.shortfallValue > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                      <td className="px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300">{item.barcode || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-900 dark:text-white max-w-[180px] truncate" title={item.productName}>{item.productName}</td>
                      <td className="px-3 py-1.5 text-center text-gray-500">{item.systemQty ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">
                        {item.physicalCount !== null ? item.physicalCount : <span className="text-gray-400">—</span>}
                      </td>
                      <td className={`px-3 py-1.5 text-center font-medium ${
                        item.variance === null ? 'text-gray-400' :
                        item.variance < 0 ? 'text-red-600 dark:text-red-400' :
                        item.variance > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                      }`}>
                        {item.variance !== null ? (item.variance > 0 ? '+' : '') + item.variance : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">{item.newStockAdded || '—'}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">${fmt(item.sellingPrice)}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${item.shortfallValue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                        {item.shortfallValue > 0 ? `$${fmt(item.shortfallValue)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* New Items */}
        {newItems.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              New Items ({newItems.length})
            </h2>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-max w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Barcode</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-center w-20">Qty Added</th>
                    <th className="px-3 py-2 text-right w-20">Price</th>
                    <th className="px-3 py-2 text-right w-28">Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {newItems.map((item, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300">{item.barcode || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-900 dark:text-white max-w-[180px] truncate" title={item.productName}>{item.productName}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">{item.newStockAdded}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">${fmt(item.sellingPrice)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">${fmt(item.newStockAdded * item.sellingPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Totals */}
        <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Totals</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm max-w-xs">
            {Number(report.totalShortfallQty) > 0 && (
              <>
                <span className="text-gray-600 dark:text-gray-400">Shortfall qty:</span>
                <span className="font-medium text-red-600 dark:text-red-400">{report.totalShortfallQty} units</span>
                <span className="text-gray-600 dark:text-gray-400">Shortfall value:</span>
                <span className="font-medium text-red-600 dark:text-red-400">${fmt(report.totalShortfallValue)}</span>
                <span className="text-gray-600 dark:text-gray-400">Per employee:</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  ${fmt(Number(report.totalShortfallValue) / Math.max(1, report.employeeCount))}
                </span>
              </>
            )}
            <span className="text-gray-600 dark:text-gray-400">New stock value:</span>
            <span className="font-medium text-gray-900 dark:text-white">${fmt(report.totalNewStockValue)}</span>
            <span className="text-gray-600 dark:text-gray-400">Est. value after:</span>
            <span className="font-medium text-gray-900 dark:text-white">${fmt(report.totalStockValueAfter)}</span>
          </div>
        </section>

        {/* Sign-off Panel */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Sign-off</h2>

          {signError && (
            <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {signError}
              <button onClick={() => setSignError('')} className="ml-2 text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            {/* Employee rows */}
            {report.employees.map(empRow => (
              <div key={empRow.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{empRow.employee.fullName}</p>
                  <p className="text-xs text-gray-400">{empRow.employee.employeeNumber}</p>
                </div>
                {empRow.signedAt ? (
                  <div className="text-right">
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">✅ Signed</span>
                    <p className="text-xs text-gray-400">{new Date(empRow.signedAt).toLocaleString()}</p>
                    {empRow.signedByUser && <p className="text-xs text-gray-400">by {empRow.signedByUser.name}</p>}
                  </div>
                ) : canStillSignOff ? (
                  <button
                    onClick={() => handleSignOff('employee', empRow.employeeId)}
                    disabled={signingAs === 'employee'}
                    className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium">
                    {signingAs === 'employee' ? 'Signing…' : 'Sign Off'}
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">Unsigned</span>
                )}
              </div>
            ))}

            {/* Manager row */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Manager Sign-off</p>
                {report.managerSignedBy && (
                  <p className="text-xs text-gray-400">by {report.managerSignedBy.name}</p>
                )}
              </div>
              {report.managerSignedAt ? (
                <div className="text-right">
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">✅ Signed</span>
                  <p className="text-xs text-gray-400">{new Date(report.managerSignedAt).toLocaleString()}</p>
                </div>
              ) : canManage && canStillSignOff ? (
                <button
                  onClick={() => handleSignOff('manager')}
                  disabled={signingAs === 'manager'}
                  className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium">
                  {signingAs === 'manager' ? 'Signing…' : 'Sign Off as Manager'}
                </button>
              ) : (
                <span className="text-xs text-gray-400">
                  {canStillSignOff ? 'Awaiting manager' : 'Unsigned'}
                </span>
              )}
            </div>
          </div>

          {canStillSignOff && unsignedEmployees.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Waiting for: {unsignedEmployees.map(e => e.employee.fullName.split(' ')[0]).join(', ')}
              {!report.managerSignedAt ? ' + Manager' : ''}
            </p>
          )}
        </section>

        {/* Submitted by */}
        <section className="text-xs text-gray-400 pb-4">
          Submitted by {report.submittedBy?.name ?? 'unknown'} on {new Date(report.createdAt).toLocaleString()}
        </section>
      </div>

      {/* Void confirm modal */}
      {showVoidConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Void this report?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Stock changes already applied will <strong>not</strong> be reversed. This action cannot be undone.
            </p>
            <textarea
              placeholder="Reason (optional)"
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowVoidConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleVoid} disabled={voidLoading}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium">
                {voidLoading ? 'Voiding…' : 'Void Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
