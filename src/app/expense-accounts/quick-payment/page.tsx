'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { QuickPaymentModal } from '@/components/expense-account/quick-payment-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

interface AccountData {
  id: string
  accountName: string
  balance: number
  accountType: string
  businessId: string
  landlordSupplierId?: string | null
  landlordSupplierName?: string | null
}

export default function QuickPaymentPage() {
  const { status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const {
    currentBusiness,
    hasPermission,
    isSystemAdmin,
    isBusinessOwner,
    businesses,
    loading: bizLoading,
  } = useBusinessPermissionsContext()

  const [account, setAccount] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)

  // Permission logic matching expense-account page
  const canChangeCategory = isSystemAdmin || isBusinessOwner || currentBusiness?.role === 'business-manager'
  const canCreatePayees = canChangeCategory

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/signin'); return }
    if (status !== 'authenticated' || bizLoading) return

    if (!hasPermission('canAccessExpenseAccount') && !isSystemAdmin) {
      toast.error('You do not have permission to access expense accounts')
      router.push('/dashboard')
      return
    }

    const params = new URLSearchParams()
    if (!isSystemAdmin && currentBusiness?.businessId) params.set('businessId', currentBusiness.businessId)

    fetch(`/api/expense-account?${params}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject('Failed to load'))
      .then(data => {
        const accounts: any[] = data?.data?.accounts ?? []
        // Prefer GENERAL account, fall back to first available
        const primary = accounts.find(a => a.accountType === 'GENERAL') ?? accounts[0] ?? null
        if (primary) {
          setAccount({
            id: primary.id,
            accountName: primary.accountName,
            balance: primary.balance,
            accountType: primary.accountType,
            businessId: primary.businessId,
            landlordSupplierId: primary.landlordSupplierId ?? null,
            landlordSupplierName: primary.landlordSupplierName ?? null,
          })
        } else {
          toast.error('No expense account found for this business')
          router.push('/expense-accounts')
        }
      })
      .catch(() => { toast.error('Failed to load expense account'); router.push('/expense-accounts') })
      .finally(() => setLoading(false))
  }, [status, bizLoading, isSystemAdmin, currentBusiness?.businessId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <QuickPaymentModal
      isOpen={true}
      accountId={account.id}
      accountName={account.accountName}
      currentBalance={account.balance}
      accountType={account.accountType}
      businessId={account.businessId}
      defaultCategoryBusinessType={currentBusiness?.businessType}
      businesses={businesses}
      canCreatePayees={canCreatePayees}
      canChangeCategory={canChangeCategory}
      presetPayee={
        account.accountType === 'RENT' && account.landlordSupplierId && account.landlordSupplierName
          ? { type: 'SUPPLIER', id: account.landlordSupplierId, name: account.landlordSupplierName }
          : null
      }
      onClose={() => router.push(`/expense-accounts/${account.id}`)}
      onSuccess={() => {
        toast.push('Payment request submitted', { type: 'success' })
        router.push(`/expense-accounts/${account.id}`)
      }}
      onError={(err) => toast.error(err)}
    />
  )
}
