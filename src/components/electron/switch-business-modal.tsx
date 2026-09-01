'use client'

/**
 * Device-level "always open on this business" setting for an Electron kiosk
 * — separate from the app's own per-user/per-login business selection.
 * Admin-PIN-gated (reuses the same PIN as add/remove server in the server
 * picker), unlike "Switch Server" which is deliberately unrestricted.
 */

import { useEffect, useState } from 'react'

interface Business {
  id: string
  name: string
  type: string
}

export function SwitchBusinessModal({ onClose }: { onClose: () => void }) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [needsPinSetup, setNeedsPinSetup] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasExistingDefault, setHasExistingDefault] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/public/businesses').then((r) => (r.ok ? r.json() : { businesses: [] })),
      window.electron?.hasPin?.() ?? Promise.resolve(false),
      window.electron?.getDefaultBusiness?.() ?? Promise.resolve(null),
    ])
      .then(([bizRes, hasPin, current]) => {
        setBusinesses(bizRes.businesses || [])
        setNeedsPinSetup(!hasPin)
        if (current?.id) {
          setSelectedId(current.id)
          setHasExistingDefault(true)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleConfirm = async () => {
    setError('')
    if (!selectedId) {
      setError('Select a business.')
      return
    }
    if (needsPinSetup) {
      if (!pin || pin.length < 4) {
        setError('PIN must be at least 4 characters.')
        return
      }
      if (pin !== pinConfirm) {
        setError('PINs do not match.')
        return
      }
    } else if (!pin) {
      setError('Enter the PIN.')
      return
    }

    setSaving(true)
    try {
      if (needsPinSetup) {
        await window.electron?.setPin?.(pin)
      }
      const business = businesses.find((b) => b.id === selectedId)
      const result = await window.electron?.setDefaultBusiness?.(pin, selectedId, business?.name || '')
      if (!result?.ok) {
        setError(result?.message || 'Failed to save.')
        return
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // Clears the device-level default without needing a business selected —
  // registry.setDefaultBusiness() already treats a falsy id as "no default"
  // (falls back to this app's normal per-login business selection), this
  // was simply never exposed anywhere in this UI.
  const handleClear = async () => {
    setError('')
    if (needsPinSetup) {
      setError('No PIN is set, so there is no default business to clear.')
      return
    }
    if (!pin) {
      setError('Enter the PIN.')
      return
    }
    setSaving(true)
    try {
      const result = await window.electron?.setDefaultBusiness?.(pin, '', '')
      if (!result?.ok) {
        setError(result?.message || 'Failed to clear.')
        return
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4">
      <div className="card w-full max-w-sm p-6 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-bold text-primary mb-1">Switch Business</h2>
        <p className="text-xs text-secondary mb-4">
          Sets which business this device always opens on — admin PIN required.
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <label className="block text-sm font-medium text-primary mb-1">Business</label>
            <select
              className="input-field mb-4"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Select a business…</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {needsPinSetup && (
              <p className="text-xs text-amber-600 mb-2">No admin PIN is set yet — set one now to continue.</p>
            )}

            <label className="block text-sm font-medium text-primary mb-1">
              {needsPinSetup ? 'New PIN' : 'Admin PIN'}
            </label>
            <input
              type="password"
              className="input-field mb-3"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !needsPinSetup && handleConfirm()}
            />

            {needsPinSetup && (
              <>
                <label className="block text-sm font-medium text-primary mb-1">Confirm New PIN</label>
                <input
                  type="password"
                  className="input-field mb-3"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                />
              </>
            )}

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium text-primary hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {hasExistingDefault && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="w-full mt-2 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                Clear Default Business
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
