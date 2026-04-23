import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface PolicyOverdueResult {
  overdueCount: number
  pendingCount: number
}

// Module-level cache — shared across the PolicyGuard and header badge
let _cache: PolicyOverdueResult | null = null
let _cacheKey = ''
let _cacheAt = 0
const CACHE_TTL = 30_000 // 30 seconds

function fetchPolicyOverdue(businessId: string): Promise<PolicyOverdueResult> {
  const now = Date.now()
  const key = businessId
  if (_cache && _cacheKey === key && now - _cacheAt < CACHE_TTL) {
    return Promise.resolve(_cache)
  }
  return fetch(`/api/policies/pending?businessId=${businessId}`)
    .then(r => r.ok ? r.json() : [])
    .then((data: any[]) => {
      const result: PolicyOverdueResult = {
        overdueCount: data.filter(p => p.isOverdue || !p.dueDate).length,
        pendingCount: data.length,
      }
      _cache = result
      _cacheKey = key
      _cacheAt = Date.now()
      return result
    })
    .catch(() => ({ overdueCount: 0, pendingCount: 0 }))
}

export function invalidatePolicyOverdueCache() {
  _cache = null
  _cacheAt = 0
}

export function usePolicyOverdue(): PolicyOverdueResult {
  const { status } = useSession()
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const [result, setResult] = useState<PolicyOverdueResult>({ overdueCount: 0, pendingCount: 0 })

  const isManager = isSystemAdmin || hasPermission('canManagePolicies')

  const check = useCallback(async () => {
    if (status !== 'authenticated' || !currentBusinessId || isManager) {
      setResult({ overdueCount: 0, pendingCount: 0 })
      return
    }
    const data = await fetchPolicyOverdue(currentBusinessId)
    setResult(data)
  }, [status, currentBusinessId, isManager])

  useEffect(() => { check() }, [check])

  return result
}
