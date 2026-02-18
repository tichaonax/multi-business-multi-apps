'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SupplierEditor } from '@/components/suppliers/supplier-editor'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { ContentLayout } from '@/components/layout/content-layout'

// Helper to check if a string is a valid emoji character (not text)
function isValidEmoji(str: string | null | undefined): boolean {
  if (!str || str.trim().length === 0) return false;
  // Check if the string contains actual emoji characters
  const emojiRegex = /[\p{Emoji}\p{Emoji_Presentation}]/u;
  return emojiRegex.test(str);
}

interface Supplier {
  id: string
  businessId: string
  supplierNumber: string
  name: string
  emoji?: string | null
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  taxId?: string | null
  address?: string | null
  paymentTerms?: string | null
  creditLimit?: number | null
  accountBalance: number
  notes?: string | null
  isActive: boolean
  productCount: number
  createdAt: string
  updatedAt: string
}

export default function SuppliersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading, hasPermission } = useBusinessPermissionsContext()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canView = hasPermission('canViewSuppliers')
  const canCreate = hasPermission('canCreateSuppliers')
  const canEdit = hasPermission('canEditSuppliers')
  const canDelete = hasPermission('canDeleteSuppliers')

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    if (!canView) {
      router.push('/dashboard')
      return
    }

    fetchSuppliers()
  }, [currentBusinessId, searchQuery, showActiveOnly, businessLoading])

  const fetchSuppliers = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (showActiveOnly) params.append('isActive', 'true')

      const response = await fetch(`/api/business/${currentBusinessId}/suppliers?${params}`)
      if (!response.ok) throw new Error('Failed to fetch suppliers')

      const data = await response.json()
      setSuppliers(data.suppliers || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedSupplier(null)
    setShowEditor(true)
  }

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowEditor(true)
  }

  const handleDelete = async (supplier: Supplier) => {
    if (!currentBusinessId) return

    try {
      const response = await fetch(`/api/business/${currentBusinessId}/suppliers/${supplier.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.message || 'Failed to delete supplier')
        setDeleteConfirm(null)
        return
      }

      setDeleteConfirm(null)
      fetchSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      setErrorMessage('Failed to delete supplier. Please try again.')
      setDeleteConfirm(null)
    }
  }

  const handleSave = () => {
    setShowEditor(false)
    setSelectedSupplier(null)
    fetchSuppliers()
  }

  if (!session || businessLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentBusinessId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">No business selected. Please select a business from the sidebar.</p>
        </div>
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">You don&apos;t have permission to view suppliers.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ContentLayout
        title="🚚 Suppliers"
        subtitle={`Manage suppliers for ${currentBusiness?.businessName || 'your business'}`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: currentBusiness?.businessName || 'Business', href: `/${currentBusiness?.businessType || 'dashboard'}` },
          { label: 'Suppliers', isActive: true }
        ]}
        headerActions={
          canCreate ? (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Add Supplier
            </button>
          ) : undefined
        }
      >
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              Active only
            </label>
          </div>

          {/* Suppliers Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading suppliers...</p>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">No suppliers found.</p>
              {canCreate && (
                <button
                  onClick={handleCreate}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create your first supplier
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" title={!isValidEmoji(supplier.emoji) && supplier.emoji ? `Invalid emoji: ${supplier.emoji}` : undefined}>
                    {isValidEmoji(supplier.emoji) ? supplier.emoji : '📦'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{supplier.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{supplier.supplierNumber}</p>
                  </div>
                </div>
                {!supplier.isActive && (
                  <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    Inactive
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm mb-4">
                {supplier.contactPerson && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>👤</span>
                    <span>{supplier.contactPerson}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>📧</span>
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>📞</span>
                    <span>{formatPhoneNumberForDisplay(supplier.phone)}</span>
                  </div>
                )}
                {supplier.taxId && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>🏛️</span>
                    <span className="font-mono text-xs">{supplier.taxId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Products:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{supplier.productCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                  <span className={`font-medium ${supplier.accountBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    ${supplier.accountBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="flex-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setDeleteConfirm(supplier.id)}
                    className="flex-1 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === supplier.id && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-800 dark:text-red-200 mb-2">Delete this supplier?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(supplier)}
                      className="flex-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ContentLayout>

      {/* Editor Modal */}
      {showEditor && currentBusinessId && (
        <SupplierEditor
          supplier={selectedSupplier}
          businessId={currentBusinessId}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false)
            setSelectedSupplier(null)
          }}
        />
      )}

      {/* Error Modal */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{errorMessage}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg flex justify-end">
              <button
                onClick={() => setErrorMessage(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
