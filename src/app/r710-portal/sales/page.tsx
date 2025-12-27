'use client'

import { useState, useEffect } from 'react'
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
  availableCount: number // Number of AVAILABLE tokens for this config
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
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
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

  const canSell = session?.user ? hasPermission(session.user, 'canSellWifiTokens') : false

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    // Check business type
    if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
      setErrorMessage('R710 WiFi token sales are only available for restaurant and grocery businesses')
      setLoading(false)
      return
    }

    if (!canSell) {
      router.push('/dashboard')
      return
    }

    fetchData()
  }, [currentBusinessId, businessLoading])

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

      // For each config, count available tokens
      const configsWithCounts = await Promise.all(
        activeConfigs.map(async (config: any) => {
          try {
            const tokensResponse = await fetch(
              `/api/r710/tokens?businessId=${currentBusinessId}&tokenConfigId=${config.id}&status=AVAILABLE`
            )
            if (tokensResponse.ok) {
              const tokensData = await tokensResponse.json()
              return {
                ...config,
                availableCount: tokensData.tokens?.length || 0
              }
            }
          } catch (error) {
            console.error(`Error fetching tokens for config ${config.id}:`, error)
          }
          return {
            ...config,
            availableCount: 0
          }
        })
      )

      setTokenConfigs(configsWithCounts)

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
        const printersResponse = await fetch(`/api/printers?businessId=${currentBusinessId}`)
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
    if (config.availableCount === 0) {
      setErrorMessage('No tokens available for this configuration. Please generate tokens first.')
      return
    }

    // Toggle selection: if already selected, deselect it
    if (selectedConfig?.id === config.id) {
      setSelectedConfig(null)
      setCustomPrice('')
    } else {
      setSelectedConfig(config)
      setCustomPrice(config.basePrice.toString())
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
    if (!generatedTokenData || !businessDetails || !printerId) {
      toast.push('Missing printer or business information')
      return
    }

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
          password: generatedTokenData.token.password,
          packageName: generatedTokenData.token.tokenConfig.name,
          durationValue: generatedTokenData.token.tokenConfig.durationValue,
          durationUnit: generatedTokenData.token.tokenConfig.durationUnit,
          expiresAt: expiresAt.toISOString(),
          ssid: generatedTokenData.wlanSsid,
          success: true
        }],
        footerMessage: 'Enjoy your WiFi access!'
      }

      console.log('📄 [R710 Direct Sale] Printing receipt:', receiptData)

      await ReceiptPrintManager.printReceipt(receiptData, (currentBusiness?.businessType as any) || 'restaurant', {
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
    }
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

  if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
    return (
      <ContentLayout title="R710 WiFi Token Sales">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            R710 WiFi token sales are only available for restaurant and grocery businesses.
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
              ⚠️ No printer configured. Receipts cannot be printed. Please configure a printer in Business Settings.
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
                  {/* Customer Copy Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printCustomerCopy}
                      onChange={(e) => setPrintCustomerCopy(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-blue-800 dark:text-blue-200">
                      Print customer copy
                    </span>
                  </label>

                  <button
                    onClick={handlePrintReceipt}
                    disabled={isPrinting || !printerId}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isPrinting || !printerId
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    title={!printerId ? 'No printer configured' : ''}
                  >
                    {isPrinting ? '⏳ Printing...' : '🖨️ Print Receipt'}
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
              <div className="bg-gray-50 dark:bg-gray-800 border rounded-lg p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">No active R710 WiFi packages available.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Please configure token packages in R710 Token Configurations.
                </p>
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
                        : config.availableCount > 0
                        ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 hover:shadow-md'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60 cursor-not-allowed'
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
                      <div className="flex flex-col gap-1">
                        <div className={`flex items-center gap-2 ${config.availableCount > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}`}>
                          <span>{config.availableCount > 0 ? '✓' : '⚠️'}</span>
                          <span>{config.availableCount} token{config.availableCount !== 1 ? 's' : ''} available</span>
                        </div>
                        {config.availableCount < 5 && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation(); // Prevent card selection

                              try {
                                const response = await fetch('/api/r710/tokens', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    businessId: currentBusinessId,
                                    tokenConfigId: config.id,
                                    quantity: 5
                                  })
                                });

                                const result = await response.json();

                                if (response.ok) {
                                  // Optimistic UI update
                                  const tokensCreated = result.tokensCreated || result.tokensGenerated || 5;
                                  setTokenConfigs(prev => prev.map(c => {
                                    if (c.id === config.id) {
                                      return {
                                        ...c,
                                        availableCount: c.availableCount + tokensCreated
                                      };
                                    }
                                    return c;
                                  }));

                                  toast.push(`✅ Successfully created ${tokensCreated} ${config.name} token${tokensCreated !== 1 ? 's' : ''}!`, {
                                    type: 'success',
                                    duration: 5000
                                  });

                                  // Background refresh to confirm quantities
                                  await fetchData();
                                } else {
                                  toast.push(`❌ Failed to create tokens: ${result.error || 'Unknown error'}`, {
                                    type: 'error',
                                    duration: 0  // Require manual dismissal for errors
                                  });
                                }
                              } catch (error) {
                                console.error('Error creating tokens:', error);
                                toast.push('❌ Error creating tokens. Please try again.', {
                                  type: 'error',
                                  duration: 0  // Require manual dismissal for errors
                                });
                              }
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                          >
                            + Request 5 More
                          </button>
                        )}
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
                      {selectedConfig.availableCount} token{selectedConfig.availableCount !== 1 ? 's' : ''} available
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
                            onChange={(e) => setPaymentMethod(e.target.value)}
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
                    onClick={handleCompleteSale}
                    disabled={generatingToken || parseFloat(customPrice) < 0}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      generatingToken || parseFloat(customPrice) < 0
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {generatingToken ? 'Processing Sale...' : 'Complete Sale'}
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
    </ContentLayout>
  )
}
