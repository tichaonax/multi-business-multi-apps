'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatDate } from '@/lib/date-format'

interface Bale {
  id: string
  sku: string
  scanCode: string
  batchNumber: string
  itemCount: number
  remainingCount: number
  unitPrice: number
  barcode: string | null
  category: { name: string }
}

interface BarcodeTemplate {
  id: string
  name: string
  symbology: string
  width: number
  height: number
  batchId?: string
}

interface NetworkPrinter {
  id: string
  printerName: string
  isOnline?: boolean
}

export interface ProductData {
  id: string
  name: string
  barcodeData: string
  sellingPrice: number
  sku?: string
  description?: string
  size?: string
  color?: string
  itemName?: string
  batchNumber?: string
  itemCount?: number
}

interface BulkPrintModalProps {
  isOpen: boolean
  onClose: () => void
  baleId?: string
  qty?: number
  templateId?: string
  businessId?: string
  /** Individual product data — use instead of baleId for non-bale stock items */
  productData?: ProductData
  /** Multiple products — use when printing a batch of generated items */
  products?: ProductData[]
  /** When true the template selector is read-only */
  lockTemplate?: boolean
  /**
   * Compact mode: bale + template are already known.
   * Shows only qty input + print buttons — no bale table, no selectors.
   * Default qty becomes 0 so the user must consciously enter a number.
   */
  compact?: boolean
}

function escHtml(str: string) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildLabelHtml(bale: Bale, barcodeSvg: string, businessName: string, template: BarcodeTemplate, qty: number = 1): string {
  const today = formatDate(new Date())
  const refCode = bale.scanCode.substring(0, 6).toUpperCase()
  const batchLine = template.batchId ? `${qty}-${template.batchId}` : ''
  const dateLine = [refCode, today, batchLine].filter(Boolean).join(' · ')
  const price = `$ ${Number(bale.unitPrice).toFixed(2)}`
  return `
    <div style="width:220px;border:1px dashed #999;padding:8px 10px;background:white;font-family:sans-serif;display:inline-block;vertical-align:top;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;font-size:8px;color:#555;font-family:monospace;margin-bottom:4px;"><span>&#124;&nbsp;&nbsp;&#124;</span><span>&#124;&nbsp;&nbsp;&#124;</span></div>
      <div style="font-size:13px;font-weight:bold;text-align:center;margin-bottom:2px;">${escHtml(businessName)}</div>
      <div style="font-size:11px;font-weight:600;text-align:center;margin-bottom:2px;">${escHtml(bale.category.name)}</div>
      <div style="font-size:9px;text-align:center;margin-bottom:2px;">Batch ${escHtml(bale.batchNumber)}</div>
      ${bale.itemCount ? `<div style="font-size:9px;text-align:center;margin-bottom:2px;">${escHtml(String(bale.itemCount))} Items</div>` : ''}
      <div style="font-size:9px;text-align:center;margin-bottom:4px;">${escHtml(dateLine)}</div>
      <div style="display:flex;justify-content:center;margin-bottom:2px;">${barcodeSvg}</div>
      <div style="font-size:9px;text-align:center;color:#444;margin-bottom:4px;letter-spacing:0.03em;">${escHtml(bale.scanCode)}</div>
      <div style="font-size:18px;font-weight:bold;text-align:center;margin-bottom:2px;">${escHtml(price)}</div>
      <div style="font-size:8px;text-align:center;color:#666;">${escHtml(template.name)}</div>
      <div style="display:flex;justify-content:space-between;font-size:8px;color:#555;font-family:monospace;margin-top:4px;"><span>&#124;&nbsp;&nbsp;&#124;</span><span>&#124;&nbsp;&nbsp;&#124;</span></div>
    </div>
  `
}

