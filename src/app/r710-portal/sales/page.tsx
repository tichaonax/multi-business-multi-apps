'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatCurrency } from '@/lib/format-currency'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'
import type { ReceiptData } from '@/types/printing'
import { useToastContext } from '@/components/ui/toast'
import { useCustomerDisplaySync } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'
import { UnifiedReceiptPreviewModal } from '@/components/receipts/unified-receipt-preview-modal'
import { getEcocashSummary } from '@/lib/ecocash-utils'
import { DateRangeSelector, type DateRange } from '@/components/reports/date-range-selector'

interface R710TokenConfig {
  id: string
  name: string
  description: string | null
  durationValue: number
  durationUnit: string
  deviceLimit: number
  basePrice: number
  isActive: boolean
  displayOrder: number
}

interface GeneratedR710TokenSale {
  token: {
    id: string
    username: string
    password: string
    tokenConfigId: string
    status: string
    createdAt: string
    tokenConfig: {
      name: string
      durationValue: number
      durationUnit: string
      deviceLimit: number
    }
  }
  sale: {
    id: string
    saleAmount: number
    paymentMethod: string
    soldAt: string
    ecocashFeeAmount?: number
    ecocashTransactionCode?: string
  }
  wlanSsid?: string
}

interface CartItem {
  config: R710TokenConfig
  quantity: number
  salePrice: string
}

interface SaleHistoryItem {
  saleId: string
  tokenId: string
  username: string
  password: string
  packageName: string
  durationValue: number
  durationUnit: string
  deviceLimit: number
  ssid: string | null
  saleAmount: number
  paymentMethod: string
  ecocashFeeAmount: number | null
  ecocashTransactionCode: string | null
  soldAt: string
  soldByName: string
  receiptPrinted: boolean
}

interface ExpenseAccount {
  id: string
  accountName: string
  accountNumber: string
  balance: number
}

