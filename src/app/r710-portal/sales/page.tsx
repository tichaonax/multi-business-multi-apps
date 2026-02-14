'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { hasPermission } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { useConfirm } from '@/components/ui/confirm-modal'
import { formatCurrency } from '@/lib/format-currency'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'
import type { ReceiptData } from '@/types/printing'
import { useToastContext } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/date-format'
import { useCustomerDisplaySync } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'
import { UnifiedReceiptPreviewModal } from '@/components/receipts/unified-receipt-preview-modal'

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
  }
  wlanSsid?: string
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
  const { currentBusinessId, currentBusiness, loading: businessLoading } = useBusinessPermissionsContext()
  const confirm = useConfirm()
  const toast = useToastContext()

  const [loading, setLoading] = useState(true)
  const [tokenConfigs, setTokenConfigs] = useState<R710TokenConfig[]>([])
  const [selectedConfig, setSelectedConfig] = useState<R710TokenConfig | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE' | 'MOBILE_MONEY'>('CASH')
  const [customPrice, setCustomPrice] = useState<string>('')
  const [generatingToken, setGeneratingToken] = useState(false)
  const [generatedTokenData, setGeneratedTokenData] = useState<GeneratedR710TokenSale | null>(null)
  const [expenseAccount, setExpenseAccount] = useState<ExpenseAccount | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [printerId, setPrinterId] = useState<string | null>(null)
  const [businessDetails, setBusinessDetails] = useState<any>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [printCustomerCopy, setPrintCustomerCopy] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [receiptPreviewData, setReceiptPreviewData] = useState<ReceiptData | null>(null)

  // Ref-based guard to prevent duplicate print calls (state updates are async)
  const printInFlightRef = useRef(false)

  // Terminal ID for customer display
  const [terminalId] = useState(() => {
    if (typeof window === 'undefined') return 'r710-terminal-default'
    const stored = localStorage.getItem('r710-terminal-id')
    if (stored) return stored
    const newId = `r710-terminal-${Date.now()}`
    localStorage.setItem('r710-terminal-id', newId)
    return newId
  })

  // Customer display sync
  const { send: sendToDisplay } = useCustomerDisplaySync({
    businessId: currentBusinessId || '',
    terminalId,
    mode: SyncMode.BROADCAST,
    autoConnect: true,
    onError: (error) => console.error('[R710 Customer Display] Sync error:', error)
  })

  const canSell = session?.user ? hasPermission(session.user, 'canSellWifiTokens') : false

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    // Check business type
    if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery' && currentBusiness?.businessType !== 'clothing' && currentBusiness?.businessType !== 'services') {
      setErrorMessage('R710 WiFi token sales are only available for restaurant, grocery, clothing, and services businesses')
      setLoading(false)
      return
    }

    if (!canSell) {
      router.push('/dashboard')
      return
    }

    fetchData()
  }, [currentBusinessId, businessLoading])

  // Send greeting to customer display when page loads
  useEffect(() => {
    if (currentBusinessId && businessDetails && session?.user) {
      // CRITICAL: Signal which business is active FIRST
      // This allows customer display to work with multiple businesses
      console.log('[R710 Sales] Signaling active business:', currentBusinessId)
      sendToDisplay('SET_ACTIVE_BUSINESS', {
        subtotal: 0,
        tax: 0,
        total: 0
      })

      sendToDisplay('SET_GREETING', {
        employeeName: session.user.name || 'Staff',
        businessName: businessDetails.name || businessDetails.businessName,
        businessPhone: businessDetails.phone || businessDetails.umbrellaBusinessPhone,
        subtotal: 0,
        tax: 0,
        total: 0
      })
      sendToDisplay('SET_PAGE_CONTEXT', {
        pageContext: 'pos',
        subtotal: 0,
        tax: 0,
        total: 0
      })
    }
  }, [currentBusinessId, businessDetails, session?.user])

  // Update customer display when price changes
  useEffect(() => {
    if (selectedConfig && customPrice && currentBusinessId) {
      const price = parseFloat(customPrice) || 0
      const cartItem = {
        id: selectedConfig.id,
        name: `WiFi: ${selectedConfig.name}`,
        quantity: 1,
        price: price,
        imageUrl: undefined
      }

      // CRITICAL: Signal active business, page context, then cart state
      // This ensures customer display shows the correct business even if it opens after POS
      sendToDisplay('SET_ACTIVE_BUSINESS', {
        subtotal: 0,
        tax: 0,
        total: 0
      })

      sendToDisplay('SET_PAGE_CONTEXT', {
        pageContext: 'pos',
        subtotal: price,
        tax: 0,
        total: price
      })

      sendToDisplay('CART_STATE', {
        items: [cartItem],
        subtotal: price,
        tax: 0,
        total: price
      })
    }
  }, [customPrice, selectedConfig, currentBusinessId])

  const fetchData = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)

      // Fetch business details
      const businessResponse = await fetch(`/api/business/${currentBusinessId}`)
      if (businessResponse.ok) {
        const businessData = await businessResponse.json()
        console.log('📄 [R710 Sales] Business data:', businessData)
        setBusinessDetails(businessData.business || businessData)
      }

      // Fetch R710 token configurations for this business
      const configsResponse = await fetch(`/api/r710/token-configs?businessId=${currentBusinessId}`)
      if (!configsResponse.ok) throw new Error('Failed to fetch token configurations')

      const configsData = await configsResponse.json()
      const activeConfigs = configsData.configs || []

      // No need to count tokens - we generate on-the-fly
      setTokenConfigs(activeConfigs)

      // Fetch expense account (optional, for display only)
      try {
        const accountResponse = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`)
        if (accountResponse.ok) {
          const accountData = await accountResponse.json()
          if (accountData.integration?.expenseAccountId) {
            const expenseResponse = await fetch(`/api/expense-accounts/${accountData.integration.expenseAccountId}`)
            if (expenseResponse.ok) {
              const expenseData = await expenseResponse.json()
              setExpenseAccount(expenseData.account)
            }
          }
        }
      } catch (error) {
        console.log('No expense account configured')
      }

      // Fetch default printer
      try {
        const printersResponse = await fetch(`/api/printers?businessId=${currentBusinessId}&printerType=receipt&isOnline=true`)
        if (printersResponse.ok) {
          const printersData = await printersResponse.json()
          const defaultPrinter = printersData.printers?.find((p: any) => p.isDefault)
          if (defaultPrinter) {
            setPrinterId(defaultPrinter.id)
          } else if (printersData.printers?.length > 0) {
            setPrinterId(printersData.printers[0].id)
          }
        }
      } catch (error) {
        console.log('No printer configured')
      }

    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPackage = (config: R710TokenConfig) => {
    // Toggle selection: if already selected, deselect it
    if (selectedConfig?.id === config.id) {
      setSelectedConfig(null)
      setCustomPrice('')
      // Clear customer display
      sendToDisplay('CLEAR_CART', {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0
      })
    } else {
      setSelectedConfig(config)
      setCustomPrice(config.basePrice.toString())
      // Send to customer display
      const cartItem = {
        id: config.id,
        name: `WiFi: ${config.name}`,
        quantity: 1,
        price: Number(config.basePrice),
        imageUrl: undefined
      }
      sendToDisplay('CART_STATE', {
        items: [cartItem],
        subtotal: Number(config.basePrice),
        tax: 0,
        total: Number(config.basePrice)
      })
    }

    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const handleCompleteSale = async () => {
    if (!selectedConfig || !currentBusinessId) return

    const salePrice = parseFloat(customPrice)
    if (isNaN(salePrice) || salePrice < 0) {
      setErrorMessage('Please enter a valid sale price')
      return
    }

    try {
      setGeneratingToken(true)
      setErrorMessage(null)

      const response = await fetch('/api/r710/direct-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          tokenConfigId: selectedConfig.id,
          saleAmount: salePrice,
          paymentMethod: salePrice > 0 ? paymentMethod : 'FREE'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setGeneratedTokenData(data)
        setSuccessMessage(`R710 WiFi token sold successfully!`)
        setSelectedConfig(null)
        setCustomPrice('')
        setShowPaymentModal(false)
        setAmountReceived('')

        // Clear customer display after successful sale
        sendToDisplay('CLEAR_CART', {
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0
        })

        // Refresh configs to update available counts
        await fetchData()
      } else {
        setErrorMessage(data.error || data.details || 'Failed to sell token')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to sell token')
    } finally {
      setGeneratingToken(false)
    }
  }

  const formatDuration = (value: number, unit: string) => {
    const unitDisplay = unit.split('_')[1]?.toLowerCase() || unit.toLowerCase()
    return `${value} ${value === 1 ? unitDisplay.slice(0, -1) : unitDisplay}`
  }

  // Calculate R710 token expiration date based on duration
  const calculateExpirationDate = (durationValue: number, durationUnit: string): Date => {
    const now = new Date()
    const expirationDate = new Date(now)

    // Parse duration unit (format: "duration_Days", "duration_Hours", etc.)
    const unit = durationUnit.toLowerCase()

    if (unit.includes('hour')) {
      expirationDate.setHours(expirationDate.getHours() + durationValue)
    } else if (unit.includes('day')) {
      expirationDate.setDate(expirationDate.getDate() + durationValue)
    } else if (unit.includes('week')) {
      expirationDate.setDate(expirationDate.getDate() + (durationValue * 7))
    } else if (unit.includes('month')) {
      expirationDate.setMonth(expirationDate.getMonth() + durationValue)
    } else if (unit.includes('year')) {
      expirationDate.setFullYear(expirationDate.getFullYear() + durationValue)
    }

    return expirationDate
  }

  // Handle receipt printing with unified thermal system
  const handlePrintReceipt = async () => {
    // Ref-based guard to prevent duplicate print calls (React state updates are async)
    if (printInFlightRef.current) {
      console.log('⚠️ [R710 Sales] Print already in progress (ref guard), ignoring duplicate call')
      toast.push('Print already in progress, please wait...')
      return
    }

    // Also check isPrinting state
    if (isPrinting) {
      console.log('⚠️ [R710 Sales] Print already in progress (state guard), ignoring duplicate call')
      return
    }

    if (!generatedTokenData || !businessDetails || !printerId) {
      toast.push('Missing printer or business information')
      return
    }

    // Set ref guard immediately (synchronous)
    printInFlightRef.current = true
    console.log('🖨️ [R710 Sales] Starting print job at:', new Date().toISOString())
    console.log('🖨️ [R710 Sales] Customer copy checkbox:', printCustomerCopy)

    try {
      setIsPrinting(true)

      // Calculate expiration date
      const expiresAt = calculateExpirationDate(
        generatedTokenData.token.tokenConfig.durationValue,
        generatedTokenData.token.tokenConfig.durationUnit
      )

      // Build receipt data matching restaurant POS format
      const receiptData: ReceiptData = {
        receiptNumber: {
          globalId: generatedTokenData.sale.id,
          dailySequence: '001',
          formattedNumber: `R710-${generatedTokenData.sale.id.substring(0, 8)}`
        },
        businessId: currentBusinessId || '',
        businessType: currentBusiness?.businessType || 'restaurant',
        businessName: businessDetails.name || businessDetails.businessName || 'Business',
        businessAddress: businessDetails.address || businessDetails.umbrellaBusinessAddress || '',
        businessPhone: businessDetails.phone || businessDetails.umbrellaBusinessPhone || '',
        transactionId: generatedTokenData.sale.id,
        transactionDate: new Date(generatedTokenData.sale.soldAt),
        salespersonName: session?.user?.name || 'Staff',
        salespersonId: session?.user?.id || '',
        items: [{
          name: generatedTokenData.token.tokenConfig.name,
          sku: 'R710-TOKEN',
          quantity: 1,
          unitPrice: Number(generatedTokenData.sale.saleAmount),
          totalPrice: Number(generatedTokenData.sale.saleAmount)
        }],
        subtotal: Number(generatedTokenData.sale.saleAmount),
        tax: 0,
        discount: 0,
        total: Number(generatedTokenData.sale.saleAmount),
        paymentMethod: generatedTokenData.sale.paymentMethod,
        amountPaid: Number(generatedTokenData.sale.saleAmount),
        changeDue: 0,
        r710Tokens: [{
          username: generatedTokenData.token.username,
          password: generatedTokenData.token.password,
          packageName: generatedTokenData.token.tokenConfig.name,
          durationValue: generatedTokenData.token.tokenConfig.durationValue,
          durationUnit: generatedTokenData.token.tokenConfig.durationUnit,
          deviceLimit: generatedTokenData.token.tokenConfig.deviceLimit,
          expiresAt: expiresAt.toISOString(),
          ssid: generatedTokenData.wlanSsid,
          success: true
        }],
        footerMessage: 'Enjoy your WiFi access!'
      }

      const businessTypeForPrint = currentBusiness?.businessType || 'restaurant'
      console.log('📄 [R710 Direct Sale] Printing receipt:', {
        businessType: businessTypeForPrint,
        printCustomerCopy: printCustomerCopy,
        printerId: printerId,
        receiptNumber: receiptData.receiptNumber
      })

      await ReceiptPrintManager.printReceipt(receiptData, businessTypeForPrint as any, {
        autoPrint: true,
        printerId: printerId,
        printCustomerCopy: printCustomerCopy,
        onSuccess: (jobId, receiptType) => {
          console.log(`✅ ${receiptType} copy printed:`, jobId)
          toast.push(`${receiptType === 'business' ? 'Business' : 'Customer'} receipt sent to printer`)
        },
        onError: (error, receiptType) => {
          console.error(`❌ Receipt print failed:`, error)
          toast.push(`Error printing receipt: ${error.message}`)
        }
      })

    } catch (error: any) {
      console.error('❌ Print receipt error:', error)
      toast.push(error.message || 'Failed to print receipt')
    } finally {
      setIsPrinting(false)
      // Reset ref guard after a small delay to prevent rapid re-clicks
      setTimeout(() => {
        printInFlightRef.current = false
        console.log('📋 [R710 Sales] Print guard released')
      }, 1000)
    }
  }

  // Build receipt data for preview
  const buildReceiptData = (): ReceiptData | null => {
    if (!generatedTokenData || !businessDetails) return null

    const expiresAt = calculateExpirationDate(
      generatedTokenData.token.tokenConfig.durationValue,
      generatedTokenData.token.tokenConfig.durationUnit
    )

    return {
      receiptNumber: {
        globalId: generatedTokenData.sale.id,
        dailySequence: '001',
        formattedNumber: `R710-${generatedTokenData.sale.id.substring(0, 8)}`
      },
      businessId: currentBusinessId || '',
      businessType: currentBusiness?.businessType || 'restaurant',
      businessName: businessDetails.name || businessDetails.businessName || 'Business',
      businessAddress: businessDetails.address || businessDetails.umbrellaBusinessAddress || '',
      businessPhone: businessDetails.phone || businessDetails.umbrellaBusinessPhone || '',
      transactionId: generatedTokenData.sale.id,
      transactionDate: new Date(generatedTokenData.sale.soldAt),
      salespersonName: session?.user?.name || 'Staff',
      salespersonId: session?.user?.id || '',
      items: [{
        name: generatedTokenData.token.tokenConfig.name,
        sku: 'R710-TOKEN',
        quantity: 1,
        unitPrice: Number(generatedTokenData.sale.saleAmount),
        totalPrice: Number(generatedTokenData.sale.saleAmount)
      }],
      subtotal: Number(generatedTokenData.sale.saleAmount),
      tax: 0,
      discount: 0,
      total: Number(generatedTokenData.sale.saleAmount),
      paymentMethod: generatedTokenData.sale.paymentMethod,
      amountPaid: Number(generatedTokenData.sale.saleAmount),
      changeDue: 0,
      r710Tokens: [{
        username: generatedTokenData.token.username,
        password: generatedTokenData.token.password,
        packageName: generatedTokenData.token.tokenConfig.name,
        durationValue: generatedTokenData.token.tokenConfig.durationValue,
        durationUnit: generatedTokenData.token.tokenConfig.durationUnit,
        deviceLimit: generatedTokenData.token.tokenConfig.deviceLimit,
        expiresAt: expiresAt.toISOString(),
        ssid: generatedTokenData.wlanSsid,
        success: true
      }],
      footerMessage: 'Enjoy your WiFi access!'
    }
  }

  // Show receipt preview modal
  const handleShowReceiptPreview = () => {
    const receiptData = buildReceiptData()
    if (receiptData) {
      setReceiptPreviewData(receiptData)
      setShowReceiptPreview(true)
    } else {
      toast.push('No receipt data to preview')
    }
  }

  // Handle print from preview modal
  const handlePrintFromPreview = async (options: {
    printerId?: string
    copies: number
    printCustomerCopy: boolean
  }) => {
    const receiptData = buildReceiptData()
    if (!receiptData) {
      throw new Error('No receipt data')
    }

    const businessTypeForPrint = currentBusiness?.businessType || 'restaurant'

    await ReceiptPrintManager.printReceipt(receiptData, businessTypeForPrint as any, {
      autoPrint: true,
      printerId: options.printerId,
      printCustomerCopy: options.printCustomerCopy,
      copies: options.copies,
      onSuccess: (jobId, receiptType) => {
        console.log(`✅ ${receiptType} copy printed:`, jobId)
      },
      onError: (error, receiptType) => {
        console.error(`❌ Receipt print failed:`, error)
        throw error
      }
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
          <p className="text-yellow-800">
            R710 WiFi token sales are only available for restaurant, grocery, clothing, and services businesses.
          </p>
        </div>
      </ContentLayout>
    )
  }

  if (!canSell) {
    return (
      <ContentLayout title="R710 WiFi Token Sales">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            You do not have permission to sell R710 WiFi tokens.
          </p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="R710 WiFi Token Sales"
      subtitle="Sell R710 WiFi access tokens to customers"
    >
      <div className="max-w-6xl mx-auto">
        {/* Navigation Link */}
        <div className="mb-6">
          <Link
            href="/r710-portal"
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
          >
            <span className="mr-2">←</span>
            <span>Back to R710 Portal</span>
          </Link>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
        )}

        {/* Printer Warning */}
        {!printerId && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              ⚠️ No printer configured. Receipts cannot be printed.
              {session?.user && hasPermission(session.user, 'canManageNetworkPrinters') ? (
                <Link href="/admin/printers" className="ml-2 underline font-medium hover:text-yellow-900 dark:hover:text-yellow-100">
                  Configure Printer →
                </Link>
              ) : (
                <span className="ml-1">Please ask an administrator to configure a printer.</span>
              )}
            </p>
          </div>
        )}

        {/* Generated Token Display */}
        {generatedTokenData && (
          <>
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-700 rounded-lg p-6 no-print">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-4">✅ R710 WiFi Token Sold!</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Username:</span>
                      <code className="ml-2 px-3 py-1 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded text-lg font-mono text-blue-900 dark:text-blue-100">
                        {generatedTokenData.token.username}
                      </code>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Password:</span>
                      <code className="ml-2 px-3 py-1 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded text-lg font-mono text-blue-900 dark:text-blue-100">
                        {generatedTokenData.token.password}
                      </code>
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Package:</strong> {generatedTokenData.token.tokenConfig.name}
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Duration:</strong> {formatDuration(generatedTokenData.token.tokenConfig.durationValue, generatedTokenData.token.tokenConfig.durationUnit)}
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Device Limit:</strong> {generatedTokenData.token.tokenConfig.deviceLimit} device{generatedTokenData.token.tokenConfig.deviceLimit > 1 ? 's' : ''}
                    </div>
                    {generatedTokenData.wlanSsid && (
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>WiFi Network:</strong> {generatedTokenData.wlanSsid}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {/* Close button */}
                  <button
                    onClick={() => setGeneratedTokenData(null)}
                    className="self-end text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    title="Close"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Preview Receipt Button */}
                  <button
                    onClick={handleShowReceiptPreview}
                    className="px-4 py-2 rounded-lg font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    👁️ Preview Receipt
                  </button>

                  {/* Quick Print Button */}
                  <button
                    onClick={handlePrintReceipt}
                    disabled={isPrinting || !printerId || printInFlightRef.current}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isPrinting || !printerId
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    title={!printerId ? 'No printer configured' : 'Quick print (business + customer copy)'}
                  >
                    {isPrinting ? '⏳ Printing...' : '🖨️ Quick Print'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Token Packages */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Select R710 WiFi Package</h2>

            {tokenConfigs.length === 0 ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Token Packages Yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You need to create token packages before you can sell R710 WiFi tokens.
                </p>
                <Link
                  href="/r710-portal/token-configs"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <span className="mr-2">🎫</span>
                  <span>Create Token Packages</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tokenConfigs.map((config) => (
                  <div
                    key={config.id}
                    onClick={() => handleSelectPackage(config)}
                    className={`cursor-pointer border-2 rounded-lg p-5 transition-all ${
                      selectedConfig?.id === config.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{config.name}</h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(Number(config.basePrice))}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">base price</div>
                      </div>
                    </div>

                    {config.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{config.description}</p>
                    )}

                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <span>⏱️</span>
                        <span>{formatDuration(config.durationValue, config.durationUnit)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📱</span>
                        <span>{config.deviceLimit} device{config.deviceLimit > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {selectedConfig?.id === config.id && (
                      <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-600">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium">
                          <span>✓</span>
                          <span>Selected</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Payment Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 border rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Payment</h2>

              {selectedConfig ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Selected Package</div>
                    <div className="font-bold text-gray-900 dark:text-white">{selectedConfig.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDuration(selectedConfig.durationValue, selectedConfig.durationUnit)}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                      Tokens generated on-demand
                    </div>
                  </div>

                  {/* Sale Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sale Price *
                    </label>
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter price"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Base price: {formatCurrency(Number(selectedConfig.basePrice))}
                    </p>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method{parseFloat(customPrice) > 0 ? ' *' : ''}
                    </label>
                    <div className="space-y-2">
                      {['CASH', 'CARD', 'MOBILE_MONEY'].map((method) => (
                        <label
                          key={method}
                          className={`flex items-center gap-2 ${parseFloat(customPrice) > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method}
                            checked={paymentMethod === method}
                            onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'CARD' | 'MOBILE' | 'MOBILE_MONEY')}
                            disabled={parseFloat(customPrice) <= 0}
                            className="h-4 w-4 text-blue-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {method.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                    {parseFloat(customPrice) <= 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Payment method not required for free tokens
                      </p>
                    )}
                  </div>

                  {/* Expense Account Info */}
                  {expenseAccount && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="text-xs text-green-700 dark:text-green-300 mb-1">Revenue Account</div>
                      <div className="text-sm font-medium text-green-900 dark:text-green-100">
                        {expenseAccount.accountName}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Balance: {formatCurrency(Number(expenseAccount.balance))}
                      </div>
                    </div>
                  )}

                  {/* Complete Sale Button */}
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={generatingToken || parseFloat(customPrice) < 0 || tokenConfigs.length === 0}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      generatingToken || parseFloat(customPrice) < 0 || tokenConfigs.length === 0
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {generatingToken ? 'Processing Sale...' : tokenConfigs.length === 0 ? 'No Packages Available' : 'Proceed to Payment'}
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p className="mb-2">📡</p>
                  <p>Select a package to begin</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-4">💳 Payment</h2>

            <div className="space-y-4">
              {/* Sale Total */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-blue-900 dark:text-blue-100">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">${parseFloat(customPrice || '0').toFixed(2)}</span>
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {selectedConfig.name}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                      paymentMethod === 'CASH'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CARD')}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                      paymentMethod === 'CARD'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    💳 Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod('MOBILE')}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                      paymentMethod === 'MOBILE'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    📱 Mobile
                  </button>
                </div>
              </div>

              {/* Amount Received (for Cash) - only show if total > 0 */}
              {paymentMethod === 'CASH' && parseFloat(customPrice || '0') > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount Received</label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                    placeholder="Enter amount received"
                    autoFocus
                  />
                  {amountReceived && parseFloat(amountReceived) >= parseFloat(customPrice || '0') && (
                    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded text-green-800 dark:text-green-200 font-medium">
                      💵 Change: ${(parseFloat(amountReceived) - parseFloat(customPrice || '0')).toFixed(2)}
                    </div>
                  )}
                  {amountReceived && parseFloat(amountReceived) < parseFloat(customPrice || '0') && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-red-800 dark:text-red-200 text-sm">
                      ⚠️ Amount received is less than total (${parseFloat(customPrice || '0').toFixed(2)})
                    </div>
                  )}
                </div>
              )}

              {/* Free item notice */}
              {paymentMethod === 'CASH' && parseFloat(customPrice || '0') === 0 && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-800 dark:text-green-200">
                  ✅ Free item - no payment required
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setAmountReceived('')
                  }}
                  className="flex-1 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteSale}
                  disabled={generatingToken || (paymentMethod === 'CASH' && parseFloat(customPrice || '0') > 0 && (!amountReceived || parseFloat(amountReceived) < parseFloat(customPrice || '0')))}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingToken ? 'Processing...' : 'Complete Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      <UnifiedReceiptPreviewModal
        isOpen={showReceiptPreview}
        onClose={() => setShowReceiptPreview(false)}
        receiptData={receiptPreviewData}
        businessType={(currentBusiness?.businessType || 'restaurant') as any}
        onPrintConfirm={handlePrintFromPreview}
      />
    </ContentLayout>
  )
}
