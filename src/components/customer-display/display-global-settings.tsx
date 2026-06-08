'use client'

import { useCallback, useEffect, useState } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useSession } from 'next-auth/react'
import { SessionUser } from '@/lib/permission-utils'

interface Settings {
  rotationIntervalSecs: number
  enableSmartDisplay: boolean
  enableSplitLayout: boolean
  maxItemsInRotation: number
}

interface Props {
  businessId: string
}

export function DisplayGlobalSettings({ businessId }: Props) {
  const { data: session } = useSession()
  const { hasPermission } = useBusinessPermissionsContext()
  const sessionUser = session?.user as SessionUser
  const isAdmin = sessionUser?.role === 'admin'
  const canManage = isAdmin || hasPermission('canManageCustomerDisplay')
  const canView = canManage || hasPermission('canViewCustomerDisplay')

  if (!canView) return null
  const [settings, setSettings] = useState<Settings>({
    rotationIntervalSecs: 6,
    enableSmartDisplay: false,
    enableSplitLayout: true,
    maxItemsInRotation: 12,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/business/${businessId}/display-smart-ads/settings`)
      if (res.ok) setSettings(await res.json())
    } catch { /* ignore */ }
  }, [businessId])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`/api/business/${businessId}/display-smart-ads/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      // Broadcast refresh so open customer display windows pick up the change
      const bc = new BroadcastChannel('customer-display')
      bc.postMessage({ type: 'DISPLAY_REFRESH', businessId, terminalId: null, payload: {} })
      bc.close()
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const toggle = (key: keyof Settings) =>
    setSettings(s => ({ ...s, [key]: !s[key] }))

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">Smart Display Settings</h2>

      {/* Enable toggle */}
      <label className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Smart display enabled</div>
          <div className="text-xs text-gray-400 mt-0.5">Show rotating product cards + live menu grid on the customer display</div>
        </div>
        <button
          type="button"
          disabled={!canManage}
          onClick={() => toggle('enableSmartDisplay')}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings.enableSmartDisplay ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enableSmartDisplay ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </label>

      {/* Split layout toggle */}
      <label className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Split layout</div>
          <div className="text-xs text-gray-400 mt-0.5">Show left rotating panel + right menu grid (disable for single full-width panel)</div>
        </div>
        <button
          type="button"
          disabled={!canManage || !settings.enableSmartDisplay}
          onClick={() => toggle('enableSplitLayout')}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings.enableSplitLayout ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enableSplitLayout ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </label>

      {/* Rotation speed */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
          Rotation speed — <span className="font-mono">{settings.rotationIntervalSecs}s</span>
        </label>
        <input
          type="range" min={3} max={30} step={1}
          disabled={!canManage}
          value={settings.rotationIntervalSecs}
          onChange={e => setSettings(s => ({ ...s, rotationIntervalSecs: Number(e.target.value) }))}
          className="w-full disabled:opacity-50"
        />
      </div>

      {/* Max items */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
          Max items in rotation — <span className="font-mono">{settings.maxItemsInRotation}</span>
        </label>
        <input
          type="range" min={3} max={20} step={1}
          disabled={!canManage}
          value={settings.maxItemsInRotation}
          onChange={e => setSettings(s => ({ ...s, maxItemsInRotation: Number(e.target.value) }))}
          className="w-full disabled:opacity-50"
        />
      </div>

      {canManage && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
            saved
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
          }`}
        >
          {saved ? '✓ Saved — display refreshed' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      )}
    </div>
  )
}
