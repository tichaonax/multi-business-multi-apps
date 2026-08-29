'use client'

/**
 * Unified Receipt Preview Modal
 *
 * Single modal component for all business types
 * Features:
 * - Receipt preview using standard template
 * - Printer selection
 * - Dual receipt support (Restaurant: business + customer copy)
 * - Print settings (copies, customer copy toggle)
 * - Print/Cancel actions
 */

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Printer, X, Check, AlertCircle, Usb, Wifi } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToastContext } from '@/components/ui/toast'
import { ReceiptTemplate } from '@/components/printing/receipt-template'
import { LocalPrinterSetup } from '@/components/printing/local-printer-setup'
import { QzTraySetup } from '@/components/printing/qz-tray-setup'
import { generateReceipt } from '@/lib/printing/receipt-templates'
import {
  isWebSerialSupported,
  getLocalPrinterConfig,
  printToLocalPrinter,
  isLocalPrinterAvailable,
} from '@/lib/printing/local-serial-printer'
import {
  printToQzPrinter,
  getQzPrinterConfig,
} from '@/lib/printing/qz-tray-printer'
import { getPrintTerminal } from '@/lib/printing/print-terminal'
import { formatPrinterName } from '@/lib/printing/format-printer-label'
import type { ReceiptData, NetworkPrinter, BusinessType } from '@/types/printing'

const LOCAL_PRINTER_ID = 'local-serial'
const QZ_PRINTER_PREFIX = 'qz::'
const PAIRING_PORT = 47710

interface PrinterCacheEntry {
  printers: NetworkPrinter[]
  hasLocalPrinter: boolean
  localPrinterName: string
  qzPrinters: string[]
  // MBM-283 Phase 3: this business's server-side default (if any) — the
  // last resort in autoSelectPrinter(), below the user's own saved choice
  // and QZ's machine-specific fallback.
  businessDefaultPrinterId: string | null
  // MBM-283 follow-up: this exact machine's own paired workstation id (from
  // the local /probe), if any — lets autoSelectPrinter recognize "one of
  // these AGENT printers is physically attached to ME" and default to it
  // ahead of the business-wide default, which may point at a different
  // workstation's printer entirely.
  myWorkstationAgentId: string | null
  // Restored per-workstation admin override: an admin can explicitly set
  // "this workstation always prints through THAT OTHER workstation's
  // printer" (Admin → Workstation Agents), independent of both this
  // workstation's own printer and the business-wide default — outranks
  // both when set.
  workstationOverridePrinterId: string | null
}

// Module-level cache — persists across modal opens within the same page
// session. MBM-283 Phase 1: keyed by businessId, not a single shared entry
// — the printer list is now business-scoped server-side (an AGENT-mode
// printer belonging to a different business is excluded), so a cache built
// while working one business must never be shown after switching to
// another; without this, the modal could keep displaying (though no longer
// successfully dispatch to, since the server-side check still applies)
// another business's printer list after a business switch, on the same
// browser session.
const printerCacheByBusiness = new Map<string, PrinterCacheEntry>()

interface UnifiedReceiptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  receiptData: ReceiptData | null
  businessType: BusinessType
  onPrintConfirm: (options: {
    printerId?: string
    copies: number
    printCustomerCopy: boolean
  }) => Promise<void>
  /** Extra raw ESC/POS jobs to print sequentially after the main receipt (e.g. delivery copies) */
  extraEscPosJobs?: string[]
  /** When provided, shows a "Cancel Order" button that triggers the manager override flow */
  onCancelOrder?: () => void
  /** Hide the customer copy option (e.g. for vendor payment vouchers) */
  hideCustomerCopy?: boolean
  /** Override the modal/button title. Defaults to "Print Receipt". Pass "Print Voucher" for vendor payment vouchers. */
  title?: string
}