export default function R710SalesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading, hasPermission } = useBusinessPermissionsContext()
  const toast = useToastContext()

  const [loading, setLoading] = useState(true)
  const [tokenConfigs, setTokenConfigs] = useState<R710TokenConfig[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE' | 'MOBILE_MONEY' | 'ECOCASH'>('CASH')
  const [processing, setProcessing] = useState(false)
  const [processingLabel, setProcessingLabel] = useState('')
  const [generatedTokens, setGeneratedTokens] = useState<GeneratedR710TokenSale[]>([])
  const [expenseAccount, setExpenseAccount] = useState<ExpenseAccount | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [printerId, setPrinterId] = useState<string | null>(null)
  const [businessDetails, setBusinessDetails] = useState<any>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [receiptPreviewData, setReceiptPreviewData] = useState<ReceiptData | null>(null)
  const [ecocashTxCode, setEcocashTxCode] = useState('')
  const [saleHistory, setSaleHistory] = useState<SaleHistoryItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [historyAllTime, setHistoryAllTime] = useState(false)
  const [historyDateRange, setHistoryDateRange] = useState<DateRange>(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return { start, end: now }
  })
  const [reprintingId, setReprintingId] = useState<string | null>(null)
  const [reprintPreviewData, setReprintPreviewData] = useState<ReceiptData | null>(null)
  const [showReprintPreview, setShowReprintPreview] = useState(false)

  const printInFlightRef = useRef(false)

  const [terminalId] = useState(() => {
    if (typeof window === 'undefined') return 'r710-terminal-default'
    const stored = localStorage.getItem('r710-terminal-id')
    if (stored) return stored
    const newId = `r710-terminal-${Date.now()}`
    localStorage.setItem('r710-terminal-id', newId)
    return newId
  })

  const { send: sendToDisplay } = useCustomerDisplaySync({
    businessId: currentBusinessId || '',
    terminalId,
    mode: SyncMode.BROADCAST,
    autoConnect: true,
    onError: (error) => console.error('[R710 Customer Display] Sync error:', error)
  })

  const canSell = hasPermission('canSellWifiTokens')

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return
    if (!['restaurant', 'grocery', 'clothing', 'services'].includes(currentBusiness?.businessType || '')) {
      setLoading(false)
      return
    }
    if (!canSell) { router.push('/dashboard'); return }
    fetchData()
  }, [currentBusinessId, businessLoading])

  useEffect(() => {
    if (!currentBusinessId || !businessDetails || !session?.user) return
    async function sendGreeting() {
      sendToDisplay('SET_ACTIVE_BUSINESS', { subtotal: 0, tax: 0, total: 0 })
      const photoData = await fetch('/api/employees/my-photo').then(r => r.json()).catch(() => ({}))
      sendToDisplay('SET_GREETING', {
        employeeName: session!.user!.name || 'Staff',
        employeePhotoUrl: photoData?.profilePhotoUrl || undefined,
        businessName: businessDetails.name || businessDetails.businessName,
        businessPhone: businessDetails.phone || businessDetails.umbrellaBusinessPhone,
        subtotal: 0, tax: 0, total: 0
      })
      sendToDisplay('SET_PAGE_CONTEXT', { pageContext: 'pos', subtotal: 0, tax: 0, total: 0 })
    }
    sendGreeting()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId, businessDetails, session?.user])

  // Sync cart to customer display
  useEffect(() => {
    const total = cartTotal()
    if (cart.length > 0) {
      sendToDisplay('CART_STATE', {
        items: cart.map(item => ({
          id: item.config.id,
          name: `📶 ${item.config.name}`,
          quantity: item.quantity,
          price: parseFloat(item.salePrice) || 0,
          imageUrl: undefined
        })),
        subtotal: total, tax: 0, total
      })
    } else {
      sendToDisplay('CLEAR_CART', { items: [], subtotal: 0, tax: 0, total: 0 })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart])

  const fetchHistory = async (range?: DateRange, allTime?: boolean) => {
    if (!currentBusinessId) return
    const useRange = range ?? historyDateRange
    const useAllTime = allTime ?? historyAllTime
    try {
      setHistoryLoading(true)
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (useAllTime) {
        params.set('allTime', 'true')
      } else {
        params.set('startDate', useRange.start.toISOString())
        params.set('endDate', useRange.end.toISOString())
      }
      const res = await fetch(`/api/r710/direct-sale-history?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSaleHistory(data.sales || [])
      }
    } catch { /* silently ignore */ }
    finally { setHistoryLoading(false) }
  }

  const fetchData = async () => {
    if (!currentBusinessId) return
    try {
      setLoading(true)
      const [businessRes, configsRes] = await Promise.all([
        fetch(`/api/business/${currentBusinessId}`),
        fetch(`/api/r710/token-configs?businessId=${currentBusinessId}`)
      ])
      if (businessRes.ok) {
        const d = await businessRes.json()
        setBusinessDetails(d.business || d)
      }
      if (!configsRes.ok) throw new Error('Failed to fetch token configurations')
      const configsData = await configsRes.json()

      // Only show configs the business has enabled in their menu
      const menuRes = await fetch(`/api/business/${currentBusinessId}/r710-tokens`)
      const menuConfigIds = new Set<string>()
      if (menuRes.ok) {
        const menuData = await menuRes.json()
        for (const item of (menuData.menuItems || [])) {
          if (item.isActive) menuConfigIds.add(item.tokenConfigId)
        }
      }

      const toMin = (v: number, u: string) => {
        const unit = u.toLowerCase()
        if (unit.includes('week')) return v * 10080
        if (unit.includes('day'))  return v * 1440
        if (unit.includes('hour')) return v * 60
        return v
      }
      const active = (configsData.configs || [])
        .filter((c: R710TokenConfig) => c.isActive && menuConfigIds.has(c.id))
        .sort((a: R710TokenConfig, b: R710TokenConfig) => toMin(a.durationValue, a.durationUnit) - toMin(b.durationValue, b.durationUnit))
      setTokenConfigs(active)

      try {
        const accRes = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`)
        if (accRes.ok) {
          const accData = await accRes.json()
          if (accData.integration?.expenseAccountId) {
            const expRes = await fetch(`/api/expense-accounts/${accData.integration.expenseAccountId}`)
            if (expRes.ok) { const ed = await expRes.json(); setExpenseAccount(ed.account) }
          }
        }
      } catch { /* no expense account */ }

      try {
        const prRes = await fetch(`/api/printers?businessId=${currentBusinessId}&printerType=receipt&isOnline=true`)
        if (prRes.ok) {
          const prData = await prRes.json()
          const def = prData.printers?.find((p: any) => p.isDefault) || prData.printers?.[0]
          if (def) setPrinterId(def.id)
        }
      } catch { /* no printer */ }

      await fetchHistory()
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const cartItem = (configId: string) => cart.find(c => c.config.id === configId)

  const addToCart = (config: R710TokenConfig) => {
    setCart(prev => {
      const existing = prev.find(c => c.config.id === config.id)
      if (existing) return prev.map(c => c.config.id === config.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { config, quantity: 1, salePrice: String(config.basePrice) }]
    })
  }

  const setQty = (configId: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(c => c.config.id !== configId)); return }
    setCart(prev => prev.map(c => c.config.id === configId ? { ...c, quantity: qty } : c))
  }

  const setPrice = (configId: string, price: string) => {
    setCart(prev => prev.map(c => c.config.id === configId ? { ...c, salePrice: price } : c))
  }

  const removeFromCart = (configId: string) => setCart(prev => prev.filter(c => c.config.id !== configId))

  const cartTotal = () => cart.reduce((sum, item) => sum + (parseFloat(item.salePrice) || 0) * item.quantity, 0)

  const cartIsEmpty = cart.length === 0

  // ── Checkout ──────────────────────────────────────────────────────────────

  const handleCompleteSale = async () => {
    if (!currentBusinessId || cartIsEmpty) return

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000)

    try {
      setProcessing(true)
      setErrorMessage(null)
      const results: GeneratedR710TokenSale[] = []

      for (let i = 0; i < cart.length; i++) {
        const item = cart[i]
        for (let q = 0; q < item.quantity; q++) {
          const label = cart.length === 1 && item.quantity === 1
            ? 'Generating token...'
            : `Generating token ${results.length + 1} of ${cart.reduce((s, c) => s + c.quantity, 0)}...`
          setProcessingLabel(label)

          const salePrice = parseFloat(item.salePrice) || 0
          const isEcocash = paymentMethod === 'ECOCASH' && salePrice > 0
          const ecocashSummary = isEcocash ? getEcocashSummary(salePrice, businessDetails) : null
          const body: Record<string, any> = {
            businessId: currentBusinessId,
            tokenConfigId: item.config.id,
            saleAmount: salePrice,
            paymentMethod: salePrice > 0 ? paymentMethod : 'FREE'
          }
          if (isEcocash && ecocashSummary) {
            body.ecocashFeeAmount = ecocashSummary.fee
            body.ecocashTransactionCode = ecocashTxCode || undefined
          }
          const res = await fetch('/api/r710/direct-sale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || data.details || `Failed to generate token for ${item.config.name}`)
          results.push(data)
        }
      }

      clearTimeout(timeoutId)
      setGeneratedTokens(results)
      setCart([])
      setShowPaymentModal(false)
      setAmountReceived('')
      setEcocashTxCode('')
      sendToDisplay('CLEAR_CART', { items: [], subtotal: 0, tax: 0, total: 0 })
      fetchHistory()
      setHistoryOpen(true)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error?.name === 'AbortError') {
        setErrorMessage('Request timed out — the WiFi device may be unreachable. Please try again.')
      } else {
        setErrorMessage(error.message || 'Failed to sell token')
      }
    } finally {
      setProcessing(false)
      setProcessingLabel('')
    }
  }

  const formatDuration = (value: number, unit: string) => {
    const unitDisplay = unit.split('_')[1]?.toLowerCase() || unit.toLowerCase()
    return `${value} ${value === 1 ? unitDisplay.slice(0, -1) : unitDisplay}`
  }

  const calculateExpirationDate = (durationValue: number, durationUnit: string): Date => {
    const expirationDate = new Date()
    const unit = durationUnit.toLowerCase()
    if (unit.includes('hour')) expirationDate.setHours(expirationDate.getHours() + durationValue)
    else if (unit.includes('day')) expirationDate.setDate(expirationDate.getDate() + durationValue)
    else if (unit.includes('week')) expirationDate.setDate(expirationDate.getDate() + durationValue * 7)
    else if (unit.includes('month')) expirationDate.setMonth(expirationDate.getMonth() + durationValue)
    else if (unit.includes('year')) expirationDate.setFullYear(expirationDate.getFullYear() + durationValue)
    return expirationDate
  }

  const buildReceiptData = (): ReceiptData | null => {
    if (generatedTokens.length === 0 || !businessDetails) return null
    const total = generatedTokens.reduce((s, t) => s + Number(t.sale.saleAmount), 0)
    return {
      receiptNumber: {
        globalId: generatedTokens[0].sale.id,
        dailySequence: '001',
        formattedNumber: `R710-${generatedTokens[0].sale.id.substring(0, 8)}`
      },
      businessId: currentBusinessId || '',
      businessType: currentBusiness?.businessType || 'restaurant',
      businessName: businessDetails.name || businessDetails.businessName || 'Business',
      businessAddress: businessDetails.address || businessDetails.umbrellaBusinessAddress || '',
      businessPhone: businessDetails.phone || businessDetails.umbrellaBusinessPhone || '',
      transactionId: generatedTokens[0].sale.id,
      transactionDate: new Date(generatedTokens[0].sale.soldAt),
      salespersonName: session?.user?.name || 'Staff',
      salespersonId: session?.user?.id || '',
      items: generatedTokens.map(t => ({
        name: t.token.tokenConfig.name,
        sku: 'R710-TOKEN',
        quantity: 1,
        unitPrice: Number(t.sale.saleAmount),
        totalPrice: Number(t.sale.saleAmount)
      })),
      subtotal: total, tax: 0, discount: 0, total,
      paymentMethod: generatedTokens[0].sale.paymentMethod,
      amountPaid: total, changeDue: 0,
      ...(generatedTokens[0].sale.ecocashFeeAmount != null ? {
        ecocashFeeAmount: generatedTokens[0].sale.ecocashFeeAmount,
        ecocashTransactionCode: generatedTokens[0].sale.ecocashTransactionCode,
        ecocashBase: total,
      } : {}),
      r710Tokens: generatedTokens.map(t => ({
        username: t.token.username,
        password: t.token.password,
        packageName: t.token.tokenConfig.name,
        durationValue: t.token.tokenConfig.durationValue,
        durationUnit: t.token.tokenConfig.durationUnit,
        deviceLimit: t.token.tokenConfig.deviceLimit,
        expiresAt: calculateExpirationDate(t.token.tokenConfig.durationValue, t.token.tokenConfig.durationUnit).toISOString(),
        ssid: t.wlanSsid,
        success: true
      })),
      footerMessage: 'Enjoy your WiFi access!'
    }
  }

  const buildReprintReceiptData = (item: SaleHistoryItem): ReceiptData => ({
    receiptNumber: {
      globalId: item.saleId,
      dailySequence: '001',
      formattedNumber: `R710-${item.saleId.substring(0, 8)}`
    },
    businessId: currentBusinessId || '',
    businessType: currentBusiness?.businessType || 'restaurant',
    businessName: businessDetails?.name || businessDetails?.businessName || 'Business',
    businessAddress: businessDetails?.address || businessDetails?.umbrellaBusinessAddress || '',
    businessPhone: businessDetails?.phone || businessDetails?.umbrellaBusinessPhone || '',
    transactionId: item.saleId,
    transactionDate: new Date(item.soldAt),
    salespersonName: item.soldByName || 'Staff',
    salespersonId: '',
    items: [{
      name: item.packageName,
      sku: 'R710-TOKEN',
      quantity: 1,
      unitPrice: item.saleAmount,
      totalPrice: item.saleAmount
    }],
    subtotal: item.saleAmount, tax: 0, discount: 0, total: item.saleAmount,
    paymentMethod: item.paymentMethod,
    amountPaid: item.saleAmount, changeDue: 0,
    ...(item.ecocashFeeAmount != null ? {
      ecocashFeeAmount: item.ecocashFeeAmount,
      ecocashTransactionCode: item.ecocashTransactionCode ?? undefined,
      ecocashBase: item.saleAmount,
    } : {}),
    r710Tokens: [{
      username: item.username,
      password: item.password,
      packageName: item.packageName,
      durationValue: item.durationValue,
      durationUnit: item.durationUnit,
      deviceLimit: item.deviceLimit,
      expiresAt: calculateExpirationDate(item.durationValue, item.durationUnit).toISOString(),
      ssid: item.ssid ?? undefined,
      success: true
    }],
    footerMessage: 'Enjoy your WiFi access!'
  })

  const handleReprint = async (item: SaleHistoryItem) => {
    const receiptData = buildReprintReceiptData(item)
    setReprintPreviewData(receiptData)
    setShowReprintPreview(true)
  }

  const handlePrintReceipt = async () => {
    if (printInFlightRef.current || isPrinting) return
    if (!businessDetails || !printerId) { toast.push('Missing printer or business information'); return }
    const receiptData = buildReceiptData()
    if (!receiptData) return
    printInFlightRef.current = true
    try {
      setIsPrinting(true)
      await ReceiptPrintManager.printReceipt(receiptData, (currentBusiness?.businessType || 'restaurant') as any, {
        autoPrint: true, printerId,
        onSuccess: (jobId, receiptType) => toast.push(`${receiptType === 'business' ? 'Business' : 'Customer'} receipt sent to printer`),
        onError: (error) => toast.error(`Error printing receipt: ${error.message}`)
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to print receipt')
    } finally {
      setIsPrinting(false)
      setTimeout(() => { printInFlightRef.current = false }, 1000)
    }
  }

  const handleShowReceiptPreview = () => {
    const receiptData = buildReceiptData()
    if (receiptData) { setReceiptPreviewData(receiptData); setShowReceiptPreview(true) }
    else toast.push('No receipt data to preview')
  }

  const handlePrintFromPreview = async (options: { printerId?: string; copies: number; printCustomerCopy: boolean }) => {
    const receiptData = buildReceiptData()
    if (!receiptData) throw new Error('No receipt data')
    await ReceiptPrintManager.printReceipt(receiptData, (currentBusiness?.businessType || 'restaurant') as any, {
      autoPrint: true, printerId: options.printerId, printCustomerCopy: options.printCustomerCopy, copies: options.copies,
      onError: (error) => { throw error }
    })
  }

  if (businessLoading || loading) {
    return (
      <ContentLayout title="R710 WiFi Token Sales">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  if (!['restaurant', 'grocery', 'clothing', 'services'].includes(currentBusiness?.businessType || '')) {
    return (
      <ContentLayout title="R710 WiFi Token Sales">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">R710 WiFi token sales are only available for restaurant, grocery, clothing, and services businesses.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!canSell) {
    return (
      <ContentLayout title="R710 WiFi Token Sales">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">You do not have permission to sell R710 WiFi tokens.</p>
        </div>
      </ContentLayout>
    )
  }

  const total = cartTotal()

  return (
    <ContentLayout title="R710 WiFi Token Sales" subtitle="Sell R710 WiFi access tokens to customers">
      <div className="max-w-6xl mx-auto">
        {/* Nav */}
        <div className="mb-6">
          <Link href="/r710-portal" className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">
            <span className="mr-2">←</span><span>Back to R710 Portal</span>
          </Link>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
          </div>
        )}

        {!printerId && (
          <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
            <p className="text-yellow-800 dark:text-yellow-200">
              ⚠️ No printer configured.{' '}
              {hasPermission('canManageNetworkPrinters')
                ? <Link href="/admin/printers" className="underline font-medium">Configure Printer →</Link>
                : 'Please ask an administrator to configure a printer.'}
            </p>
          </div>
        )}

        {/* Generated Tokens Result */}
        {generatedTokens.length > 0 && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-700 rounded-lg p-5">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                ✅ {generatedTokens.length} token{generatedTokens.length > 1 ? 's' : ''} sold!
              </h3>
              <div className="flex gap-2">
                <button onClick={handleShowReceiptPreview} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  👁️ Preview
                </button>
                <button onClick={handlePrintReceipt} disabled={isPrinting || !printerId} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isPrinting ? '⏳...' : '🖨️ Print'}
                </button>
                <button onClick={() => setGeneratedTokens([])} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300">
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {generatedTokens.map((t, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Package</span>
                    <p className="font-semibold text-gray-900 dark:text-white">{t.token.tokenConfig.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Username</span>
                    <code className="block font-mono font-bold text-blue-700 dark:text-blue-300">{t.token.username}</code>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Password</span>
                    <code className="block font-mono font-bold text-blue-700 dark:text-blue-300">{t.token.password}</code>
                  </div>
                  {t.wlanSsid && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Network</span>
                      <p className="font-medium text-gray-900 dark:text-white">{t.wlanSsid}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Package Cards */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Select R710 WiFi Package</h2>

            {tokenConfigs.length === 0 ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Token Packages Yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Create token packages before selling R710 WiFi tokens.</p>
                <Link href="/r710-portal/token-configs" className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                  <span className="mr-2">🎫</span><span>Create Token Packages</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tokenConfigs.map((config) => {
                  const item = cartItem(config.id)
                  return (
                    <div key={config.id} className={`border-2 rounded-lg p-4 transition-all bg-white dark:bg-gray-800 ${item ? 'border-blue-500 dark:border-blue-500' : 'border-gray-200 dark:border-gray-700'}`}>
                      {/* Card header */}
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{config.name}</h3>
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(Number(config.basePrice))}</div>
                          <div className="text-[10px] text-gray-400">base price</div>
                        </div>
                      </div>

                      {config.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{config.description}</p>
                      )}

                      <div className="flex gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
                        <span>⏱ {formatDuration(config.durationValue, config.durationUnit)}</span>
                        <span>📱 {config.deviceLimit} device{config.deviceLimit > 1 ? 's' : ''}</span>
                      </div>

                      {/* Cart controls */}
                      {item ? (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => setQty(config.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
                          >−</button>
                          <span className="w-6 text-center font-semibold text-gray-900 dark:text-white text-sm">{item.quantity}</span>
                          <button
                            onClick={() => setQty(config.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center"
                          >+</button>
                          <span className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-400">In cart</span>
                          <button onClick={() => removeFromCart(config.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(config)}
                          className="w-full py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          + Add to Cart
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cart Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 border rounded-lg p-5 sticky top-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🛒 Cart
                {!cartIsEmpty && (
                  <span className="ml-auto text-xs font-normal text-gray-500 dark:text-gray-400 cursor-pointer hover:text-red-500" onClick={() => setCart([])}>
                    Clear all
                  </span>
                )}
              </h2>

              {cartIsEmpty ? (
                <div className="text-center text-gray-400 py-10 text-sm">
                  <p className="text-2xl mb-2">📡</p>
                  <p>Add packages to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Line items */}
                  {cart.map(item => (
                    <div key={item.config.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{item.config.name}</div>
                        <button onClick={() => removeFromCart(item.config.id)} className="text-gray-300 hover:text-red-500 text-xs ml-1">✕</button>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Qty */}
                        <div className="flex items-center gap-1">
                          <button onClick={() => setQty(item.config.id, item.quantity - 1)} className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 text-xs flex items-center justify-center">−</button>
                          <span className="w-6 text-center text-sm font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
                          <button onClick={() => setQty(item.config.id, item.quantity + 1)} className="w-6 h-6 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 text-xs flex items-center justify-center">+</button>
                        </div>
                        {/* Price per unit */}
                        <span className="text-xs text-gray-400">×</span>
                        <div className="flex items-center gap-0.5 flex-1">
                          <span className="text-xs text-gray-500">$</span>
                          <input
                            type="number"
                            value={item.salePrice}
                            onChange={e => setPrice(item.config.id, e.target.value)}
                            min="0" step="0.01"
                            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        {/* Line total */}
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                          = {formatCurrency((parseFloat(item.salePrice) || 0) * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Subtotal */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Total</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(total)}</span>
                  </div>

                  {/* Payment method */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Payment Method{total > 0 ? ' *' : ''}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['CASH', 'CARD', 'MOBILE_MONEY', 'ECOCASH'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          disabled={total <= 0}
                          className={`py-1.5 text-xs rounded-lg font-medium transition-colors ${paymentMethod === m && total > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'} disabled:opacity-40`}
                        >
                          {m === 'CASH' ? '💵 Cash' : m === 'CARD' ? '💳 Card' : m === 'MOBILE_MONEY' ? '📱 Mobile' : '📲 EcoCash'}
                        </button>
                      ))}
                    </div>
                    {total <= 0 && <p className="text-[10px] text-gray-400 mt-1">No payment required for free tokens</p>}
                    {paymentMethod === 'ECOCASH' && total > 0 && (() => {
                      const { fee, total: ecoTotal, feeLabel } = getEcocashSummary(total, businessDetails)
                      return (
                        <div className="mt-1.5 bg-orange-50 dark:bg-orange-900/20 rounded p-2 text-xs">
                          <div className="flex justify-between text-orange-700 dark:text-orange-300">
                            <span>EcoCash fee ({feeLabel})</span>
                            <span>+${fee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-orange-800 dark:text-orange-200">
                            <span>Customer pays</span>
                            <span>${ecoTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {expenseAccount && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 text-xs">
                      <div className="text-green-700 dark:text-green-300 font-medium">{expenseAccount.accountName}</div>
                      <div className="text-green-600 dark:text-green-400">Balance: {formatCurrency(Number(expenseAccount.balance))}</div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={cartIsEmpty}
                    className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Proceed to Payment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sales History */}
        <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setHistoryOpen(p => !p)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750"
          >
            <span className="font-semibold text-gray-900 dark:text-white text-sm">
              🕐 Sales History
              {!historyLoading && (
                <span className="ml-2 text-xs font-normal bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  {saleHistory.length} token{saleHistory.length !== 1 ? 's' : ''}
                </span>
              )}
              {historyLoading && (
                <span className="ml-2 inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin align-middle" />
              )}
            </span>
            <span className="text-gray-400 text-xs">{historyOpen ? '▲ hide' : '▼ show'}</span>
          </button>

          {historyOpen && (
            <div className="border-t border-gray-100 dark:border-gray-700">
              {/* Filters */}
              <div className="px-5 pt-4 pb-2 space-y-3">
                {/* Date range selector — no wrapper card, inline */}
                <DateRangeSelector
                  value={historyDateRange}
                  onChange={(range) => {
                    setHistoryDateRange(range)
                    fetchHistory(range, false)
                  }}
                  showAllTime
                  allTime={historyAllTime}
                  onAllTimeChange={(at) => {
                    setHistoryAllTime(at)
                    fetchHistory(historyDateRange, at)
                  }}
                />
                {/* Search */}
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search by package, username or password…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Results */}
              {(() => {
                const q = historySearch.toLowerCase().trim()
                const filtered = q
                  ? saleHistory.filter(i =>
                      i.packageName.toLowerCase().includes(q) ||
                      i.username.toLowerCase().includes(q) ||
                      i.password.toLowerCase().includes(q) ||
                      (i.ssid ?? '').toLowerCase().includes(q) ||
                      i.paymentMethod.toLowerCase().includes(q)
                    )
                  : saleHistory

                if (historyLoading) {
                  return (
                    <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
                  )
                }
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      {q ? 'No results match your search.' : 'No sales found for this period.'}
                    </div>
                  )
                }
                return (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filtered.map(item => (
                      <div key={item.saleId} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-750/50">
                        <div className="min-w-[120px]">
                          <p className="font-medium text-gray-900 dark:text-white leading-tight">{item.packageName}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(item.soldAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            {' '}
                            {new Date(item.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' · '}{item.paymentMethod}
                            {item.saleAmount > 0 ? ` · ${formatCurrency(item.saleAmount)}` : ' · FREE'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 leading-none mb-0.5">Username</p>
                          <code className="font-mono font-bold text-blue-700 dark:text-blue-300 text-xs">{item.username}</code>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 leading-none mb-0.5">Password</p>
                          <code className="font-mono font-bold text-blue-700 dark:text-blue-300 text-xs">{item.password}</code>
                        </div>
                        {item.ssid && (
                          <div>
                            <p className="text-[10px] text-gray-400 leading-none mb-0.5">Network</p>
                            <p className="text-xs text-gray-700 dark:text-gray-300">{item.ssid}</p>
                          </div>
                        )}
                        <div className="ml-auto shrink-0">
                          <p className="text-[10px] text-gray-400 leading-none mb-0.5">Sold by</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{item.soldByName}</p>
                        </div>
                        <button
                          onClick={() => handleReprint(item)}
                          disabled={reprintingId === item.saleId}
                          className="shrink-0 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
                        >
                          {reprintingId === item.saleId ? '⏳' : '🖨️ Reprint'}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">💳 Confirm Payment</h2>

            <div className="space-y-3 mb-4">
              {cart.map(item => (
                <div key={item.config.id} className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{item.config.name} × {item.quantity}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency((parseFloat(item.salePrice) || 0) * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-blue-600 dark:text-blue-400 text-lg">{formatCurrency(total)}</span>
              </div>
            </div>

            {total > 0 && paymentMethod === 'CASH' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Received</label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value)}
                  step="0.01" min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                  placeholder="Enter amount received"
                  autoFocus
                />
                {amountReceived && parseFloat(amountReceived) >= total && (
                  <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded text-green-800 dark:text-green-200 font-medium text-sm">
                    Change: {formatCurrency(parseFloat(amountReceived) - total)}
                  </div>
                )}
                {amountReceived && parseFloat(amountReceived) < total && (
                  <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-red-800 dark:text-red-200 text-xs">
                    ⚠️ Amount received is less than total
                  </div>
                )}
              </div>
            )}

            {total > 0 && paymentMethod === 'ECOCASH' && (() => {
              const { fee, total: ecoTotal, feeLabel } = getEcocashSummary(total, businessDetails)
              return (
                <div className="mb-4 space-y-2">
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-orange-700 dark:text-orange-300">
                      <span>Base amount</span><span>{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-orange-700 dark:text-orange-300">
                      <span>EcoCash fee ({feeLabel})</span><span>+{formatCurrency(fee)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-orange-900 dark:text-orange-100 border-t border-orange-200 dark:border-orange-700 pt-1 mt-1">
                      <span>Customer pays</span><span>{formatCurrency(ecoTotal)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">EcoCash Transaction Code (optional)</label>
                    <input
                      type="text"
                      value={ecocashTxCode}
                      onChange={e => setEcocashTxCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-sm font-mono uppercase"
                      placeholder="e.g. ABC123456"
                      autoFocus
                    />
                  </div>
                </div>
              )
            })()}

            {processing && (
              <div className="mb-4 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full shrink-0"></div>
                <span className="text-sm text-blue-700 dark:text-blue-300">{processingLabel || 'Generating tokens...'}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPaymentModal(false); setAmountReceived('') }}
                disabled={processing}
                className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSale}
                disabled={processing || (total > 0 && paymentMethod === 'CASH' && (!amountReceived || parseFloat(amountReceived) < total))}
                className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? processingLabel || 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      <UnifiedReceiptPreviewModal
        isOpen={showReceiptPreview}
        onClose={() => setShowReceiptPreview(false)}
        receiptData={receiptPreviewData}
        businessType={(currentBusiness?.businessType || 'restaurant') as any}
        onPrintConfirm={handlePrintFromPreview}
      />

      <UnifiedReceiptPreviewModal
        isOpen={showReprintPreview}
        onClose={() => { setShowReprintPreview(false); setReprintPreviewData(null); setReprintingId(null) }}
        receiptData={reprintPreviewData}
        businessType={(currentBusiness?.businessType || 'restaurant') as any}
        onPrintConfirm={async (options) => {
          if (!reprintPreviewData) throw new Error('No receipt data')
          await ReceiptPrintManager.printReceipt(reprintPreviewData, (currentBusiness?.businessType || 'restaurant') as any, {
            autoPrint: true, printerId: options.printerId, printCustomerCopy: options.printCustomerCopy, copies: options.copies,
            onError: (error) => { throw error }
          })
        }}
      />
    </ContentLayout>
  )
}
