'use client'

/**
 * PrintCardToReceiptPrinter
 *
 * Prints a card (loyalty card, employee ID card) to the configured thermal receipt printer.
 * Matches the receipt system's printer selection pattern:
 *  - Loads printers from GET /api/printers?printerType=receipt
 *  - Auto-selects the last used printer (user-scoped localStorage key)
 *  - Saves printer choice to localStorage on change
 *  - Sends through the same print queue as receipts
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { printCardToReceiptPrinter } from '@/lib/printing/card-print-utils'
import { getQzPrinterConfig } from '@/lib/printing/qz-tray-printer'
import { QzTraySetup } from '@/components/printing/qz-tray-setup'

const QZ_PRINTER_PREFIX = 'qz::'

interface NetworkPrinter {
  id: string
  printerName: string
  isActive: boolean
  isOnline?: boolean
}

interface PrintCardToReceiptPrinterProps {
  /** id= attribute of the card DOM element to capture */
  cardElementId: string
  /** Business ID — required for print job queue */
  businessId: string
  label?: string
  className?: string
  disabled?: boolean
  onPrintSuccess?: () => void
}

export function PrintCardToReceiptPrinter({
  cardElementId,
  businessId,
  label = 'Print to Receipt Printer',
  className,
  disabled = false,
  onPrintSuccess,
}: PrintCardToReceiptPrinterProps) {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined

  // Same localStorage key as the receipt modal (persists printer choice per user)
  const printerKey = userId ? `lastSelectedPrinterId-${userId}` : 'lastSelectedPrinterId'

  const [printers, setPrinters] = useState<NetworkPrinter[]>([])
  const [qzPrinters, setQzPrinters] = useState<string[]>([])
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('')
  const [printing, setPrinting] = useState(false)
  const [loadingPrinters, setLoadingPrinters] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showQzSetup, setShowQzSetup] = useState(false)

  // Load receipt printers + saved QZ printer (no QZ connection on mount)
  useEffect(() => {
    if (!userId) return

    setLoadingPrinters(true)
    fetch('/api/printers?printerType=receipt', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { printers: [] })
      .then(data => {
        const list: NetworkPrinter[] = data.printers || []
        setPrinters(list)

        // Only show the saved QZ printer — no connection required, no security prompt
        const savedQz = getQzPrinterConfig()
        const qzList = savedQz ? [savedQz.printerName] : []
        setQzPrinters(qzList)

        // Auto-select saved printer
        let saved = localStorage.getItem(printerKey)
        if (!saved) {
          const global = localStorage.getItem('lastSelectedPrinterId')
          if (global) { saved = global; localStorage.setItem(printerKey, global) }
        }
        if (saved) {
          if (saved.startsWith(QZ_PRINTER_PREFIX) && qzList.includes(saved.slice(QZ_PRINTER_PREFIX.length))) {
            setSelectedPrinterId(saved); return
          }
          const match = list.find(p => p.id === saved)
          if (match) { setSelectedPrinterId(match.id); return }
        }
        // Fallback: saved QZ printer first, then first online network printer
        if (savedQz) { setSelectedPrinterId(QZ_PRINTER_PREFIX + savedQz.printerName); return }
        const online = list.find(p => p.isOnline)
        if (online) setSelectedPrinterId(online.id)
        else if (list.length === 1) setSelectedPrinterId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingPrinters(false))
  }, [userId, printerKey])

  const handlePrinterChange = (id: string) => {
    setSelectedPrinterId(id)
    localStorage.setItem(printerKey, id)
  }

  const handlePrint = async () => {
    if (!selectedPrinterId) { setError('No printer selected'); return }
    const el = document.getElementById(cardElementId)
    if (!el) { setError('Card element not found'); return }

    setPrinting(true)
    setError(null)
    setSuccess(false)
    try {
      await printCardToReceiptPrinter(el, selectedPrinterId, businessId)
      setSuccess(true)
      onPrintSuccess?.()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Print failed')
    } finally {
      setPrinting(false)
    }
  }

  if (loadingPrinters) {
    return (
      <div className="w-full py-1.5 flex items-center justify-center gap-2 text-sm text-gray-500">
        <span className="inline-block w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        Looking for receipt printers…
      </div>
    )
  }

  if (printers.length === 0 && qzPrinters.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-1">No receipt printers found</p>
    )
  }

  const totalPrinters = printers.length + qzPrinters.length

  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      {totalPrinters > 1 && (
        <select
          value={selectedPrinterId}
          onChange={e => handlePrinterChange(e.target.value)}
          className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-primary"
        >
          <option value="">Select printer…</option>
          {qzPrinters.map(name => (
            <option key={`${QZ_PRINTER_PREFIX}${name}`} value={`${QZ_PRINTER_PREFIX}${name}`}>
              {name} (QZ Tray)
            </option>
          ))}
          {printers.map(p => (
            <option key={p.id} value={p.id}>
              {p.printerName}{p.isOnline === false ? ' (offline)' : ''}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={handlePrint}
        disabled={printing || !selectedPrinterId || disabled}
        className="w-full py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {printing ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Printing…
          </>
        ) : success ? '✅ Card Printed!' : <>🖨️ {label}</>}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* QZ Tray Setup — toggle for configuring local receipt printer */}
      <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
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
                setSelectedPrinterId(`${QZ_PRINTER_PREFIX}${cfg.printerName}`)
              }}
              onDisconnect={() => setQzPrinters([])}
            />
          </div>
        )}
      </div>
    </div>
  )
}
