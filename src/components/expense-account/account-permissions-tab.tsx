'use client'

import { useState, useEffect } from 'react'

interface Grant {
  id: string
  userId: string
  userName: string
  userEmail: string
  permissionLevel: 'VIEW' | 'FULL'
  grantedAt: string
  grantedByName: string
}

interface UserOption {
  id: string
  name: string
  email: string
}

interface AccountPermissionsTabProps {
  accountId: string
}

export function AccountPermissionsTab({ accountId }: AccountPermissionsTabProps) {
  const [grants, setGrants] = useState<Grant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // User search state
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [permissionLevel, setPermissionLevel] = useState<'VIEW' | 'FULL'>('FULL')
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  useEffect(() => {
    loadGrants()
    loadUsers()
  }, [accountId])

  const loadGrants = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/expense-account/${accountId}/grants`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setGrants(data.data || [])
      }
    } catch (e) {
      console.error('Error loading grants:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const users = (data.users || data || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }))
        setAllUsers(users)
      }
    } catch (e) {
      console.error('Error loading users:', e)
    }
  }

  const filteredUsers = allUsers.filter(u => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  }).filter(u => !grants.find(g => g.userId === u.id)) // exclude already-granted users

  const handleAddGrant = async () => {
    if (!selectedUser) return
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/grants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: selectedUser.id, permissionLevel }),
      })
      const data = await res.json()
      if (res.ok) {
        await loadGrants()
        setSelectedUser(null)
        setSearchQuery('')
        setPermissionLevel('FULL')
      } else {
        setError(data.error || 'Failed to add access')
      }
    } catch (e) {
      setError('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async (userId: string) => {
    setRevoking(userId)
    try {
      await fetch(`/api/expense-account/${accountId}/grants?userId=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setGrants(prev => prev.filter(g => g.userId !== userId))
    } catch (e) {
      console.error('Error revoking grant:', e)
    } finally {
      setRevoking(null)
    }
  }

  const handleUpdateLevel = async (userId: string, newLevel: 'VIEW' | 'FULL') => {
    try {
      await fetch(`/api/expense-account/${accountId}/grants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, permissionLevel: newLevel }),
      })
      setGrants(prev => prev.map(g => g.userId === userId ? { ...g, permissionLevel: newLevel } : g))
    } catch (e) {
      console.error('Error updating grant:', e)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Access */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Grant Access to User</h4>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {/* User search */}
          <div className="relative flex-1">
            <input
              type="text"
              value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSelectedUser(null)
                setShowUserDropdown(true)
              }}
              onFocus={() => setShowUserDropdown(true)}
              onBlur={() => setTimeout(() => setShowUserDropdown(false), 150)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
            {selectedUser && (
              <button
                type="button"
                onClick={() => { setSelectedUser(null); setSearchQuery('') }}
                className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            )}
            {showUserDropdown && !selectedUser && filteredUsers.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredUsers.slice(0, 20).map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={() => {
                      setSelectedUser(u)
                      setSearchQuery('')
                      setShowUserDropdown(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{u.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Permission level */}
          <select
            value={permissionLevel}
            onChange={(e) => setPermissionLevel(e.target.value as 'VIEW' | 'FULL')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="FULL">Full Access (view + payments + deposits)</option>
            <option value="VIEW">View Only (view + reports)</option>
          </select>

          <button
            type="button"
            onClick={handleAddGrant}
            disabled={!selectedUser || saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {saving ? 'Adding...' : 'Grant Access'}
          </button>
        </div>
      </div>

      {/* Existing Grants */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Users with Access ({grants.length})
        </h4>

        {grants.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No users have been granted access to this account yet.
          </div>
        ) : (
          <div className="space-y-2">
            {grants.map(grant => (
              <div
                key={grant.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{grant.userName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{grant.userEmail}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Granted by {grant.grantedByName} · {new Date(grant.grantedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  {/* Permission level badge / toggle */}
                  <select
                    value={grant.permissionLevel}
                    onChange={(e) => handleUpdateLevel(grant.userId, e.target.value as 'VIEW' | 'FULL')}
                    className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="FULL">Full Access</option>
                    <option value="VIEW">View Only</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRevoke(grant.userId)}
                    disabled={revoking === grant.userId}
                    className="text-xs px-2 py-1 text-red-600 dark:text-red-400 hover:text-red-700 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    {revoking === grant.userId ? 'Revoking...' : 'Revoke'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
