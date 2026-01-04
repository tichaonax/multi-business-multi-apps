'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { SessionUser } from '@/lib/permission-utils'
import { EmployeeTransferModal } from './employee-transfer-modal'
import { UserEditModal } from '@/components/user-management/user-edit-modal'

interface EmployeeDetail {
  id: string
  fullName: string
  employeeNumber: string
  primaryBusinessId: string
  primaryBusinessName: string
  isActive: boolean
}

interface MembershipDetail {
  id: string
  userId: string
  userName: string
  userEmail: string
  role: string
  isActive: boolean
}

interface DeletionImpact {
  businessName: string
  businessType: string
  isDemoBusiness: boolean
  relatedRecords: {
    orders: number
    products: number
    categories: number
    suppliers: number
    locations: number
    projects: number
    employees: number
    vehicles: number
    memberships: number
    customers: number
  }
  membershipDetails?: MembershipDetail[]
  employeeDetails?: EmployeeDetail[]
}

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  passwordResetRequired: boolean
  employee?: {
    id: string
    fullName: string
    employeeNumber: string
    employmentStatus: string
  }
  businessMemberships?: Array<{
    businessId: string
    role: string
    permissions: any
    isActive: boolean
    templateId?: string
    template?: {
      id: string
      name: string
    }
    business: {
      id: string
      name: string
      type: string
    }
  }>
}

interface BusinessDeletionModalProps {
  businessId: string
  onClose: () => void
  onSuccess: () => void
  onError: (error: string) => void
}

