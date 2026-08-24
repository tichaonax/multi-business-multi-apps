'use client'

/**
 * Report: Admin-Issued Long-Term R710 Tokens — MBM-274
 * Classified by not-yet-redeemed / used / expired / revoked.
 * Business-scoped; the real access gate is server-side on
 * /api/r710/tokens/admin-issued.
 */

import { useEffect, useState } from 'react'

interface AdminIssuedTokenRow {
  id: string
  username: string
  status: string
  classification: 'NOT_YET_REDEEMED' | 'USED' | 'EXPIRED' | 'REVOKED' | 'OTHER'
  configName: string
  durationValue?: number
  durationUnit?: string
  issuedAt: string
  issuedByName: string | null
  expiresAt: string | null
  firstUsedAt: string | null
  connectedMac: string | null
}

const CLASSIFICATION_LABELS: Record<string, { label: string; className: string }> = {
  NOT_YET_REDEEMED: { label: 'Not Yet Redeemed', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  USED: { label: 'Used', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  EXPIRED: { label: 'Expired', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  REVOKED: { label: 'Revoked', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  OTHER: { label: 'Other', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
}

const formatDuration = (value?: number, unit?: string) => {
  if (!value || !unit) return ''
  const unitDisplay = unit.split('_')[1] || unit
  return `${value} ${value === 1 ? unitDisplay.slice(0, -1) : unitDisplay}`
}

export function R710AdminIssuedReport({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokens, setTokens] = useState<AdminIssuedTokenRow[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({ total: 0 })

  useEffect(() => {
    if (!businessId) return
    load()
  }, [businessId])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/r710/tokens/admin-issued?businessId=${businessId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to load report')
        return
      }
      const data = await res.json()
      setTokens(data.tokens || [])
      setSummary(data.summary || { total: 0 })
    } catch (err) {
      console.error('Error loading admin-issued token report:', err)
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-300">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['NOT_YET_REDEEMED', 'USED', 'EXPIRED', 'REVOKED'] as const).map(key => (
          <div key={key} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{CLASSIFICATION_LABELS[key].label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary[key] || 0}</p>
          </div>
        ))}
      </div>

      {tokens.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <p className="text-blue-800 dark:text-blue-300">No admin-issued long-term tokens yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Token</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Package</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Issued By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Issued At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Device (MAC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tokens.map(token => {
                const cls = CLASSIFICATION_LABELS[token.classification] || CLASSIFICATION_LABELS.OTHER
                return (
                  <tr key={token.id}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-200">{token.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {token.configName}
                      <div className="text-xs text-gray-500 dark:text-gray-500">{formatDuration(token.durationValue, token.durationUnit)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls.className}`}>{cls.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{token.issuedByName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{new Date(token.issuedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{token.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-500">{token.connectedMac || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