function buildProductLabelHtml(product: ProductData, barcodeSvg: string, businessName: string, templateName: string, batchId?: string, qty?: number): string {
  const today = formatDate(new Date())
  const batchSuffix = batchId ? ` ${qty ?? 1}-${batchId}` : ''
  const dateLine = today + batchSuffix
  const price = `$ ${Number(product.sellingPrice).toFixed(2)}`
  return `
    <div style="width:220px;border:1px dashed #999;padding:8px 10px;background:white;font-family:sans-serif;display:inline-block;vertical-align:top;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;font-size:8px;color:#555;font-family:monospace;margin-bottom:4px;"><span>&#124;&nbsp;&nbsp;&#124;</span><span>&#124;&nbsp;&nbsp;&#124;</span></div>
      <div style="font-size:13px;font-weight:bold;text-align:center;margin-bottom:2px;">${escHtml(businessName)}</div>
      <div style="font-size:11px;font-weight:600;text-align:center;margin-bottom:2px;">${escHtml(product.name)}</div>
      ${product.description ? `<div style="font-size:9px;text-align:center;margin-bottom:2px;">${escHtml(product.description)}</div>` : ''}
      ${product.size ? `<div style="font-size:16px;font-weight:bold;text-align:center;margin-bottom:2px;">${escHtml(product.size)}</div>` : ''}
      ${product.sku ? `<div style="font-size:9px;text-align:center;margin-bottom:2px;">SKU: ${escHtml(product.sku)}</div>` : ''}
      ${product.batchNumber ? `<div style="font-size:9px;text-align:center;margin-bottom:2px;">Batch: ${escHtml(product.batchNumber)}</div>` : ''}
      ${product.itemCount ? `<div style="font-size:9px;text-align:center;margin-bottom:2px;">Items: ${product.itemCount}</div>` : ''}
      <div style="font-size:9px;text-align:center;margin-bottom:4px;">${escHtml(dateLine)}</div>
      <div style="display:flex;justify-content:center;margin-bottom:2px;">${barcodeSvg}</div>
      <div style="font-size:9px;text-align:center;color:#444;margin-bottom:4px;letter-spacing:0.03em;">${escHtml(product.barcodeData)}</div>
      <div style="font-size:18px;font-weight:bold;text-align:center;margin-bottom:2px;">${escHtml(price)}</div>
      ${product.color ? `<div style="font-size:9px;text-align:center;margin-bottom:2px;">${escHtml(product.color)}</div>` : ''}
      ${product.itemName ? `<div style="font-size:9px;text-align:center;margin-bottom:2px;">${escHtml(product.itemName)}</div>` : ''}
      <div style="font-size:8px;text-align:center;color:#666;">${escHtml(templateName)}</div>
      <div style="display:flex;justify-content:space-between;font-size:8px;color:#555;font-family:monospace;margin-top:4px;"><span>&#124;&nbsp;&nbsp;&#124;</span><span>&#124;&nbsp;&nbsp;&#124;</span></div>
    </div>
  `
}

