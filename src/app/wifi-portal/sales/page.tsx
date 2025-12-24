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
import { formatDataAmount, formatDuration } from '@/lib/printing/format-utils'
import { TokenReceipt } from '@/components/wifi-portal/token-receipt'

interface TokenConfig {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  bandwidthDownMb: number
  bandwidthUpMb: number
  basePrice: number
  isActive: boolean
  displayOrder: number
}

interface WifiToken {
  id: string
  businessId: string
  tokenConfigId: string
  token: string
  status: string
  expiresAt: string
  createdAt: string
  tokenConfig: {
    name: string
    durationMinutes: number
    bandwidthDownMb: number
    bandwidthUpMb: number
  }
}

interface GeneratedTokenWithSale {
  token: WifiToken
  sale: {
    id: string
    saleAmount: number
    paymentMethod: string
    soldAt: string
  }
  ap_ssid?: string
}

interface ExpenseAccount {
  id: string
  accountName: string
  accountNumber: string
  balance: number
}

export default function WiFiTokenSalesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading } = useBusinessPermissionsContext()
  const confirm = useConfirm()

  const [loading, setLoading] = useState(true)
  const [tokenConfigs, setTokenConfigs] = useState<TokenConfig[]>([])
  const [selectedConfig, setSelectedConfig] = useState<TokenConfig | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
  const [customPrice, setCustomPrice] = useState<string>('')
  const [generatingToken, setGeneratingToken] = useState(false)
  const [generatedTokenData, setGeneratedTokenData] = useState<GeneratedTokenWithSale | null>(null)
  const [expenseAccount, setExpenseAccount] = useState<ExpenseAccount | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const canSell = session?.user ? hasPermission(session.user, 'canSellWifiTokens') : false

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    // Check business type
    if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
      setErrorMessage('WiFi token sales are only available for restaurant and grocery businesses')
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
      setErrorMessage(null)

      // Fetch token configs and integration
      const [configsRes, integrationRes] = await Promise.all([
        fetch('/api/wifi-portal/token-configs'),
        fetch(`/api/wifi-portal/integration?businessId=${currentBusinessId}`)
      ])

      if (configsRes.ok) {
        const configsData = await configsRes.json()
        setTokenConfigs(configsData.tokenConfigs.filter((c: TokenConfig) => c.isActive))
      }

      if (integrationRes.ok) {
        const integrationData = await integrationRes.json()
        if (integrationData.integration?.expenseAccount) {
          setExpenseAccount(integrationData.integration.expenseAccount)
        }
      } else if (integrationRes.status === 404) {
        setErrorMessage('Please setup WiFi portal integration first')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setErrorMessage('Failed to load WiFi token packages')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPackage = (config: TokenConfig) => {
    setSelectedConfig(config)
    setCustomPrice(config.basePrice.toString())
    setGeneratedTokenData(null)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const handleGenerateToken = async () => {
    if (!selectedConfig || !currentBusinessId || !expenseAccount) return

    const saleAmount = parseFloat(customPrice)
    if (isNaN(saleAmount)) {
      setErrorMessage('Please enter a valid price')
      return
    }

    // For paid tokens, require payment method selection
    if (saleAmount > 0 && !paymentMethod) {
      setErrorMessage('Please select a payment method')
      return
    }

    const confirmed = await confirm({
      title: 'Generate WiFi Token',
      description: `Generate ${selectedConfig.name} token${saleAmount > 0 ? ` for ${formatCurrency(saleAmount)}` : ' (Free)'}?`,
      confirmText: 'Generate',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setGeneratingToken(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch('/api/wifi-portal/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          tokenConfigId: selectedConfig.id,
          recordSale: true,
          saleAmount: saleAmount,
          paymentMethod: saleAmount > 0 ? paymentMethod : null,
          expenseAccountId: expenseAccount.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setGeneratedTokenData({
          token: data.token,
          sale: data.sale,
          ap_ssid: data.portalResponse?.ap_ssid
        })
        setSuccessMessage(`Token generated successfully! Token: ${data.token.token}`)
        setSelectedConfig(null)
        setCustomPrice('')
      } else {
        setErrorMessage(data.error || data.details || 'Failed to generate token')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to generate token')
    } finally {
      setGeneratingToken(false)
    }
  }

  const handlePrintReceipt = () => {
    // This will be implemented in Task 5.2
    window.print()
  }

  if (businessLoading || loading) {
    return (
      <ContentLayout title="WiFi Token Sales">
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
      <ContentLayout title="WiFi Token Sales">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            WiFi token sales are only available for restaurant and grocery businesses.
          </p>
        </div>
      </ContentLayout>
    )
  }

  if (!canSell) {
    return (
      <ContentLayout title="WiFi Token Sales">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            You do not have permission to sell WiFi tokens.
          </p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="WiFi Token Sales"
      subtitle="Generate and sell WiFi access tokens to customers"
    >
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-receipt, .print-receipt * {
            visibility: visible;
          }
          .print-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
          }
        }
      `}</style>
      <div className="max-w-6xl mx-auto">
        {/* Navigation Link */}
        <div className="mb-6">
          <Link
            href="/wifi-portal"
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <span className="mr-2">←</span>
            <span>Back to WiFi Portal</span>
          </Link>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Generated Token Display */}
        {generatedTokenData && (
          <>
            <div className="mb-6 bg-blue-50 border-2 border-blue-500 rounded-lg p-6 no-print">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-blue-900 mb-4">✅ Token Generated!</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-700">Token:</span>
                      <code className="px-3 py-1 bg-white border border-blue-300 rounded text-lg font-mono text-blue-900">
                        {generatedTokenData.token.token}
                      </code>
                    </div>
                    <div className="text-sm text-blue-800">
                      <strong>Package:</strong> {generatedTokenData.token.tokenConfig.name}
                    </div>
                    <div className="text-sm text-blue-800">
                      <strong>Duration:</strong> {formatDuration(generatedTokenData.token.tokenConfig.durationMinutes)}
                    </div>
                    <div className="text-sm text-blue-800">
                      <strong>Expires:</strong> {new Date(generatedTokenData.token.expiresAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handlePrintReceipt}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  🖨️ Print Receipt
                </button>
              </div>
            </div>

            {/* Receipt for Printing */}
            <div className="hidden print:block print-receipt">
              <TokenReceipt
                token={generatedTokenData.token}
                business={{
                  name: currentBusiness?.businessName || '',
                  type: currentBusiness?.businessType || ''
                }}
                sale={generatedTokenData.sale}
                ap_ssid={generatedTokenData.ap_ssid}
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Token Packages */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Select WiFi Package</h2>

            {tokenConfigs.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 border rounded-lg p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">No active WiFi packages available.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Please configure token packages in Token Configurations.
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
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{config.name}</h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(config.basePrice)}
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
                        <span>{formatDuration(config.durationMinutes)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📥</span>
                        <span>{formatDataAmount(config.bandwidthDownMb)} download</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📤</span>
                        <span>{formatDataAmount(config.bandwidthUpMb)} upload</span>
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
                      {formatDuration(selectedConfig.durationMinutes)}
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
                      Base price: {formatCurrency(selectedConfig.basePrice)}
                    </p>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method{parseFloat(customPrice) > 0 ? ' *' : ''}
                    </label>
                    <div className="space-y-2">
                      {['CASH', 'CARD', 'MOBILE'].map((method) => (
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
                          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                            {method.toLowerCase()}
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
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                        Current Balance: {formatCurrency(expenseAccount.balance)}
                      </div>
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateToken}
                    disabled={generatingToken || !selectedConfig}
                    className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingToken ? 'Generating...' : '🎫 Generate Token'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-2">📦</div>
                  <p>Select a package to continue</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ContentLayout>
  )
}
