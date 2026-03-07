'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'

interface UserRow {
  id: string
  name: string
  email: string
  canRequest: boolean
  canApprove: boolean
}

export default function PettyCashPermissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetchUsers()
  }, [session, status, router])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/petty-cash-permissions', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setUsers(json.users)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function togglePermission(userId: string, permissionName: string, currentValue: boolean) {
    const key = `${userId}:${permissionName}`
    setToggling(key)
    try {
      const res = await fetch('/api/admin/petty-cash-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, permissionName, grant: !currentValue }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update')
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u
        if (permissionName === 'petty_cash.request') return { ...u, canRequest: !currentValue }
        if (permissionName === 'petty_cash.approve') return { ...u, canApprove: !currentValue }
        return u
      }))
      toast.push(`Permission ${!currentValue ? 'granted' : 'revoked'}`, { type: 'success' })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setToggling(null)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <ContentLayout title="Petty Cash Permissions">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Petty Cash Permissions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Grant or revoke petty cash permissions for users.</p>
        </div>

        {/* Legend */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <p><strong>Can Request</strong> — user can submit petty cash requests</p>
          <p><strong>Can Approve</strong> — user can approve requests, hand over cash, and settle requests at EOD</p>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">User</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Can Request</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Can Approve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">No users found</td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleButton
                      active={u.canRequest}
                      disabled={toggling === `${u.id}:petty_cash.request`}
                      onClick={() => togglePermission(u.id, 'petty_cash.request', u.canRequest)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleButton
                      active={u.canApprove}
                      disabled={toggling === `${u.id}:petty_cash.approve`}
                      onClick={() => togglePermission(u.id, 'petty_cash.approve', u.canApprove)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ContentLayout>
  )
}

function ToggleButton({ active, disabled, onClick }: { active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