export function UnifiedReceiptPreviewModal({
  isOpen,
  onClose,
  receiptData,
  businessType,
  extraEscPosJobs,
  onPrintConfirm,
  onCancelOrder,
  hideCustomerCopy,
  title = 'Print Receipt',
}: UnifiedReceiptPreviewModalProps) {
  // MBM-283 Phase 1: the printer list is now business-scoped server-side
  // (GET /api/printers excludes another business's AGENT-relayed printers
  // when businessId is passed), so the module-level cache below must be
  // keyed by business too — otherwise switching businesses on the same
  // browser session could keep showing a stale, previously-loaded list.
  const businessId = receiptData?.businessId || ''
  const getCache = () => printerCacheByBusiness.get(businessId) ?? null
  const setCache = (entry: PrinterCacheEntry) => { printerCacheByBusiness.set(businessId, entry) }

  const [printers, setPrinters] = useState<NetworkPrinter[]>(() => getCache()?.printers || [])
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | undefined>()
  const [copies, setCopies] = useState(1)
  const [printCustomerCopy, setPrintCustomerCopy] = useState(true)
  const [loading, setLoading] = useState(false)
  const [printersLoading, setPrintersLoading] = useState(() => getCache() === null)
  const [hasLocalPrinter, setHasLocalPrinter] = useState(() => getCache()?.hasLocalPrinter || false)
  const [localPrinterName, setLocalPrinterName] = useState(() => getCache()?.localPrinterName || '')
  const [qzPrinters, setQzPrinters] = useState<string[]>(() => getCache()?.qzPrinters || [])
  const [showLocalSetup, setShowLocalSetup] = useState(false)
  const [showQzSetup, setShowQzSetup] = useState(false)
  const [checkingOnline, setCheckingOnline] = useState(false)
  const toast = useToastContext()
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  // User-scoped localStorage key so printer choice persists per user on shared machines
  const printerKey = userId ? `lastSelectedPrinterId-${userId}` : 'lastSelectedPrinterId'

  // Ref-based guard to prevent double-clicks (more reliable than state)
  const isPrintingRef = useRef(false)

  // Load configured receipt printer on mount
  useEffect(() => {
    if (isOpen) {
      setCopies(1)
      setPrintCustomerCopy(true)
      isPrintingRef.current = false
      const cached = getCache()
      if (cached) {
        // Cache hit — auto-select printer without any network call or loading state
        autoSelectPrinter(cached.printers, cached.hasLocalPrinter, cached.qzPrinters, cached.businessDefaultPrinterId, cached.myWorkstationAgentId, cached.workstationOverridePrinterId)
      } else {
        loadPrinters()
      }
    }
  }, [isOpen, businessId])

  async function loadPrinters(forceRefresh = false) {
    // Use cache if available and not forcing a refresh
    const cached = getCache()
    if (cached && !forceRefresh) {
      setPrinters(cached.printers)
      setHasLocalPrinter(cached.hasLocalPrinter)
      setLocalPrinterName(cached.localPrinterName)
      autoSelectPrinter(cached.printers, cached.hasLocalPrinter, cached.qzPrinters, cached.businessDefaultPrinterId, cached.myWorkstationAgentId, cached.workstationOverridePrinterId)
      setPrintersLoading(false)
      return
    }

    try {
      setPrintersLoading(true)

      // Fetch all receipt printers (including offline ones so users can bring them online).
      // MBM-283 Phase 1: businessId scopes out another business's AGENT-relayed
      // printers server-side — see printer-service.ts's listPrinters().
      // MBM-283 follow-up: this business's default resolves against ONE of two
      // identities, never both — a registered print terminal (lightweight,
      // localStorage, no agent — see print-terminal.ts) if this browser has
      // one, else this exact machine's own paired workstationAgentId (probed
      // the same local way the pairing card does). Both exist so several
      // workstations/terminals in one business can each default to a
      // *different* remote printer instead of one shared business-wide value.
      const myTerminal = getPrintTerminal()
      const [response, probeResult] = await Promise.all([
        fetch(`/api/printers?printerType=receipt${businessId ? `&businessId=${encodeURIComponent(businessId)}` : ''}`),
        (businessId && !myTerminal)
          ? fetch(`http://127.0.0.1:${PAIRING_PORT}/probe?serverUrl=${encodeURIComponent(window.location.origin)}&businessId=${encodeURIComponent(businessId)}`, { signal: AbortSignal.timeout(2000) })
              .then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),
      ])

      if (!response.ok) {
        throw new Error('Failed to load printers')
      }

      const data = await response.json()
      let availablePrinters = data.printers || []
      // MBM-283 follow-up: used to find "my own" AGENT printer in
      // autoSelectPrinter() below — no longer used to scope the
      // business-default lookup itself (there's no admin UI left that sets
      // a workstation-specific override; a paired workstation defaulting to
      // its own declared printer is handled entirely client-side now).
      const myWorkstationAgentId: string | null = myTerminal ? null : (probeResult?.profile?.workstationAgentId ?? null)

      // MBM-283 follow-up: "share this printer" being off hides a
      // workstation's own printer from the normal business-scoped list
      // above (by design — no one ELSE should see it) — but this
      // workstation must still be able to find and use it. Only fetched
      // when it's actually missing, so the common (already-shared) case
      // costs nothing extra.
      if (businessId && myWorkstationAgentId && !availablePrinters.some((p: NetworkPrinter) => p.workstationAgentId === myWorkstationAgentId)) {
        const ownRes = await fetch(`/api/printers?printerType=receipt&businessId=${encodeURIComponent(businessId)}&ownWorkstationAgentId=${encodeURIComponent(myWorkstationAgentId)}`).catch(() => null)
        if (ownRes?.ok) {
          const ownData = await ownRes.json()
          const ownPrinter = (ownData.printers || []).find((p: NetworkPrinter) => p.workstationAgentId === myWorkstationAgentId)
          if (ownPrinter) availablePrinters = [...availablePrinters, ownPrinter]
        }
      }

      // This business's default. Print terminals: one combined call, server
      // resolves terminal-specific → business-wide internally (terminals
      // have no "own printer" tier to slot in between, so one call is fine).
      // Workstations: TWO separate strict=true calls instead, because an
      // admin-set override for THIS workstation (e.g. "workstation C
      // always prints through workstation D's printer") must outrank this
      // workstation's own declared printer, which must in turn outrank the
      // generic business-wide fallback — three distinct tiers, not two —
      // see autoSelectPrinter() below for where each is actually applied.
      let businessDefaultPrinterId: string | null = null
      let workstationOverridePrinterId: string | null = null
      if (businessId && myTerminal) {
        const res = await fetch(`/api/printing/default-printer?businessId=${encodeURIComponent(businessId)}&printTerminalId=${encodeURIComponent(myTerminal.id)}`).catch(() => null)
        businessDefaultPrinterId = res?.ok ? (await res.json())?.printerId ?? null : null
      } else if (businessId) {
        const [overrideRes, businessRes] = await Promise.all([
          myWorkstationAgentId
            ? fetch(`/api/printing/default-printer?businessId=${encodeURIComponent(businessId)}&workstationAgentId=${encodeURIComponent(myWorkstationAgentId)}&strict=true`).catch(() => null)
            : Promise.resolve(null),
          fetch(`/api/printing/default-printer?businessId=${encodeURIComponent(businessId)}&strict=true`).catch(() => null),
        ])
        workstationOverridePrinterId = overrideRes?.ok ? (await overrideRes.json())?.printerId ?? null : null
        businessDefaultPrinterId = businessRes?.ok ? (await businessRes.json())?.printerId ?? null : null
      }

      // Check for local USB printer (Web Serial) and QZ Tray printers in parallel
      let localAvailable = false
      let localName = ''
      let detectedQzPrinters: string[] = []

      // Web Serial check
      if (isWebSerialSupported()) {
        const localConfig = getLocalPrinterConfig()
        if (localConfig) {
          localAvailable = await isLocalPrinterAvailable()
          localName = localConfig.name
        }
      }

      // QZ Tray: only show the saved printer (no connection on load — avoids security prompt)
      const savedQz = getQzPrinterConfig()
      if (savedQz) {
        detectedQzPrinters = [savedQz.printerName]
      }

      // Save to module-level cache
      setCache({
        printers: availablePrinters,
        hasLocalPrinter: localAvailable,
        localPrinterName: localName,
        qzPrinters: detectedQzPrinters,
        businessDefaultPrinterId,
        myWorkstationAgentId,
        workstationOverridePrinterId,
      })

      setPrinters(availablePrinters)
      setHasLocalPrinter(localAvailable)
      setLocalPrinterName(localName)
      setQzPrinters(detectedQzPrinters)
      autoSelectPrinter(availablePrinters, localAvailable, detectedQzPrinters, businessDefaultPrinterId, myWorkstationAgentId, workstationOverridePrinterId)

      if (availablePrinters.length === 0 && !localAvailable && detectedQzPrinters.length === 0) {
        toast.error('No printers found. Configure a network printer in Admin > Printers, or set up a local USB printer.')
      }

    } catch (error) {
      console.error('Failed to load printers:', error)
      toast.error('Failed to load available printers')
    } finally {
      setPrintersLoading(false)
    }
  }

  function autoSelectPrinter(availablePrinters: NetworkPrinter[], localAvailable: boolean, qzPrinterList: string[] = [], businessDefaultPrinterId: string | null = null, myWorkstationAgentId: string | null = null, workstationOverridePrinterId: string | null = null) {
    try {
      let lastPrinterId = localStorage.getItem(printerKey)
      if (!lastPrinterId) {
        const globalValue = localStorage.getItem('lastSelectedPrinterId')
        if (globalValue) {
          lastPrinterId = globalValue
          localStorage.setItem(printerKey, globalValue)
        }
      }

      let resolvedId: string | null = null
      if (lastPrinterId) {
        if (lastPrinterId === LOCAL_PRINTER_ID && localAvailable) {
          resolvedId = LOCAL_PRINTER_ID
        } else if (lastPrinterId.startsWith(QZ_PRINTER_PREFIX)) {
          const qzName = lastPrinterId.slice(QZ_PRINTER_PREFIX.length)
          if (qzPrinterList.includes(qzName)) resolvedId = lastPrinterId
        } else {
          const savedPrinter = availablePrinters.find((p: NetworkPrinter) => p.id === lastPrinterId)
          if (savedPrinter && savedPrinter.isOnline) resolvedId = lastPrinterId
        }
      }

      // Restored per-workstation admin override: lets several workstations
      // in one business each default to a *different* remote printer (e.g.
      // "workstation C always prints through workstation D's printer") —
      // an explicit admin decision for THIS specific workstation, so it
      // outranks even this workstation's own declared printer just below.
      // Set on this workstation's own row, Admin → Workstation Agents.
      if (!resolvedId && workstationOverridePrinterId) {
        const overridePrinter = availablePrinters.find((p: NetworkPrinter) => p.id === workstationOverridePrinterId)
        if (overridePrinter && overridePrinter.isOnline) resolvedId = workstationOverridePrinterId
      }

      // MBM-283 follow-up: a workstation with its own declared printer
      // defaults to THAT printer — not whatever the business-wide default
      // happens to be, which may belong to a different workstation
      // entirely. Ranked above QZ Tray/business-default since it requires
      // zero setup on this machine (the admin declared it once, centrally,
      // on this workstation's own row) — same intentionality as QZ, but
      // this is the "just works out of the box" tier the business-wide
      // fallback exists to catch devices that DON'T have one of their own.
      if (!resolvedId && myWorkstationAgentId) {
        const ownPrinter = availablePrinters.find((p: NetworkPrinter) => p.workstationAgentId === myWorkstationAgentId)
        if (ownPrinter && ownPrinter.isOnline) resolvedId = ownPrinter.id
      }

      // MBM-280: printerKey is cached per-USER, not per-business — a printer
      // (or agent-relay id) valid for whichever business was used last often
      // isn't valid for a different business on the same machine (e.g. an
      // AGENT-relayed printer id tied to a different business's workstation
      // agent). Previously that just left nothing selected. QZ Tray's own
      // saved printer (getQzPrinterConfig()) is genuinely machine-wide, not
      // business-scoped, so it's a safe universal fallback whenever the
      // cached choice above doesn't apply here — not just when there was no
      // cached choice at all — so QZ effectively works for every business
      // sharing one workstation without a separate per-business setup step.
      if (!resolvedId && qzPrinterList.length > 0) {
        const saved = getQzPrinterConfig()
        if (saved && qzPrinterList.includes(saved.printerName)) {
          resolvedId = QZ_PRINTER_PREFIX + saved.printerName
        }
      }

      // MBM-283 Phase 3: last resort — this business's server-side default,
      // below both the user's own saved choice and QZ's machine-specific
      // setup (which stays more specific/intentional than a business-wide
      // fallback). This is what gives a mobile device with nothing of its
      // own configured yet a sensible printer instead of nothing at all.
      if (!resolvedId && businessDefaultPrinterId) {
        const defaultPrinter = availablePrinters.find((p: NetworkPrinter) => p.id === businessDefaultPrinterId)
        if (defaultPrinter && defaultPrinter.isOnline) resolvedId = businessDefaultPrinterId
      }

      if (resolvedId) setSelectedPrinterId(resolvedId)
    } catch (storageError) {
      console.warn('Failed to load saved printer preference:', storageError)
    }
  }

  async function handleBringOnline(printerId: string) {
    setCheckingOnline(true)
    try {
      const response = await fetch(`/api/printers/${printerId}/check-connectivity`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to check printer connectivity')
      const { isOnline } = await response.json()
      if (isOnline) {
        toast.push('Printer is now online and ready!')
        printerCacheByBusiness.delete(businessId) // Invalidate cache so fresh status is fetched
        await loadPrinters(true)
      } else {
        toast.error('Printer is still offline. Check power and network connection.')
      }
    } catch (error) {
      toast.error('Error checking printer status')
    } finally {
      setCheckingOnline(false)
    }
  }

  async function handlePrint() {
    if (!receiptData) {
      toast.error('No receipt data')
      return
    }

    // Ref-based guard to prevent double-clicks (synchronous, not subject to React batching)
    if (isPrintingRef.current) {
      console.log('⚠️ Print already in progress (ref guard), ignoring click')
      return
    }

    // Also check state for UI consistency
    if (loading) {
      console.log('⚠️ Print already in progress (state guard), ignoring click')
      return
    }

    // Set ref immediately (synchronous) to block subsequent clicks
    isPrintingRef.current = true
    setLoading(true)

    try {
      // Local USB printer path — print directly from browser via Web Serial
      if (selectedPrinterId === LOCAL_PRINTER_ID) {
        console.log('🖨️ [Modal] Printing to local USB printer via Web Serial')

        // Generate business copy ESC/POS string client-side
        const businessReceiptData = { ...receiptData, receiptType: 'business' as const }
        const businessEscPos = generateReceipt(businessReceiptData)
        await printToLocalPrinter(businessEscPos, 1)
        console.log('✅ Business copy printed locally')

        // Print customer copy if enabled
        if (supportsCustomerCopy && printCustomerCopy) {
          const customerReceiptData = { ...receiptData, receiptType: 'customer' as const }
          const customerEscPos = generateReceipt(customerReceiptData)
          await printToLocalPrinter(customerEscPos, copies)
          console.log('✅ Customer copy printed locally (' + copies + ' copies)')
        }

        // Extra jobs (e.g. delivery kitchen + customer copies) — stored as base64, decode first
        if (extraEscPosJobs?.length) {
          for (const job of extraEscPosJobs) {
            await new Promise(r => setTimeout(r, 1500))
            await printToLocalPrinter(atob(job), 1)
          }
        }
        toast.push('Receipt printed to local USB printer')
        onClose()
        return
      }

      // QZ Tray printer path — print directly via QZ Tray WebSocket
      if (selectedPrinterId?.startsWith(QZ_PRINTER_PREFIX)) {
        const printerName = selectedPrinterId.slice(QZ_PRINTER_PREFIX.length)
        console.log('🖨️ [Modal] Printing via QZ Tray to:', printerName)

        const businessReceiptData = { ...receiptData, receiptType: 'business' as const }
        const businessEscPos = generateReceipt(businessReceiptData)
        await printToQzPrinter(printerName, businessEscPos)
        console.log('✅ Business copy printed via QZ Tray')

        if (supportsCustomerCopy && printCustomerCopy) {
          const customerReceiptData = { ...receiptData, receiptType: 'customer' as const }
          const customerEscPos = generateReceipt(customerReceiptData)
          for (let i = 0; i < copies; i++) {
            await printToQzPrinter(printerName, customerEscPos)
          }
          console.log('✅ Customer copy printed via QZ Tray (' + copies + ' copies)')
        }

        // Extra jobs (e.g. delivery kitchen + customer copies) — stored as base64, decode first
        if (extraEscPosJobs?.length) {
          for (const job of extraEscPosJobs) {
            await new Promise(r => setTimeout(r, 1500))
            await printToQzPrinter(printerName, atob(job))
          }
        }
        toast.push('Receipt printed via QZ Tray')
        onClose()
        return
      }

      // Network printer path — send to server print queue
      console.log('📋 [Modal] Calling onPrintConfirm at:', new Date().toISOString())
      console.log('   printerId:', selectedPrinterId)
      console.log('   copies:', copies)
      console.log('   printCustomerCopy:', printCustomerCopy)

      await onPrintConfirm({
        printerId: selectedPrinterId,
        copies,
        printCustomerCopy,
      })

      console.log('✅ [Modal] onPrintConfirm completed')
      toast.push('Receipt sent to printer')
      onClose()

    } catch (error) {
      console.error('Print failed:', error)
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Print failed - ' + errMsg)
      // If the error indicates the printer is offline, update its status in state
      // so the "Bring Online" button becomes visible without navigating away
      if (errMsg.toLowerCase().includes('offline') || errMsg.toLowerCase().includes('unreachable')) {
        setPrinters(prev => prev.map(p => p.id === selectedPrinterId ? { ...p, isOnline: false } : p))
      }
    } finally {
      isPrintingRef.current = false
      setLoading(false)
    }
  }

  const selectedPrinter = printers.find(p => p.id === selectedPrinterId)
  const isLocalSelected = selectedPrinterId === LOCAL_PRINTER_ID
  const isQzSelected = selectedPrinterId?.startsWith(QZ_PRINTER_PREFIX) ?? false
  const isRestaurant = businessType === 'restaurant'
  const supportsCustomerCopy = !hideCustomerCopy && ['restaurant', 'grocery', 'clothing', 'hardware', 'services', 'vehicle_service'].includes(businessType)
  const copyLabel = title.includes('Voucher') ? 'Vendor Copy' : 'Customer Copy'
  const hasPrintersOrLocal = printers.length > 0 || hasLocalPrinter || qzPrinters.length > 0

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      noPadding
    >
      {/* Two-panel layout: receipt preview left, settings right */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">

        {/* Left panel — receipt preview */}
        <div className="md:w-[42%] border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <span>🧾</span> {title.replace('Print ', '')} Preview
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 max-h-[55vh] md:max-h-[70vh]">
            {receiptData ? (
              <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                <ReceiptTemplate
                  data={{
                    ...receiptData,
                    receiptType: 'customer'
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                No receipt data
              </div>
            )}
          </div>
        </div>

        {/* Right panel — settings + actions. flex-1 + min-h-0 must apply
            unconditionally, not just md:flex-1 — on mobile (where the panels
            above stack via flex-col instead of sitting side by side), a
            bare "md:flex-1" gives this panel no height constraint at all
            below the md breakpoint, so it grows to its natural content
            height. Combined with the preview panel above it, that can
            exceed the Modal's 90vh cap — and since Modal clips overflow
            instead of scrolling it (noPadding mode), the "always visible,
            stuck to bottom" action buttons below were silently cut off
            entirely on narrow screens, with no way to scroll to them. */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Printer Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Printer <span className="text-red-500">*</span>
              </label>

              {printersLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
                  Loading printers...
                </div>
              ) : !hasPrintersOrLocal ? (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-800 dark:text-yellow-200">No printers configured</div>
                    <div className="text-yellow-700 dark:text-yellow-300 text-xs mt-0.5">
                      Set up a network printer in Admin → Printers, or connect a local USB printer below.
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedPrinterId || ''}
                  onChange={(e) => {
                    const printerId = e.target.value
                    setSelectedPrinterId(printerId)
                    if (printerId) {
                      try {
                        localStorage.setItem(printerKey, printerId)
                      } catch (storageError) {
                        console.warn('Failed to save printer preference:', storageError)
                      }
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="">-- Select a printer --</option>
                  {hasLocalPrinter && (
                    <option value={LOCAL_PRINTER_ID}>{localPrinterName} (Local USB)</option>
                  )}
                  {qzPrinters.map((name) => (
                    <option key={`${QZ_PRINTER_PREFIX}${name}`} value={`${QZ_PRINTER_PREFIX}${name}`}>
                      {name} (QZ Tray)
                    </option>
                  ))}
                  {printers.map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {formatPrinterName(printer)} {printer.isOnline ? '(Online)' : '(Offline)'}
                    </option>
                  ))}
                </select>
              )}

              {/* Printer status */}
              {!selectedPrinterId && hasPrintersOrLocal && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Select a printer to continue
                </p>
              )}
              {isLocalSelected && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <Usb className="w-3.5 h-3.5" /> Prints directly from this browser
                </p>
              )}
              {isQzSelected && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <Printer className="w-3.5 h-3.5" /> Prints via QZ Tray on this machine
                </p>
              )}
              {selectedPrinter && !isLocalSelected && (
                <div className="mt-1.5">
                  {selectedPrinter.isOnline ? (
                    <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                      <Check className="w-3.5 h-3.5" /> Online and ready
                    </p>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3.5 h-3.5" /> Printer offline
                      </p>
                      <button
                        onClick={() => handleBringOnline(selectedPrinter.id)}
                        disabled={checkingOnline}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                      >
                        <Wifi className="w-3 h-3" />
                        {checkingOnline ? 'Checking...' : 'Bring Online'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* QZ Tray Setup / Bring Online */}
              <div className="mt-2">
                <button
                  onClick={() => setShowQzSetup(v => !v)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showQzSetup ? '▲ Hide QZ Setup' : '⚙ QZ Tray Setup / Bring Online'}
                </button>
                {showQzSetup && (
                  <div className="mt-2">
                    <QzTraySetup
                      compact
                      lazy
                      onSetupComplete={(cfg) => {
                        setQzPrinters([cfg.printerName])
                        setSelectedPrinterId(`qz::${cfg.printerName}`)
                        const cached = getCache()
                        if (cached) setCache({ ...cached, qzPrinters: [cfg.printerName] })
                      }}
                      onDisconnect={() => {
                        setQzPrinters([])
                        const cached = getCache()
                        if (cached) setCache({ ...cached, qzPrinters: [] })
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Local USB Printer Setup */}
              {isWebSerialSupported() && (
                <div className="mt-2">
                  {!hasLocalPrinter && !showLocalSetup && (
                    <button
                      onClick={() => setShowLocalSetup(true)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Usb className="w-3 h-3" /> Setup Local USB Printer
                    </button>
                  )}
                  {showLocalSetup && !hasLocalPrinter && (
                    <LocalPrinterSetup
                      compact
                      onSetupComplete={(config) => {
                        setHasLocalPrinter(true)
                        setLocalPrinterName(config.name)
                        setSelectedPrinterId(LOCAL_PRINTER_ID)
                        setShowLocalSetup(false)
                        localStorage.setItem(printerKey, LOCAL_PRINTER_ID)
                        // Update cache with new local printer
                        const cached = getCache()
                        if (cached) setCache({ ...cached, hasLocalPrinter: true, localPrinterName: config.name })
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Customer copy settings */}
            {supportsCustomerCopy && (
              <>
                {/* Copies */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                    {copyLabel} Qty
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={copies}
                      onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                      className="w-20 border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600"
                    />
                    <span className="text-xs text-gray-500">Business copy is always 1</span>
                  </div>
                </div>

                {/* Customer copy toggle */}
                <div className="flex items-center justify-between py-2.5 px-3 border rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Print {copyLabel}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Optional — business copy always prints</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={printCustomerCopy}
                      onChange={(e) => setPrintCustomerCopy(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </>
            )}

            {/* Print Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1.5 text-xs uppercase tracking-wide">Print Summary</p>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200 text-sm">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-500" /> Business Copy: 1</li>
                {supportsCustomerCopy && printCustomerCopy && (
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-500" /> {copyLabel}: {copies}</li>
                )}
                {supportsCustomerCopy && !printCustomerCopy && (
                  <li className="flex items-center gap-1.5 text-blue-400 dark:text-blue-500 line-through">{copyLabel}: disabled</li>
                )}
              </ul>
            </div>
          </div>

          {/* Action buttons — always visible, stuck to bottom of right panel */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            {onCancelOrder && (
              <button
                onClick={onCancelOrder}
                disabled={loading}
                className="mr-auto px-3 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
              >
                Cancel Order
              </button>
            )}
            <Button variant="outline" onClick={onClose} disabled={loading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handlePrint}
              disabled={loading || !selectedPrinterId || (!isLocalSelected && !isQzSelected && !selectedPrinter?.isOnline)}
              title={
                !selectedPrinterId
                  ? 'Please select a printer first'
                  : !isLocalSelected && !isQzSelected && !selectedPrinter?.isOnline
                  ? 'Selected printer is offline'
                  : 'Print receipt'
              }
            >
              <Printer className="w-4 h-4 mr-2" />
              {loading ? 'Printing...' : title}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
