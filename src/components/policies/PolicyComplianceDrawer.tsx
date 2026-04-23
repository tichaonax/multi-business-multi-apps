'use client'

import { useState, useEffect } from 'react'
import { PolicyStatusBadge } from './PolicyStatusBadge'

interface ComplianceRow {
  userId: string
  userName: string
  userEmail: string
  assignmentId: string
  policyVersion: number
  scope: string
  dueDate: string | null
  status: string
  acknowledgedAt: string | null
  waivedReason: string | null
}

interface Props {
  policy: { id: string; title: string; currentVersion: number }
  businessId: string
  onClose: () => void
}

export default function PolicyComplianceDrawer({ policy, businessId, onClose }: Props) {
  const [rows, setRows] = useState<ComplianceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    fetch(`/api/policies/reports?businessId=${businessId}&policyId=${policy.id}`)
      .then(r => r.json())
      .then(data => setRows(data.rows ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [policy.id, businessId])

  const filtered = statusFilter === 'ALL' ? rows : rows.filter(r => r.status === statusFilter)

  const counts = {
    ACKNOWLEDGED: rows.filter(r => r.status === 'ACKNOWLEDGED').length,
    PENDING: rows.filter(r => r.status === 'PENDING').length,
    OVERDUE: rows.filter(r => r.status === 'OVERDUE').length,
    WAIVED: rows.filter(r => r.status === 'WAIVED').length,
  }

  const downloadCsv = () => {
    const header = 'Name,Email,Status,Version Acknowledged,Acknowledged At,Due Date,Waived Reason\n'
    const body = rows.map(r =>
      `"${r.userName}","${r.userEmail}","${r.status}","v${r.policyVersion}","${r.acknowledgedAt ? new Date(r.acknowledgedAt).toLocaleString() : ''}","${r.dueDate ? new Date(r.dueDate).toLocaleDateString() : ''}","${r.waivedReason ?? ''}"`
    ).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${policy.title.replace(/\s+/g, '-')}-compliance.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compliance Report</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{policy.title} · v{policy.currentVersion}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={downloadCsv}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Export CSV
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3 p-5 border-b border-gray-100 dark:border-gray-800">
          {Object.entries(counts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'ALL' : status)}
              className={`text-center p-3 rounded-lg border transition-colors ${
                statusFilter === status
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
              <PolicyStatusBadge status={status} />
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No records found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Version</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Acknowledged</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((row, i) => (
                  <tr key={`${row.userId}-${row.assignmentId}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{row.userName}</div>
                      <div className="text-xs text-gray-400">{row.userEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <PolicyStatusBadge status={row.status} />
                      {row.waivedReason && (
                        <div className="text-xs text-gray-400 mt-1 max-w-[160px] truncate" title={row.waivedReason}>
                          {row.waivedReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">v{row.policyVersion}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {row.acknowledgedAt ? new Date(row.acknowledgedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
