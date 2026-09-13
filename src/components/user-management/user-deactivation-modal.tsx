'use client'

import { useState } from 'react'
import { SessionUser } from '@/lib/permission-utils'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

interface UserDeactivationModalProps {
  user: User
  currentUser: SessionUser
  /** Count of currently active admins across the whole system, including
   * this user if they're an active admin. Used to block deactivating the
   * last one before it's even attempted - the same check is enforced
   * server-side too, this is just so the wizard can stop at step 1 instead
   * of walking through 3 steps toward a guaranteed failure. */
  activeAdminCount?: number
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

const DEACTIVATION_REASONS = [
  'User terminated',
  'Permissions revoked',
  'Security violation',
  'Account suspended',
  'Temporary deactivation',
  'Other'
]

const ADMIN_CONFIRMATION_PHRASE = 'DEACTIVATE ADMIN'

type AdminStep = 'warning' | 'type-email' | 'final'

export function UserDeactivationModal({
  user,
  currentUser,
  activeAdminCount,
  onClose,
  onSuccess,
  onError
}: UserDeactivationModalProps) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Admin-only 3-step wizard state. Regular (non-admin) users keep the
  // original single-step form below, completely unchanged.
  const isDeactivatingAdmin = user.isActive && user.role === 'admin'
  const isLastActiveAdmin = isDeactivatingAdmin && (activeAdminCount ?? 1) <= 1
  const [adminStep, setAdminStep] = useState<AdminStep>('warning')
  const [typedEmail, setTypedEmail] = useState('')
  const [typedPhrase, setTypedPhrase] = useState('')

  const submitDeactivation = async (extra?: { confirmedEmail: string; confirmationPhrase: string }) => {
    if (!reason) {
      onError('Please select a reason for deactivation')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          notes: notes.trim(),
          deactivatedBy: currentUser.id,
          ...extra
        })
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess(`User ${user.name} has been deactivated successfully`)
        onClose()
      } else {
        onError(data.error || 'Failed to deactivate user')
      }
    } catch (error) {
      onError('An error occurred while deactivating the user')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitDeactivation()
  }

  const handleFinalAdminSubmit = async () => {
    await submitDeactivation({ confirmedEmail: typedEmail.trim(), confirmationPhrase: typedPhrase })
  }

  const handleReactivate = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reactivatedBy: currentUser.id,
          notes: notes.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess(`User ${user.name} has been reactivated successfully`)
        onClose()
      } else {
        onError(data.error || 'Failed to reactivate user')
      }
    } catch (error) {
      onError('An error occurred while reactivating the user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="card max-w-md w-full max-h-screen overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">
                {user.isActive ? 'Deactivate User' : 'Reactivate User'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-primary">{user.name}</p>
                  <p className="text-sm text-secondary">{user.email}</p>
                  <p className="text-xs text-secondary">Role: {user.role}</p>
                </div>
              </div>
            </div>

            {isDeactivatingAdmin ? (
              /* Admin deactivation: 3-step wizard (warning -> type email -> type phrase).
                 Not used for any non-admin user, whose flow is the plain
                 single-step form further below, unchanged. */
              <div className="space-y-4">
                {adminStep === 'warning' && (
                  <>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-700 dark:text-red-400">
                        <strong>This is an admin account.</strong> Deactivating it removes system-admin
                        access immediately. All their business memberships will remain but be marked inactive.
                      </p>
                    </div>

                    {isLastActiveAdmin ? (
                      <div className="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg p-3">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          This is the last active admin account — it cannot be deactivated.
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                          Create or reactivate another admin account first.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">
                            Reason for Deactivation <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="input-field"
                            required
                          >
                            <option value="">Select a reason...</option>
                            {DEACTIVATION_REASONS.map((reasonOption) => (
                              <option key={reasonOption} value={reasonOption}>
                                {reasonOption}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">
                            Additional Notes (Optional)
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="input-field"
                            rows={3}
                            placeholder="Add any additional details about the deactivation..."
                          />
                        </div>
                      </>
                    )}

                    <div className="flex space-x-3 pt-4">
                      <button type="button" onClick={onClose} className="btn-secondary flex-1">
                        Cancel
                      </button>
                      {!isLastActiveAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!reason) {
                              onError('Please select a reason for deactivation')
                              return
                            }
                            setAdminStep('type-email')
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex-1"
                        >
                          I understand, continue
                        </button>
                      )}
                    </div>
                  </>
                )}

                {adminStep === 'type-email' && (
                  <>
                    <p className="text-sm text-secondary">
                      Step 1 of 2: type this account&apos;s exact email address to confirm you&apos;re targeting the right one.
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-sm text-primary">
                      {user.email}
                    </div>
                    <input
                      type="text"
                      value={typedEmail}
                      onChange={(e) => setTypedEmail(e.target.value)}
                      className="input-field"
                      placeholder="Type the email address above"
                      autoFocus
                    />
                    <div className="flex space-x-3 pt-2">
                      <button type="button" onClick={onClose} className="btn-secondary flex-1">
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={typedEmail.trim().toLowerCase() !== user.email.toLowerCase()}
                        onClick={() => setAdminStep('final')}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}

                {adminStep === 'final' && (
                  <>
                    <p className="text-sm text-secondary">
                      Step 2 of 2: type <span className="font-mono font-semibold">{ADMIN_CONFIRMATION_PHRASE}</span> to finish deactivating this admin account.
                    </p>
                    <input
                      type="text"
                      value={typedPhrase}
                      onChange={(e) => setTypedPhrase(e.target.value)}
                      className="input-field font-mono"
                      placeholder={ADMIN_CONFIRMATION_PHRASE}
                      autoFocus
                    />
                    <div className="flex space-x-3 pt-2">
                      <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={typedPhrase !== ADMIN_CONFIRMATION_PHRASE || loading}
                        onClick={handleFinalAdminSubmit}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Deactivating...' : 'Deactivate Admin Account'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : user.isActive ? (
              /* Deactivation Form (non-admin users - unchanged single step) */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Reason for Deactivation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Select a reason...</option>
                    {DEACTIVATION_REASONS.map((reasonOption) => (
                      <option key={reasonOption} value={reasonOption}>
                        {reasonOption}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-field"
                    rows={3}
                    placeholder="Add any additional details about the deactivation..."
                  />
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    <strong>Warning:</strong> Deactivating this user will prevent them from logging into the system.
                    All their business memberships will remain but be marked as inactive.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex-1 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Deactivating...' : 'Deactivate User'}
                  </button>
                </div>
              </form>
            ) : (
              /* Reactivation Form (any role, unchanged) */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Reactivation Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-field"
                    rows={3}
                    placeholder="Add any notes about the reactivation..."
                  />
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Reactivating this user will restore their ability to log into the system.
                    Their business memberships will be reactivated as well.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReactivate}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex-1 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Reactivating...' : 'Reactivate User'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