export function BusinessDeletionModal({
  businessId,
  onClose,
  onSuccess,
  onError
}: BusinessDeletionModalProps) {
  const { data: session } = useSession()
  const [step, setStep] = useState<'loading' | 'confirm' | 'type-name' | 'final' | 'deleting'>('loading')
  const [impact, setImpact] = useState<DeletionImpact | null>(null)
  const [deletionType, setDeletionType] = useState<'soft' | 'hard'>('soft')
  const [typedName, setTypedName] = useState('')
  const [typedConfirmation, setTypedConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0)
  const [hasFetched, setHasFetched] = useState(false)
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(false)

  useEffect(() => {
    // Only fetch once when the modal opens
    if (!hasFetched && businessId) {
      setHasFetched(true)
      fetchDeletionImpact()
    }
  }, [businessId, hasFetched])

  useEffect(() => {
    console.log('[DeletionModal] viewingUser changed:', viewingUser)
    console.log('[DeletionModal] session:', session)
    console.log('[DeletionModal] Should show UserEditModal:', !!(viewingUser && session?.user))
  }, [viewingUser, session])

  const fetchDeletionImpact = async () => {
    try {
      console.log('[DeletionModal] Fetching deletion impact for business:', businessId)
      const response = await fetch(`/api/admin/businesses/${businessId}/deletion-impact`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch deletion impact')
      }
      const data = await response.json()
      console.log('[DeletionModal] Deletion impact data:', {
        businessName: data.businessName,
        employeeDetailsCount: data.employeeDetails?.length || 0,
        employeeDetails: data.employeeDetails
      })
      setImpact(data)
      
      // Count active employees
      const activeCount = data.employeeDetails?.filter((emp: EmployeeDetail) => emp.isActive).length || 0
      console.log('[DeletionModal] Active employee count:', activeCount)
      setActiveEmployeeCount(activeCount)
      
      // Set default deletion type based on whether it's a demo business
      setDeletionType(data.isDemoBusiness ? 'hard' : 'soft')
      setStep('confirm')
    } catch (err) {
      console.error('[DeletionModal] Error fetching deletion impact:', err)
      setError(err instanceof Error ? err.message : 'Failed to load deletion impact')
      setStep('confirm')
    }
  }

  const handleTransferComplete = () => {
    console.log('[DeletionModal] Transfer completed, refreshing deletion impact')
    setShowTransferModal(false)
    // Reset step to loading and refresh the deletion impact to update employee counts
    setStep('loading')
    fetchDeletionImpact()
  }

  const handleViewUser = async (userId: string) => {
    console.log('[DeletionModal] Opening user details for userId:', userId)
    setLoadingUser(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch user details')
      }
      const userData = await response.json()
      console.log('[DeletionModal] User data loaded:', userData)
      setViewingUser(userData)
      console.log('[DeletionModal] viewingUser state set, session available:', !!session?.user)
    } catch (err) {
      console.error('[DeletionModal] Error fetching user details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user details')
    } finally {
      setLoadingUser(false)
    }
  }

  const handleUserModalClose = () => {
    setViewingUser(null)
  }

  const handleUserUpdateSuccess = (message: string) => {
    setViewingUser(null)
    // Refresh deletion impact to show updated membership info
    fetchDeletionImpact()
  }

  const handleUserUpdateError = (errorMsg: string) => {
    setError(errorMsg)
  }

  const handleDelete = async () => {
    if (!impact) return

    setStep('deleting')
    setError(null) // Clear any previous errors
    try {
      const url = deletionType === 'hard'
        ? `/api/admin/businesses/${businessId}?hardDelete=true`
        : `/api/admin/businesses/${businessId}`

      const response = await fetch(url, { method: 'DELETE' })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete business')
      }

      const result = await response.json()
      onSuccess()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete business'
      // Show error in modal instead of closing it
      setError(errorMsg)
      setStep('confirm') // Go back to confirm step so user can see the error and try again
    }
  }

  const canProceedToTypeName = () => {
    if (!impact) return false
    if (deletionType === 'hard' && !impact.isDemoBusiness) return false
    // Block deletion if there are active employees that haven't been transferred
    if (activeEmployeeCount > 0) return false
    return true
  }

  const canProceedToFinal = () => {
    if (!impact) return false
    return typedName.trim() === impact.businessName.trim()
  }

  const canConfirmDeletion = () => {
    if (!impact) return false
    if (deletionType === 'hard') {
      return typedConfirmation === 'DELETE PERMANENTLY'
    }
    return typedConfirmation === 'DEACTIVATE'
  }

  const totalRecords = impact 
    ? Object.values(impact.relatedRecords).reduce((sum, count) => sum + count, 0)
    : 0

  return (
    <>
      {/* User Details Modal */}
      {viewingUser && session?.user && (
        <UserEditModal
          user={viewingUser}
          currentUser={session.user as SessionUser}
          onClose={handleUserModalClose}
          onSuccess={handleUserUpdateSuccess}
          onError={handleUserUpdateError}
        />
      )}

      {/* Employee Transfer Modal */}
      {showTransferModal && impact && (
        <EmployeeTransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          businessId={businessId}
          businessName={impact.businessName}
          businessType={impact.businessType}
          onTransferComplete={handleTransferComplete}
        />
      )}

      {/* Deletion Modal */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          // Only close if clicking the backdrop, not the modal content
          if (e.target === e.currentTarget && step !== 'loading' && step !== 'deleting') {
            onClose()
          }
        }}
      >
        <div 
          className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {deletionType === 'hard' ? '⚠️ Delete Business' : '⚠️ Deactivate Business'}
            </h2>
            <button
              onClick={onClose}
              disabled={step === 'deleting'}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading business details...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">❌</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                    Deactivation Failed
                  </h4>
                  <p className="text-red-800 dark:text-red-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'confirm' && impact && (
            <div className="space-y-6">
              {/* Business Info */}
              <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                  {impact.businessName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Type: <span className="font-medium capitalize">{impact.businessType}</span>
                </p>
                {impact.isDemoBusiness && (
                  <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                    ✓ Demo Business - Safe to delete
                  </div>
                )}
              </div>

              {/* Deletion Type Selection */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Choose Deletion Type:
                </h4>
                
                <label className="flex items-start space-x-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400">
                  <input
                    type="radio"
                    name="deletionType"
                    value="soft"
                    checked={deletionType === 'soft'}
                    onChange={() => setDeletionType('soft')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      Deactivate (Soft Delete) - Recommended
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Business will be marked as inactive but all data is preserved. Can be reactivated later.
                    </div>
                  </div>
                </label>

                <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg ${
                  impact.isDemoBusiness 
                    ? 'border-red-300 dark:border-red-600 cursor-pointer hover:border-red-500 dark:hover:border-red-400'
                    : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                }`}>
                  <input
                    type="radio"
                    name="deletionType"
                    value="hard"
                    checked={deletionType === 'hard'}
                    onChange={() => impact.isDemoBusiness && setDeletionType('hard')}
                    disabled={!impact.isDemoBusiness}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-red-600 dark:text-red-400">
                      Permanent Delete (Hard Delete) {!impact.isDemoBusiness && '- Demo Only'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {impact.isDemoBusiness 
                        ? 'Permanently removes business and ALL related data. Cannot be undone.'
                        : 'Only available for demo businesses. Use deactivation for real businesses.'}
                    </div>
                  </div>
                </label>
              </div>

              {/* Impact Summary */}
              <div className="border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-3">
                  {deletionType === 'hard' ? 'What will be deleted:' : 'Related data (will be preserved):'}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(impact.relatedRecords).map(([key, count]) => (
                    count > 0 && (
                      <div key={key} className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{count}</span> {key}
                      </div>
                    )
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-yellow-300 dark:border-yellow-700 font-semibold text-yellow-800 dark:text-yellow-300">
                  Total: {totalRecords} related records
                </div>
              </div>

              {/* Active Membership Warning - Shows who will be automatically deactivated */}
              {impact.membershipDetails && impact.membershipDetails.length > 0 && (
                <div className="border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <span className="text-2xl">ℹ️</span>
                    {impact.membershipDetails.length} Business Membership{impact.membershipDetails.length !== 1 ? 's' : ''} Will Be Automatically Deactivated
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                    The following user{impact.membershipDetails.length !== 1 ? 's' : ''} will automatically lose access to this business:
                  </p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {impact.membershipDetails.map((membership) => (
                      <button
                        key={membership.id}
                        onClick={() => handleViewUser(membership.userId)}
                        disabled={loadingUser}
                        className="w-full text-left text-sm bg-white dark:bg-neutral-800 rounded p-2 border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{membership.userName}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{membership.userEmail}</p>
                          </div>
                          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {membership.role}
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Click to view details →
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Employee Warning */}
              {activeEmployeeCount > 0 && (
                <div className="border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    Transfer Required: {activeEmployeeCount} Active Employee{activeEmployeeCount !== 1 ? 's' : ''}
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                    You must transfer all active employees to another business before deletion can proceed.
                    This ensures employees maintain their primary business assignment and triggers automatic contract renewals.
                  </p>
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Transfer Employees Now
                  </button>
                </div>
              )}

              {/* Employee Details */}
              {impact.employeeDetails && impact.employeeDetails.length > 0 && (
                <div className="border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
                    Employees with this as Primary Business ({impact.employeeDetails.length}):
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {impact.employeeDetails.map((employee) => (
                      <div key={employee.id} className="text-sm bg-white dark:bg-neutral-800 rounded p-2 border border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{employee.fullName}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Employee #: {employee.employeeNumber}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${
                            employee.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {employee.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Primary Business: {employee.primaryBusinessName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning */}
              {deletionType === 'hard' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-300 font-semibold">
                    ⚠️ This action cannot be undone!
                  </p>
                  <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                    All data will be permanently deleted from the database.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'type-name' && impact && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Step 1: Confirm Business Name
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Type the exact business name to confirm
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Business name:</p>
                <p className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                  {impact.businessName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type business name here:
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:text-white"
                  placeholder="Enter business name..."
                  autoFocus
                />
              </div>

              {typedName && typedName.trim() !== impact.businessName.trim() && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Business name doesn't match. Please type exactly: {impact.businessName}
                </p>
              )}
            </div>
          )}

          {step === 'final' && impact && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🔴</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Step 2: Final Confirmation
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {deletionType === 'hard' 
                    ? 'Type DELETE PERMANENTLY to confirm permanent deletion'
                    : 'Type DEACTIVATE to confirm deactivation'}
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <ul className="space-y-2 text-sm text-red-800 dark:text-red-300">
                  <li>• Business: {impact.businessName}</li>
                  <li>• Type: {deletionType === 'hard' ? 'Permanent Deletion' : 'Deactivation'}</li>
                  {deletionType === 'hard' && (
                    <>
                      <li>• {totalRecords} related records will be deleted</li>
                      <li>• This action CANNOT be undone</li>
                    </>
                  )}
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type {deletionType === 'hard' ? 'DELETE PERMANENTLY' : 'DEACTIVATE'} to confirm:
                </label>
                <input
                  type="text"
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-neutral-700 dark:text-white font-mono"
                  placeholder={deletionType === 'hard' ? 'DELETE PERMANENTLY' : 'DEACTIVATE'}
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 'deleting' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {deletionType === 'hard' ? 'Permanently deleting business...' : 'Deactivating business...'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Please wait, this may take a moment...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'loading' && step !== 'deleting' && impact && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              Cancel
            </button>
            
            {step === 'confirm' && (
              <div className="flex items-center gap-3">
                {activeEmployeeCount > 0 && (
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Transfer {activeEmployeeCount} employee{activeEmployeeCount !== 1 ? 's' : ''} first
                  </span>
                )}
                <button
                  onClick={() => setStep('type-name')}
                  disabled={!canProceedToTypeName()}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={activeEmployeeCount > 0 ? 'Transfer employees before continuing' : ''}
                >
                  Continue
                </button>
              </div>
            )}

            {step === 'type-name' && (
              <button
                onClick={() => setStep('final')}
                disabled={!canProceedToFinal()}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step
              </button>
            )}

            {step === 'final' && (
              <button
                onClick={handleDelete}
                disabled={!canConfirmDeletion()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {deletionType === 'hard' ? 'Delete Permanently' : 'Deactivate Business'}
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    </>
  )
}
