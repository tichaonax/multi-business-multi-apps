'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { PolicyAcknowledgmentModal } from './PolicyAcknowledgmentModal'

// Paths where the guard should never block (auth, public)
const EXEMPT_PATHS = ['/login', '/register', '/api', '/customer-display', '/kiosk']

interface PendingPolicy {
  assignmentId: string
  policyId: string
  policyVersion: number
  dueDate: string | null
  isOverdue: boolean
  policy: { id: string; title: string; category: string; contentType: string; currentVersion: number }
  content: string | null
  fileId: string | null
}

export function PolicyGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()

  const [pending, setPending] = useState<PendingPolicy[]>([])
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isExempt = EXEMPT_PATHS.some(p => pathname.startsWith(p))
  // Managers are never blocked
  const isManager = isSystemAdmin || hasPermission('canManagePolicies')

  const checkPending = useCallback(async () => {
    if (!session || !currentBusinessId || isExempt || isManager) {
      setChecked(true)
      return
    }
    try {
      const res = await fetch(`/api/policies/pending?businessId=${currentBusinessId}`)
      if (res.ok) {
        const data = await res.json()
        // Only block for overdue or no-due-date (immediate) assignments
        const blocking = data.filter((p: PendingPolicy) => p.isOverdue || !p.dueDate)
        setPending(blocking)
      }
    } catch {}
    setChecked(true)
  }, [session, currentBusinessId, isExempt, isManager])

  useEffect(() => {
    if (status === 'authenticated') checkPending()
    else if (status === 'unauthenticated') setChecked(true)
  }, [status, checkPending, pathname])

  const handleAllDone = () => {
    setPending([])
  }

  return (
    <>
      {children}
      {checked && pending.length > 0 && (
        <PolicyAcknowledgmentModal
          pending={pending}
          onAllDone={handleAllDone}
          onError={setError}
          onClose={() => setPending([])}
        />
      )}
      {error && (
        <div className="fixed bottom-4 right-4 z-[200] bg-red-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}
    </>
  )
}
