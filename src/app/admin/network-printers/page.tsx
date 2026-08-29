'use client'

// MBM-283 follow-up: this page used to be where a printer's DIRECT/AGENT
// connection mode, its routing workstation, and its remote-enabled flag all
// got configured — that job now lives on each paired workstation's own row
// on /admin/workstation-agents (see that page's printer section and its
// route.ts header comment for why: a workstation declaring "this is MY
// printer" belongs on that workstation's own setup, not a separate global
// admin screen with a workstation picker).
//
// What's left here, by design, is a single, narrower job: the BUSINESS-WIDE
// default receipt printer — which of all the printers enabled for remote
// use in a business is the fallback everyone gets unless they personally
// override it (Settings → POS Settings → Printer Preferences has the same
// picker, business-owner-scoped to whichever business they're currently in;
// this page is the system-admin equivalent that can reach ANY business,
// which is why it needs its own business selector).

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert } from '@/components/ui/confirm-modal'
import { formatPrinterName } from '@/lib/printing/format-printer-label'

interface Business {
  id: string
  // MBM-283 follow-up fix: /api/admin/businesses returns the raw Businesses
  // row, not a renamed shape — the model's actual field is `name`, not
  // `businessName`. Using the wrong key here silently rendered every
  // option with blank/undefined text (the array itself was populated), the
  // real cause behind "the Business dropdown isn't showing anything."
  name: string
  isUmbrellaBusiness?: boolean
}

interface Printer {
  id: string
  printerName: string
  isOnline: boolean
  workstationLabel?: string | null
  workstationHostname?: string | null
}

export default function NetworkPrintersPage() {
  const { isSystemAdmin, currentBusinessId } = useBusinessPermissionsContext()
  const alert = useAlert()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [printers, setPrinters] = useState<Printer[]>([])
  const [defaultPrinterId, setDefaultPrinterId] = useState('')
  const [loadingBusinesses, setLoadingBusinesses] = useState(true)
  const [loadingPrinters, setLoadingPrinters] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isSystemAdmin) return
    fetch('/api/admin/businesses', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: Business[]) => setBusinesses(Array.isArray(data) ? data : []))
      .finally(() => setLoadingBusinesses(false))
  }, [isSystemAdmin])

  // Follows the header's business switcher — landing here (or switching
  // business while already here) pre-selects whatever business is globally
  // active, instead of always starting blank. Still fully overridable: this
  // page can manage ANY business, so picking a different one here just
  // updates the in-page selector without touching the global switcher.
  useEffect(() => {
    if (currentBusinessId) setSelectedBusinessId(currentBusinessId)
  }, [currentBusinessId])

  useEffect(() => {
    if (!selectedBusinessId) { setPrinters([]); setDefaultPrinterId(''); return }
    setLoadingPrinters(true)
    Promise.all([
      fetch(`/api/printers?businessId=${selectedBusinessId}&printerType=receipt`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : { printers: [] }),
      fetch(`/api/printing/default-printer?businessId=${selectedBusinessId}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : { printerId: null }),
    ])
      .then(([printersData, defaultData]) => {
        setPrinters(printersData.printers || [])
        setDefaultPrinterId(defaultData.printerId || '')
      })
      .finally(() => setLoadingPrinters(false))
  }, [selectedBusinessId])

  const handleChangeDefault = async (printerId: string) => {
    if (!selectedBusinessId) return
    setSaving(true)
    try {
      if (!printerId) {
        await fetch(`/api/printing/default-printer?businessId=${selectedBusinessId}`, { method: 'DELETE', credentials: 'include' })
        setDefaultPrinterId('')
        return
      }
      const res = await fetch('/api/printing/default-printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId: selectedBusinessId, printerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: data.error || 'Failed to save default printer' })
        return
      }
      setDefaultPrinterId(data.printerId)
    } finally {
      setSaving(false)
    }
  }

  if (!isSystemAdmin) {
    return (
      <ContentLayout title="Default Printer">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-300">Only a system admin can manage the business-wide default printer.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Default Printer"
      description="The fallback receipt printer for a business — used whenever a user hasn't personally chosen one of their own in Printer Preferences. Only printers enabled for remote use (set on each workstation's own row in Workstation Agents) appear here."
    >
      <Link href="/admin/workstation-agents" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">
        ← Workstation Agents (declare or edit a workstation's printer)
      </Link>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 space-y-4">
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Business</label>
          <select
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            disabled={loadingBusinesses}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:opacity-50"
          >
            <option value="">{loadingBusinesses ? 'Loading…' : 'Select a business…'}</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.isUmbrellaBusiness ? 'All' : b.name}</option>
            ))}
          </select>
        </div>

        {selectedBusinessId && (
          loadingPrinters ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : printers.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ No printers available for this business yet — pair a workstation and enable its printer for remote use on{' '}
              <a href="/admin/workstation-agents" className="underline">Workstation Agents</a> first.
            </p>
          ) : (
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Default printer</label>
              <select
                value={defaultPrinterId}
                onChange={(e) => handleChangeDefault(e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="">No default set</option>
                {printers.map(p => (
                  <option key={p.id} value={p.id}>{formatPrinterName(p)}{p.isOnline ? '' : ' (offline)'}</option>
                ))}
              </select>
              {saving && <p className="text-xs text-gray-400 mt-1">Saving…</p>}
            </div>
          )
        )}
      </div>
    </ContentLayout>
  )
}
