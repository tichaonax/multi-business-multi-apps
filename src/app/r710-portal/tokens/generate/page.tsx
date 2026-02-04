'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/components/ui/confirm-modal'
import Link from 'next/link'

interface TokenConfig {
  id: string
  name: string
  description: string | null
  durationValue: number
  durationUnit: string
  deviceLimit: number
  basePrice: number
  isActive: boolean
}

export default function GenerateTokensPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <GenerateTokensContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function GenerateTokensContent() {
  const { data: session } = useSession()
  const { currentBusiness } = useBusinessPermissionsContext()
  const router = useRouter()
  const alert = useAlert()

  const [tokenConfigs, setTokenConfigs] = useState<TokenConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Form state
  const [selectedConfigId, setSelectedConfigId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(20)

  useEffect(() => {
    loadTokenConfigs()
  }, [currentBusiness?.businessId])

  const loadTokenConfigs = async () => {
    try {
      setLoading(true)

      if (!currentBusiness?.businessId) {
        setTokenConfigs([])
        return
      }

      const params = new URLSearchParams()
      params.append('businessId', currentBusiness.businessId)

      const response = await fetch(`/api/r710/token-configs?${params.toString()}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const activeConfigs = (data.configs || []).filter((c: TokenConfig) => c.isActive)
        setTokenConfigs(activeConfigs)

        // Auto-select first config
        if (activeConfigs.length > 0 && !selectedConfigId) {
          setSelectedConfigId(activeConfigs[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load token configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedConfigId || !currentBusiness?.businessId) {
      await alert({ title: 'Missing Package', description: 'Please select a token package to continue.' })
      return
    }

    if (quantity < 1 || quantity > 50) {
      await alert({ title: 'Invalid Quantity', description: 'Quantity must be between 1 and 50 tokens.' })
      return
    }

    try {
      setGenerating(true)

      const response = await fetch('/api/r710/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          businessId: currentBusiness.businessId,
          tokenConfigId: selectedConfigId,
          quantity: quantity
        })
      })

      const data = await response.json()

      if (response.ok) {
        await alert({
          title: 'Tokens Generated Successfully!',
          description: `Generated ${data.tokensGenerated} WiFi tokens for ${data.config.name}.`
        })

        // Redirect to token inventory
        router.push('/r710-portal/tokens')
      } else {
        if (response.status === 503) {
          await alert({
            title: 'Device Unreachable',
            description: data.message || 'The R710 device is not currently accessible. Please check the device connection.'
          })
        } else {
          // Log full error details to console for debugging
          if (data.details) {
            console.error('[R710 Token Generation] Error details:', data.details)
          }

          await alert({
            title: 'Generation Failed',
            description: data.error || 'Failed to generate tokens. Please try again.'
          })
        }
      }
    } catch (error) {
      console.error('Failed to generate tokens:', error)
      await alert({ title: 'Error', description: 'Failed to generate tokens. Please try again.' })
    } finally {
      setGenerating(false)
    }
  }

  const formatDuration = (value: number, unit: string) => {
    // unit format is like "hour_Hours", "day_Days", "week_Weeks"
    const unitDisplay = unit.split('_')[1] || unit
    return `${value} ${value === 1 ? unitDisplay.slice(0, -1) : unitDisplay}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const selectedConfig = tokenConfigs.find(c => c.id === selectedConfigId)

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Link href="/r710-portal/tokens" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Generate WiFi Tokens
          </h1>
        </div>
        <p className="mt-1 ml-8 text-sm text-gray-500 dark:text-gray-400">
          Create new WiFi access tokens for {currentBusiness?.businessName || 'your business'}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading packages...</p>
        </div>
      )}

      {/* No Configs State */}
      {!loading && tokenConfigs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Active Token Packages
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You need to create token packages before generating tokens.
          </p>
          <Link
            href="/r710-portal/token-configs"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Go to Token Packages
          </Link>
        </div>
      )}

      {/* Generation Form */}
      {!loading && tokenConfigs.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Package Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Select Token Package
              </h2>

              <div className="space-y-3">
                {tokenConfigs.map((config) => (
                  <div
                    key={config.id}
                    onClick={() => setSelectedConfigId(config.id)}
                    className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedConfigId === config.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedConfigId === config.id
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedConfigId === config.id && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {config.name}
                          </h3>
                        </div>
                        {config.description && (
                          <p className="mt-1 ml-7 text-sm text-gray-600 dark:text-gray-400">
                            {config.description}
                          </p>
                        )}
                        <div className="mt-3 ml-7 flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatDuration(config.durationValue, config.durationUnit)}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                            <span>Max {config.deviceLimit} {config.deviceLimit === 1 ? 'device' : 'devices'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(config.basePrice)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">per token</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quantity Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Choose Quantity
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of tokens to generate (1-50)
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    min="1"
                    max="50"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Maximum 50 tokens per generation batch
                  </p>
                </div>

                {/* Quick Select Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[10, 20, 30, 50].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        quantity === qty
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            {selectedConfig && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
                  Generation Summary
                </h3>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                  <div className="flex justify-between">
                    <span>Package:</span>
                    <span className="font-medium">{selectedConfig.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quantity:</span>
                    <span className="font-medium">{quantity} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration per token:</span>
                    <span className="font-medium">{formatDuration(selectedConfig.durationValue, selectedConfig.durationUnit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price per token:</span>
                    <span className="font-medium">{formatCurrency(selectedConfig.basePrice)}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-blue-300 dark:border-blue-700 flex justify-between text-base">
                    <span className="font-semibold">Total Value:</span>
                    <span className="font-bold">{formatCurrency(selectedConfig.basePrice * quantity)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <Link
                href="/r710-portal/tokens"
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={generating || !selectedConfigId}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  generating || !selectedConfigId
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {generating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  `Generate ${quantity} Token${quantity !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </form>

          {/* Important Notes */}
          <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  Important Notes
                </h4>
                <ul className="mt-2 text-sm text-yellow-800 dark:text-yellow-300 space-y-1 list-disc list-inside">
                  <li>Tokens are generated on the R710 device and stored in the database</li>
                  <li>Generation requires the R710 device to be online and accessible</li>
                  <li>Generated tokens will have status "AVAILABLE" until sold or activated</li>
                  <li>Auto-generation creates tokens when inventory drops below 5</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
