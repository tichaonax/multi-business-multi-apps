'use client'

/**
 * Admin-only panel for issuing long-term, zero-fee R710 WiFi tokens
 * (e.g. a 1-year workstation credential — the R710's own guest-pass
 * validity cap tops out at 365 days) — MBM-274.
 *
 * Only rendered by R710TokenMenuManager when the current user is a system
 * admin or this business's owner, and only lists configs flagged
 * isAdminIssued. The real access control is server-side on
 * /api/r710/tokens/issue-admin — this component is UX only.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useAlert } from '@/components/ui/confirm-modal'

interface AdminIssuableConfig {
  id: string
  name: string
  description: string | null
  durationValue: number
  durationUnit: string
  deviceLimit: number
}

interface IssuedCredential {
  configName: string
  username: string
  password: string
  expiresAt: string | null
  wlanSsid?: string
}

interface AdminTokenIssuerProps {
  businessId: string
  configs: AdminIssuableConfig[]
  /** Edit Package links only work for system admins — /r710-portal/token-configs/[id]
   *  redirects everyone else away, so they're hidden rather than shown as a dead end. */
  canEditConfig?: boolean
}

export function AdminTokenIssuer({ businessId, configs, canEditConfig }: AdminTokenIssuerProps) {
  const alert = useAlert()
  const [issuing, setIssuing] = useState<string | null>(null)
  const [issued, setIssued] = useState<IssuedCredential | null>(null)

  const formatDuration = (value: number, unit: string) => {
    const unitDisplay = unit.split('_')[1] || unit
    return `${value} ${value === 1 ? unitDisplay.slice(0, -1) : unitDisplay}`
  }

  const handleIssue = async (config: AdminIssuableConfig) => {
    try {
      setIssuing(config.id)
      setIssued(null)

      const response = await fetch('/api/r710/tokens/issue-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, tokenConfigId: config.id })
      })

      const data = await response.json()

      if (!response.ok) {
        await alert({
          title: 'Issue Failed',
          description: data.error || 'Failed to issue token'
        })
        return
      }

      setIssued({
        configName: config.name,
        username: data.token.username,
        password: data.token.password,
        expiresAt: data.token.expiresAt,
        wlanSsid: data.wlanSsid
      })
    } catch (error) {
      console.error('Error issuing admin token:', error)
      await alert({
        title: 'Error',
        description: 'Failed to issue token'
      })
    } finally {
      setIssuing(null)
    }
  }

  const copyCredentials = async () => {
    if (!issued) return
    const text = `SSID: ${issued.wlanSsid || ''}\nUsername: ${issued.username}\nPassword: ${issued.password}${issued.expiresAt ? `\nExpires: ${new Date(issued.expiresAt).toLocaleDateString()}` : ''}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API unavailable — credentials are still visible on screen for manual copy
    }
  }

  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
      <h3 className="font-medium text-purple-900 dark:text-purple-300 mb-1">🔐 Issue Long-Term Access</h3>
      <p className="text-sm text-purple-800 dark:text-purple-400 mb-4">
        Admin-only. Generates a zero-fee, long-duration WiFi credential for a workstation — dispense
        it directly to the device instead of sharing the AP password.
      </p>

      <div className="flex flex-col gap-2 mb-2">
        {configs.map(config => (
          <div key={config.id} className="flex items-center gap-2">
            {canEditConfig && (
              <Link
                href={`/r710-portal/token-configs/${config.id}`}
                className="px-3 py-2 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400 text-sm rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40"
              >
                ✏️ Edit Package
              </Link>
            )}
            <button
              onClick={() => handleIssue(config)}
              disabled={issuing !== null}
              className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {issuing === config.id ? 'Issuing…' : `Issue "${config.name}" (${formatDuration(config.durationValue, config.durationUnit)})`}
            </button>
          </div>
        ))}
      </div>

      {issued && (
        <div className="mt-4 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                ✅ Issued: {issued.configName}
              </h4>
              {issued.wlanSsid && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Network (SSID): <span className="font-mono">{issued.wlanSsid}</span></p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">Username: <span className="font-mono font-semibold">{issued.username}</span></p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Password: <span className="font-mono font-semibold">{issued.password}</span></p>
              {issued.expiresAt && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Expires: {new Date(issued.expiresAt).toLocaleDateString()}</p>
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                Dispense these credentials to the workstation now — they won't be shown again here.
              </p>
            </div>
            <button
              onClick={copyCredentials}
              className="shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              📋 Copy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