export function BulkPrintModal({ isOpen, onClose, baleId, qty, templateId, businessId: propBusinessId, productData, products, lockTemplate, compact }: BulkPrintModalProps) {
  const { currentBusinessId, activeBusinesses, loading: contextLoading } = useBusinessPermissionsContext()
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [qtyPerBale, setQtyPerBale] = useState<number>(compact ? 0 : (qty && qty > 0 ? qty : 5))
  const bizInitRef = useRef(false)

  useEffect(() => {
    if (!isOpen) { bizInitRef.current = false; return }
    if (bizInitRef.current || contextLoading) return
    bizInitRef.current = true
    const init = propBusinessId ?? currentBusinessId
    if (init) { setSelectedBusinessId(init); return }
    if (activeBusinesses.length > 0) {
      const nonDemo = activeBusinesses.find(b => !b.isDemo)
      setSelectedBusinessId((nonDemo ?? activeBusinesses[0]).businessId)
    }
  }, [isOpen, contextLoading, currentBusinessId, activeBusinesses, propBusinessId])

  // Reset qty when modal opens
  useEffect(() => {
    if (!isOpen) return
    setQtyPerBale(compact && !productData ? 0 : (qty && qty > 0 ? qty : (compact ? 0 : 5)))
  }, [isOpen, qty, compact])

  const clothingBusinesses = activeBusinesses.filter(b => b.businessType === 'clothing' && !b.isUmbrellaBusiness)

  // Templates
  const [templates, setTemplates] = useState<BarcodeTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templatesLoading, setTemplatesLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !selectedBusinessId) return
    setTemplatesLoading(true)
    fetch(`/api/universal/barcode-management/templates?businessId=${selectedBusinessId}&limit=100`)
      .then(r => r.json())
      .then(data => {
        const list: BarcodeTemplate[] = data.templates ?? data.data ?? []
        setTemplates(list)
        if (list.length === 0) return
        const preferred = templateId && list.find(t => t.id === templateId)
        setSelectedTemplateId(preferred ? preferred.id : list[0].id)
      })
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false))
  }, [isOpen, selectedBusinessId])

  // Bales
  const [bales, setBales] = useState<Bale[]>([])
  const [balesLoading, setBalesLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOpen || !selectedBusinessId) return
    setBalesLoading(true)
    setBales([])
    setSelectedIds(new Set())
    fetch(`/api/clothing/bales?businessId=${selectedBusinessId}`)
      .then(r => r.json())
      .then(data => {
        const list: Bale[] = (data.data ?? data.bales ?? []).filter((b: Bale) => b.remainingCount > 0)
        setBales(list)
        if (baleId) setSelectedIds(new Set([baleId]))
      })
      .catch(() => setBales([]))
      .finally(() => setBalesLoading(false))
  }, [isOpen, selectedBusinessId])

  const filtered = search.trim()
    ? bales.filter(b =>
        b.sku.toLowerCase().includes(search.toLowerCase()) ||
        b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
        b.category.name.toLowerCase().includes(search.toLowerCase())
      )
    : bales

  const allFilteredSelected = filtered.length > 0 && filtered.every(b => selectedIds.has(b.id))
  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(b => n.delete(b.id)); return n })
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(b => n.add(b.id)); return n })
    }
  }
  const toggle = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Quick template creation (compact mode)
  const [showQuickTemplate, setShowQuickTemplate] = useState(false)
  const [quickTplName, setQuickTplName] = useState('')
  const [quickTplBatchId, setQuickTplBatchId] = useState('')
  const [quickTplSaving, setQuickTplSaving] = useState(false)
  const [quickTplError, setQuickTplError] = useState<string | null>(null)

  async function saveQuickTemplate() {
    if (!quickTplName.trim()) { setQuickTplError('Enter a template name first'); return }
    if (!selectedBusinessId) { setQuickTplError('No business selected — cannot create template'); return }
    setQuickTplSaving(true)
    setQuickTplError(null)
    try {
      const bizType = activeBusinesses.find(b => b.businessId === selectedBusinessId)?.businessType ?? 'clothing'
      const res = await fetch('/api/universal/barcode-management/templates', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickTplName.trim(),
          barcodeValue: `${quickTplName.trim().toUpperCase().replace(/\s+/g, '-')}-TPL`,
          batchId: quickTplBatchId.trim() || undefined,
          type: bizType,
          description: 'Quick template',
          symbology: 'code128',
          businessId: selectedBusinessId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Failed to create template (${res.status})`)
      const newId = json.template?.id ?? json.id
      // Reload templates then select new one
      const listRes = await fetch(`/api/universal/barcode-management/templates?businessId=${selectedBusinessId}&limit=100`, { credentials: 'include' })
      const listJson = await listRes.json()
      const list: BarcodeTemplate[] = listJson.templates ?? listJson.data ?? []
      setTemplates(list)
      if (newId) setSelectedTemplateId(newId)
      setShowQuickTemplate(false)
      setQuickTplName('')
      setQuickTplBatchId('')
      setQuickTplError(null)
    } catch (err: any) {
      setQuickTplError(err?.message ?? 'Failed to create template')
    } finally {
      setQuickTplSaving(false)
    }
  }

  // Receipt printers
  const printerKey = userId ? `lastSelectedPrinterId-${userId}` : 'lastSelectedPrinterId'
  const [printers, setPrinters] = useState<NetworkPrinter[]>([])
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('')
  const [printersLoading, setPrintersLoading] = useState(true)
  const [checkingOnline, setCheckingOnline] = useState<string | null>(null)

  const loadPrinters = (currentSelected?: string) => {
    setPrintersLoading(true)
    fetch('/api/printers?printerType=receipt', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { printers: [] })
      .then(data => {
        const list: NetworkPrinter[] = data.printers || []
        setPrinters(list)
        const saved = currentSelected ?? localStorage.getItem(printerKey) ?? localStorage.getItem('lastSelectedPrinterId') ?? ''
        if (saved && list.find(p => p.id === saved)) { setSelectedPrinterId(saved); return }
        const online = list.find(p => p.isOnline)
        if (online) setSelectedPrinterId(online.id)
        else if (list.length === 1) setSelectedPrinterId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setPrintersLoading(false))
  }

  useEffect(() => {
    if (!isOpen || !userId) return
    let saved = localStorage.getItem(printerKey)
    if (!saved) {
      const global = localStorage.getItem('lastSelectedPrinterId')
      if (global) { saved = global; localStorage.setItem(printerKey, global) }
    }
    loadPrinters(saved ?? undefined)
  }, [isOpen, userId, printerKey])

  const handleBringOnline = async (printerId: string) => {
    setCheckingOnline(printerId)
    try {
      const res = await fetch(`/api/printers/${printerId}/check-connectivity`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const { isOnline } = await res.json()
      if (isOnline) {
        setReceiptError(null)
        loadPrinters(printerId)
      } else {
        setReceiptError('Printer is still offline. Check power and network connection.')
      }
    } catch {
      setReceiptError('Error checking printer status.')
    } finally {
      setCheckingOnline(null)
    }
  }

  const handlePrinterChange = (id: string) => {
    setSelectedPrinterId(id)
    localStorage.setItem(printerKey, id)
  }

  // PDF print — opens a small print-only popup (no app chrome)
  const [isPdfPrinting, setIsPdfPrinting] = useState(false)

  const logPrintHistory = async (qty: number) => {
    if (!selectedBusinessId || !selectedTemplateId) return
    try {
      await fetch('/api/clothing/label-print-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          baleId: baleId ?? null,
          templateId: selectedTemplateId,
          quantity: qty,
          notes: compact ? 'reprint' : 'print',
        }),
      })
    } catch { /* non-critical */ }
  }

  const handlePdfPrint = async () => {
    if (!productData && !products?.length && selectedIds.size === 0) return
    setIsPdfPrinting(true)
    try {
      const JsBarcode = (await import('jsbarcode')).default
      const bizName = activeBusinesses.find(b => b.businessId === selectedBusinessId)?.businessName ?? ''
      const genericTemplate = { id: 'generic', name: 'Generic', symbology: 'CODE128', width: 200, height: 100 }
      const template = templates.find(t => t.id === selectedTemplateId) ?? genericTemplate

      let labelHtmls: string[]

      if (products?.length) {
        // Multiple products path
        labelHtmls = products.flatMap(p => {
          const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          JsBarcode(svgEl, p.barcodeData, { format: template.symbology?.toUpperCase() || 'CODE128', width: 1.5, height: 40, displayValue: false, margin: 4 })
          svgEl.style.maxWidth = '100%'; svgEl.style.display = 'block'
          return Array(qtyPerBale).fill(buildProductLabelHtml(p, svgEl.outerHTML, bizName, template.name, template.batchId, qtyPerBale))
        })
      } else if (productData) {
        // Individual product path
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        JsBarcode(svgEl, productData.barcodeData, { format: template.symbology?.toUpperCase() || 'CODE128', width: 1.5, height: 40, displayValue: false, margin: 4 })
        svgEl.style.maxWidth = '100%'; svgEl.style.display = 'block'
        const html = buildProductLabelHtml(productData, svgEl.outerHTML, bizName, template.name, template.batchId, qtyPerBale)
        labelHtmls = Array(qtyPerBale).fill(html)
      } else {
        // Bale path (existing)
        const selected = bales.filter(b => selectedIds.has(b.id))
        labelHtmls = selected.flatMap(bale => {
          const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          JsBarcode(svgEl, bale.scanCode, { format: template.symbology?.toUpperCase() || 'CODE128', width: 1.5, height: 40, displayValue: false, margin: 4 })
          svgEl.style.maxWidth = '100%'; svgEl.style.display = 'block'
          return Array(qtyPerBale).fill(buildLabelHtml(bale, svgEl.outerHTML, bizName, template, qtyPerBale))
        })
      }

      const rows: string[] = []
      for (let i = 0; i < labelHtmls.length; i += 3) {
        const chunk = labelHtmls.slice(i, i + 3)
        rows.push(`<div style="display:flex;margin-bottom:0;page-break-inside:avoid;">${chunk.join('')}</div>`)
      }
      const title = `Barcodes — ${labelHtmls.length} label${labelHtmls.length !== 1 ? 's' : ''}`
      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) { alert('Popup blocked — please allow popups for this site.'); return }
      printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
        <style>
          html,body{margin:0;padding:0;}
          body{padding:16px;font-family:sans-serif;}
          .print-toolbar{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:12px;z-index:100;margin:-16px -16px 16px;}
          .print-btn{background:#1f2937;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:14px;font-weight:600;cursor:pointer;}
          .print-btn:hover{background:#374151;}
          .print-title{font-size:13px;color:#64748b;}
          @media print{.print-toolbar{display:none;}body{padding:5mm;}}
        </style>
        </head><body>
        <div class="print-toolbar">
          <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <span class="print-title">${title}</span>
        </div>
        ${rows.join('')}
        </body></html>`)
      printWindow.document.close()
      await logPrintHistory(labelHtmls.length)
    } finally {
      setIsPdfPrinting(false)
    }
  }

  // Receipt printer
  const [isReceiptPrinting, setIsReceiptPrinting] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [receiptSuccess, setReceiptSuccess] = useState(false)

  const handleReceiptPrint = async (isRetry = false) => {
    if (!productData && !products?.length && selectedIds.size === 0) return
    if (!selectedPrinterId) return
    setIsReceiptPrinting(true)
    setReceiptError(null)
    setReceiptSuccess(false)
    try {
      const { generateBarcodeLabel } = await import('@/lib/barcode-label-generator')
      const bizName = activeBusinesses.find(b => b.businessId === selectedBusinessId)?.businessName ?? ''
      const genericTemplate = { id: 'generic', name: 'Generic', symbology: 'code128', width: 200, height: 100, batchId: undefined }
      const template = templates.find(t => t.id === selectedTemplateId) ?? genericTemplate

      let allLabels = ''

      if (products?.length) {
        // Multiple products path
        for (const p of products) {
          allLabels += generateBarcodeLabel({
            barcodeData: p.barcodeData, displayText: p.barcodeData,
            symbology: template.symbology || 'code128', businessName: bizName,
            templateName: template.name, displayValue: true,
            batchNumber: template.batchId || p.batchNumber || '', quantity: qtyPerBale,
            sku: p.sku, itemName: p.itemName,
            customData: { productName: p.name, description: p.description, price: String(p.sellingPrice), size: p.size, color: p.color, itemCount: p.itemCount },
            width: template.width || 200, height: template.height || 100,
          })
        }
      } else if (productData) {
        // Individual product path
        allLabels = generateBarcodeLabel({
          barcodeData: productData.barcodeData, displayText: productData.barcodeData,
          symbology: template.symbology || 'code128', businessName: bizName,
          templateName: template.name, displayValue: true,
          batchNumber: template.batchId || productData.batchNumber || '', quantity: qtyPerBale,
          sku: productData.sku, itemName: productData.itemName,
          customData: { productName: productData.name, description: productData.description, price: String(productData.sellingPrice), size: productData.size, color: productData.color, itemCount: productData.itemCount },
          width: template.width || 200, height: template.height || 100,
        })
      } else {
        // Bale path (existing)
        const selected = bales.filter(b => selectedIds.has(b.id))
        for (const bale of selected) {
          allLabels += generateBarcodeLabel({
            barcodeData: bale.scanCode, displayText: bale.scanCode,
            symbology: template.symbology || 'code128', businessName: bizName,
            templateName: template.name, displayValue: true,
            batchNumber: template.batchId || '', quantity: qtyPerBale,
            customData: { productName: bale.category.name, description: 'Batch: ' + bale.batchNumber, price: String(bale.unitPrice), itemCount: bale.itemCount },
            width: template.width || 200, height: template.height || 100,
          })
        }
      }

      const bytes = new Uint8Array(allLabels.length)
      for (let i = 0; i < allLabels.length; i++) bytes[i] = allLabels.charCodeAt(i) & 0xFF
      const escPosData = btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''))
      const res = await fetch('/api/print/card', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerId: selectedPrinterId, businessId: selectedBusinessId, escPosData }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Print failed (${res.status})`)
      }
      await logPrintHistory(qtyPerBale)
      setReceiptSuccess(true)
      setTimeout(() => setReceiptSuccess(false), 4000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Print failed'
      if (!isRetry && msg.toLowerCase().includes('offline or unreachable')) {
        setReceiptError('Printer offline — attempting to reconnect…')
        setIsReceiptPrinting(false)
        try {
          const connRes = await fetch(`/api/printers/${selectedPrinterId}/check-connectivity`, { method: 'POST' })
          if (connRes.ok) {
            const { isOnline } = await connRes.json()
            if (isOnline) {
              loadPrinters(selectedPrinterId)
              setReceiptError(null)
              await handleReceiptPrint(true)
              return
            }
          }
        } catch {}
        setReceiptError('Printer is still offline. Please check the connection.')
        return
      }
      setReceiptError(msg)
    } finally {
      setIsReceiptPrinting(false)
    }
  }

  const canPrint = selectedIds.size > 0
  const compactCanPrint = qtyPerBale > 0 && (!!productData || !!products?.length || selectedIds.size > 0)
  const totalLabels = selectedIds.size * qtyPerBale

  if (!isOpen) return null

  // ── Compact mode: bale + template already known, just ask for quantity ──────
  if (compact) {
    const selectedBale = bales.find(b => b.id === baleId)
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId)
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">🖨️ Print Labels</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">&times;</button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Item summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm space-y-1">
              {products?.length ? (
                <>
                  <p className="font-semibold text-gray-900 dark:text-white">{products.length} product{products.length !== 1 ? 's' : ''} selected</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Labels per product: {qtyPerBale}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Template: {selectedTemplate?.name ?? 'Generic (CODE128)'}</p>
                </>
              ) : productData ? (
                <>
                  <p className="font-semibold text-gray-900 dark:text-white">{productData.name}</p>
                  {productData.sku && <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {productData.sku}</p>}
                  <p className="text-xs text-gray-500 dark:text-gray-400">Price: ${Number(productData.sellingPrice).toFixed(2)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Template: {selectedTemplate?.name ?? 'Generic (CODE128)'}</p>
                </>
              ) : selectedBale ? (
                <>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedBale.category.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Batch {selectedBale.batchNumber} · SKU {selectedBale.sku}</p>
                  {selectedTemplate && <p className="text-xs text-gray-500 dark:text-gray-400">Template: {selectedTemplate.name}</p>}
                </>
              ) : (
                <p className="text-gray-400 text-xs">{balesLoading ? 'Loading…' : 'Item not found'}</p>
              )}
            </div>

            {/* Template selector */}
            {!lockTemplate && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTemplateId}
                    onChange={e => setSelectedTemplateId(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Generic (CODE128)</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.batchId ? ` [${t.batchId}]` : ''}</option>)}
                  </select>
                  <button
                    onClick={() => setShowQuickTemplate(v => !v)}
                    title="Create a quick template"
                    className="px-2 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >＋</button>
                </div>
                {showQuickTemplate && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Quick Template</p>
                    <input
                      type="text" placeholder="Template name (e.g. OZL)"
                      value={quickTplName} onChange={e => setQuickTplName(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <input
                      type="text" placeholder="Batch ID (e.g. OZL)" maxLength={10}
                      value={quickTplBatchId} onChange={e => setQuickTplBatchId(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      onClick={saveQuickTemplate}
                      disabled={!quickTplName.trim() || quickTplSaving}
                      className="w-full py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
                    >{quickTplSaving ? 'Saving…' : 'Create & Use'}</button>
                    {quickTplError && <p className="text-xs text-red-500">{quickTplError}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Labels to print
              </label>
              <input
                type="number"
                min={0}
                max={999}
                value={qtyPerBale === 0 ? '' : qtyPerBale}
                placeholder="0"
                onChange={e => setQtyPerBale(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center"
                autoFocus
              />
            </div>

            {/* Print actions */}
            <button
              onClick={handlePdfPrint}
              disabled={!compactCanPrint || isPdfPrinting}
              className="w-full px-4 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPdfPrinting
                ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Preparing...</>
                : <>🖨️ Print / Save as PDF {qtyPerBale > 0 && `(${qtyPerBale})`}</>}
            </button>

            {printers.length > 0 && (
              <div className="space-y-2">
                {printers.length > 1 && (
                  <select value={selectedPrinterId} onChange={e => handlePrinterChange(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="">Select printer…</option>
                    {printers.map(p => <option key={p.id} value={p.id}>{p.printerName}{p.isOnline === false ? ' (offline)' : ''}</option>)}
                  </select>
                )}
                {printers.length === 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${printers[0].isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                      {printers[0].printerName}
                    </p>
                    {!printers[0].isOnline && (
                      <button
                        onClick={() => handleBringOnline(printers[0].id)}
                        disabled={checkingOnline === printers[0].id}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                      >
                        {checkingOnline === printers[0].id ? 'Checking…' : 'Bring Online'}
                      </button>
                    )}
                  </div>
                )}
                {selectedPrinterId && (() => { const p = printers.find(x => x.id === selectedPrinterId); return p && !p.isOnline && printers.length > 1 ? (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-red-500">Selected printer is offline</p>
                    <button
                      onClick={() => handleBringOnline(selectedPrinterId)}
                      disabled={checkingOnline === selectedPrinterId}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                    >
                      {checkingOnline === selectedPrinterId ? 'Checking…' : 'Bring Online'}
                    </button>
                  </div>
                ) : null })()}
                <button
                  onClick={handleReceiptPrint}
                  disabled={!compactCanPrint || isReceiptPrinting || !selectedPrinterId}
                  className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isReceiptPrinting
                    ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Printing…</>
                    : receiptSuccess ? '✅ Printed!'
                    : <>🧾 Print to Receipt Printer {qtyPerBale > 0 && `(${qtyPerBale})`}</>}
                </button>
                {receiptError && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-red-500">{receiptError}</p>
                    {receiptError.toLowerCase().includes('offline') && selectedPrinterId && (
                      <button
                        onClick={() => handleBringOnline(selectedPrinterId)}
                        disabled={checkingOnline === selectedPrinterId}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 whitespace-nowrap"
                      >
                        {checkingOnline === selectedPrinterId ? 'Checking…' : 'Bring Online'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button onClick={onClose} className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Full mode ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">🖨️ Print Barcodes</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">&times;</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Controls */}
          <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
            {clothingBusinesses.length > 1 && (
              <div className="flex items-center gap-2 min-w-[180px]">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Business</label>
                <select value={selectedBusinessId} onChange={e => setSelectedBusinessId(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  {clothingBusinesses.map(b => <option key={b.businessId} value={b.businessId}>{b.businessName}</option>)}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Labels per bale</label>
              <input type="number" min={1} max={999} value={qtyPerBale}
                onChange={e => setQtyPerBale(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center" />
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Template</label>
              {lockTemplate ? (
                <span className="text-sm text-gray-700 dark:text-gray-300 px-2 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg flex-1">
                  {templates.find(t => t.id === selectedTemplateId)?.name ?? (templatesLoading ? 'Loading…' : '—')}
                </span>
              ) : templatesLoading ? <span className="text-xs text-gray-400">Loading...</span>
                : (
                  <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="">Generic (CODE128)</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
            </div>
          </div>

          {/* Print actions */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Label printer / PDF</p>
              <button onClick={handlePdfPrint} disabled={!canPrint || isPdfPrinting}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isPdfPrinting
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Preparing...</>
                  : <>🖨️ Print / Save as PDF {selectedIds.size > 0 && `(${totalLabels} label${totalLabels !== 1 ? 's' : ''})`}</>}
              </button>
            </div>

            <div className="hidden sm:block w-px bg-gray-200 dark:bg-gray-700" />

            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Receipt printer</p>
              {printersLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Looking for receipt printers…
                </div>
              ) : printers.length === 0 ? (
                <p className="text-xs text-gray-400 py-1">No receipt printers found</p>
              ) : (
                <div className="space-y-2">
                  {printers.length > 1 && (
                    <select value={selectedPrinterId} onChange={e => handlePrinterChange(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <option value="">Select printer…</option>
                      {printers.map(p => <option key={p.id} value={p.id}>{p.printerName}{p.isOnline === false ? ' (offline)' : ''}</option>)}
                    </select>
                  )}
                  {printers.length === 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${printers[0].isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                        {printers[0].printerName}
                      </p>
                      {!printers[0].isOnline && (
                        <button
                          onClick={() => handleBringOnline(printers[0].id)}
                          disabled={checkingOnline === printers[0].id}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                        >
                          {checkingOnline === printers[0].id ? 'Checking…' : 'Bring Online'}
                        </button>
                      )}
                    </div>
                  )}
                  {selectedPrinterId && (() => { const p = printers.find(x => x.id === selectedPrinterId); return p && !p.isOnline && printers.length > 1 ? (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-red-500">Selected printer is offline</p>
                      <button
                        onClick={() => handleBringOnline(selectedPrinterId)}
                        disabled={checkingOnline === selectedPrinterId}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                      >
                        {checkingOnline === selectedPrinterId ? 'Checking…' : 'Bring Online'}
                      </button>
                    </div>
                  ) : null })()}
                  <button onClick={handleReceiptPrint} disabled={!canPrint || isReceiptPrinting || !selectedPrinterId}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isReceiptPrinting
                      ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Printing…</>
                      : receiptSuccess ? '✅ Printed!'
                      : <>🧾 Receipt {selectedIds.size > 0 && `(${totalLabels} label${totalLabels !== 1 ? 's' : ''})`}</>}
                  </button>
                  {receiptError && (
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <p className="text-xs text-red-500">{receiptError}</p>
                      {receiptError.toLowerCase().includes('offline') && selectedPrinterId && (
                        <button
                          onClick={() => handleBringOnline(selectedPrinterId)}
                          disabled={checkingOnline === selectedPrinterId}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 whitespace-nowrap"
                        >
                          {checkingOnline === selectedPrinterId ? 'Checking…' : 'Bring Online'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <input type="text" placeholder="Search by SKU, batch, or category..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400" />

          {/* Bales table */}
          {balesLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              <span className="ml-3 text-gray-500">Loading bales...</span>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll}
                        disabled={filtered.length === 0} className="rounded disabled:opacity-40" title="Select all" />
                    </th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Bale</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">Batch</th>
                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">Price</th>
                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">
                      {bales.length === 0 ? 'No active bales found.' : 'No bales match your search.'}
                    </td></tr>
                  ) : filtered.map(bale => {
                    const isSelected = selectedIds.has(bale.id)
                    return (
                      <tr key={bale.id} onClick={() => toggle(bale.id)}
                        className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors ${isSelected ? 'bg-purple-50 dark:bg-purple-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                        <td className="px-4 py-3 w-10">
                          <input type="checkbox" checked={isSelected} onChange={() => toggle(bale.id)}
                            onClick={e => e.stopPropagation()} className="rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{bale.category.name}</div>
                          <div className="text-xs text-gray-400 font-mono">{bale.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell font-mono text-xs">{bale.batchNumber}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">${Number(bale.unitPrice).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bale.remainingCount < 10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                            {bale.remainingCount}/{bale.itemCount}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedIds.size > 0 ? `${selectedIds.size} bale${selectedIds.size !== 1 ? 's' : ''} · ${totalLabels} label${totalLabels !== 1 ? 's' : ''}` : 'Select bales above'}
          </span>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
