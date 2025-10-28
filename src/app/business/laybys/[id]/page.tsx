'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { isSystemAdmin } from '@/lib/permission-utils'
import { CustomerLayby, RecordPaymentPayload } from '@/types/layby'
import { LaybyDetails } from '@/components/laybys/layby-details'
import { PaymentRecordModal } from '@/components/laybys/payment-record-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, DollarSign, CheckCircle2, Ban, Pause, Play, RefreshCw, AlertCircle } from 'lucide-react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

interface LaybyDetailPageProps {
  params: Promise<{ id: string }>
}

export default function LaybyDetailPage({ params }: LaybyDetailPageProps) {
  const { id: laybyId } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [layby, setLayby] = useState<CustomerLayby | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showHoldModal, setShowHoldModal] = useState(false)
  const [showReactivateModal, setShowReactivateModal] = useState(false)

  // Action loading states
  const [actionLoading, setActionLoading] = useState(false)

  // Action form data
  const [cancelReason, setCancelReason] = useState('')
  const [holdReason, setHoldReason] = useState('')
  const [reactivateNotes, setReactivateNotes] = useState('')
  const [createOrderOnComplete, setCreateOrderOnComplete] = useState(true)

  const { hasPermission } = useBusinessPermissionsContext()
  const currentUser = session?.user as any
  const canManageLaybys = isSystemAdmin(currentUser) || hasPermission('canManageLaybys')
  const toast = useToastContext()

  // Fetch layby details
  const fetchLayby = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/laybys/${laybyId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch layby details')
      }

      const data = await response.json()
      setLayby(data.data)
    } catch (err) {
      console.error('Error fetching layby:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLayby()
  }, [laybyId])

  // Handle payment success
  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false)
    await fetchLayby() // Refresh layby data
  }

  // Complete layby
  const handleComplete = async () => {
    try {
      setActionLoading(true)

      const response = await fetch(`/api/laybys/${laybyId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'system'
        },
        body: JSON.stringify({
          createOrder: createOrderOnComplete
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to complete layby')
      }

      const result = await response.json()

      toast.push(result.message)
      setShowCompleteModal(false)
      await fetchLayby()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to complete layby')
    } finally {
      setActionLoading(false)
    }
  }

  // Cancel layby
  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.push('Please provide a cancellation reason')
      return
    }

    try {
      setActionLoading(true)

      const response = await fetch(`/api/laybys/${laybyId}?reason=${encodeURIComponent(cancelReason)}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || 'system'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel layby')
      }

      const result = await response.json()

      toast.push(result.message)
      setShowCancelModal(false)
      await fetchLayby()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to cancel layby')
    } finally {
      setActionLoading(false)
    }
  }

  // Put on hold
  const handleHold = async () => {
    if (!holdReason.trim()) {
      toast.push('Please provide a reason for holding the layby')
      return
    }

    try {
      setActionLoading(true)

      const response = await fetch(`/api/laybys/${laybyId}/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'system'
        },
        body: JSON.stringify({
          reason: holdReason
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to put layby on hold')
      }

      const result = await response.json()

      toast.push(result.message)
      setShowHoldModal(false)
      setHoldReason('')
      await fetchLayby()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to put layby on hold')
    } finally {
      setActionLoading(false)
    }
  }

  // Reactivate layby
  const handleReactivate = async () => {
    try {
      setActionLoading(true)

      const response = await fetch(`/api/laybys/${laybyId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'system'
        },
        body: JSON.stringify({
          notes: reactivateNotes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reactivate layby')
      }

      const result = await response.json()

      toast.push(result.message)
      setShowReactivateModal(false)
      setReactivateNotes('')
      await fetchLayby()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to reactivate layby')
    } finally {
      setActionLoading(false)
    }
  }

  if (!canManageLaybys) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="card p-12 text-center">
            <p className="text-secondary">You don&apos;t have permission to manage laybys</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="card p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-secondary mt-4">Loading layby details...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !layby) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <Button variant="outline" onClick={() => router.push('/business/laybys')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Laybys
          </Button>
          <div className="card p-12 text-center mt-6">
            <p className="text-red-600">{error || 'Layby not found'}</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/business/laybys')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Laybys
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Manage Layby</h1>
              <p className="text-secondary mt-1">
                {layby.laybyNumber} • {layby.customer?.name || 'No customer'}
              </p>
            </div>
            <Button variant="outline" onClick={fetchLayby}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Deposit Collection Banner */}
        {Number(layby.totalPaid) === 0 && layby.status === 'ACTIVE' && (
          <div className="card bg-orange-50 dark:bg-orange-950 border-2 border-orange-500 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100 mb-2">
                  Deposit Payment Required
                </h3>
                <p className="text-orange-800 dark:text-orange-200 mb-3">
                  This layby is incomplete. The initial deposit of <span className="font-bold">${Number(layby.depositAmount).toFixed(2)}</span> must be collected to activate the layby properly.
                </p>
                <Button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Collect Deposit Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="card p-6 mb-6">
          <h3 className="font-semibold mb-4">Actions</h3>
          <div className="flex flex-wrap gap-3">
            {layby.status === 'ACTIVE' && (
              <>
                <Button
                  onClick={() => setShowPaymentModal(true)}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  <DollarSign className="h-5 w-5 mr-2" />
                  Record Payment
                </Button>
                {Number(layby.balanceRemaining) === 0 && !layby.itemsReleased && (
                  <Button onClick={() => setShowCompleteModal(true)} variant="default">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Layby
                  </Button>
                )}
                <Button onClick={() => setShowHoldModal(true)} variant="outline">
                  <Pause className="h-4 w-4 mr-2" />
                  Put on Hold
                </Button>
              </>
            )}

            {(layby.status === 'ON_HOLD' || layby.status === 'DEFAULTED') && (
              <Button onClick={() => setShowReactivateModal(true)} variant="default">
                <Play className="h-4 w-4 mr-2" />
                Reactivate
              </Button>
            )}

            {(layby.status === 'ACTIVE' || layby.status === 'ON_HOLD') && (
              <Button onClick={() => setShowCancelModal(true)} variant="destructive">
                <Ban className="h-4 w-4 mr-2" />
                Cancel Layby
              </Button>
            )}
          </div>
        </div>

        {/* Layby Details */}
        <LaybyDetails layby={layby} />

        {/* Payment Modal */}
        {showPaymentModal && layby && (
          <PaymentRecordModal
            laybyId={layby.id}
            laybyNumber={layby.laybyNumber}
            customerName={layby.customer?.name || 'Unknown Customer'}
            totalAmount={Number(layby.totalAmount)}
            paidAmount={Number(layby.totalPaid)}
            balanceRemaining={Number(layby.balanceRemaining)}
            depositAmount={Number(layby.depositAmount)}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {/* Complete Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Complete Layby</h2>
                <p className="text-secondary mb-4">
                  This will mark the layby as completed and release the items to the customer.
                </p>
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createOrderOnComplete}
                      onChange={(e) => setCreateOrderOnComplete(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Create order automatically</span>
                  </label>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleComplete} disabled={actionLoading}>
                    {actionLoading ? 'Completing...' : 'Complete Layby'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Cancel Layby</h2>
                <p className="text-secondary mb-4">
                  This will cancel the layby and process a refund. This action cannot be undone.
                </p>
                <div className="mb-4">
                  <Label htmlFor="cancelReason">Cancellation Reason *</Label>
                  <Textarea
                    id="cancelReason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Explain why this layby is being cancelled..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                    Back
                  </Button>
                  <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
                    {actionLoading ? 'Cancelling...' : 'Cancel Layby'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hold Modal */}
        {showHoldModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Put Layby on Hold</h2>
                <p className="text-secondary mb-4">
                  This will pause the layby. No payments can be made while on hold.
                </p>
                <div className="mb-4">
                  <Label htmlFor="holdReason">Reason for Hold *</Label>
                  <Textarea
                    id="holdReason"
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    placeholder="Explain why this layby is being put on hold..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowHoldModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleHold} disabled={actionLoading}>
                    {actionLoading ? 'Processing...' : 'Put on Hold'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reactivate Modal */}
        {showReactivateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Reactivate Layby</h2>
                <p className="text-secondary mb-4">
                  This will reactivate the layby from {layby.status} status.
                </p>
                <div className="mb-4">
                  <Label htmlFor="reactivateNotes">Notes (Optional)</Label>
                  <Textarea
                    id="reactivateNotes"
                    value={reactivateNotes}
                    onChange={(e) => setReactivateNotes(e.target.value)}
                    placeholder="Add any notes about the reactivation..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowReactivateModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleReactivate} disabled={actionLoading}>
                    {actionLoading ? 'Reactivating...' : 'Reactivate'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
