'use client'

import { useState, useEffect, useRef } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'

interface AccessUser {
  id: string
  name: string
  email: string
}

interface AccessRecord {
  id: string
  userId: string
  accountId: string
  canCreateRequests: boolean
  canViewOwnOnly: boolean
  canViewBalance: boolean
  isActive: boolean
  grantedAt: string
  revokedAt: string | null
  user: AccessUser
  grantor: { id: string; name: string }
}

interface ExpenseAccountAccessPanelProps {
  accountId: string
}

export function ExpenseAccountAccessPanel({ accountId }: ExpenseAccountAccessPanelProps) {
  const toast = useToastContext()
  const confirm = useConfirm()

  const [records, setRecords] = useState<AccessRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Add-user form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<AccessUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AccessUser | null>(null)
  const [newCanCreate, setNewCanCreate] = useState(true)
  const [newViewOwnOnly, setNewViewOwnOnly] = useState(true)
  const [newViewBalance, setNewViewBalance] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/access`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.data) setRecords(data.data)
    } catch {
      toast.error('Failed to load access records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRecords() }, [accountId])

  // Debounced user search via payees API
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!userSearch.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/expense-account/payees?search=${encodeURIComponent(userSearch.trim())}`,
          { credentials: 'include' }
        )
        const data = await res.json()
        const users: AccessUser[] = (data.data?.users || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email || '',
        }))
        // Exclude already-active records
        const activeIds = new Set(records.filter(r => r.isActive).map(r => r.userId))
        setSearchResults(users.filter(u => !activeIds.has(u.id)))
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      }
    }, 300)
  }, [userSearch, records])

  function selectUser(u: AccessUser) {
    setSelectedUser(u)
    setUserSearch(u.name)
    setShowDropdown(false)
  }

  async function handleGrantAccess() {
    if (!selectedUser) { toast.error('Select a user first'); return }
    setAddingUser(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: selectedUser.id,
          canCreateRequests: newCanCreate,
          canViewOwnOnly: newViewOwnOnly,
          canViewBalance: newViewBalance,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to grant access'); return }
      toast.push(`Access granted to ${selectedUser.name}`)
      setShowAddForm(false)
      setSelectedUser(null)
      setUserSearch('')
      setNewCanCreate(true)
      setNewViewOwnOnly(true)
      setNewViewBalance(false)
      loadRecords()
    } catch {
      toast.error('Failed to grant access')
    } finally {
      setAddingUser(false)
    }
  }

  async function togglePerm(record: AccessRecord, field: 'canCreateRequests' | 'canViewOwnOnly' | 'canViewBalance') {
    const newVal = !record[field]
    try {
      const res = await fetch(`/api/expense-account/${accountId}/access/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: newVal }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Failed to update'); return }
      setRecords(prev => prev.map(r => r.id === record.id ? { ...r, [field]: newVal } : r))
    } catch {
      toast.error('Failed to update permission')
    }
  }

  async function handleRevoke(record: AccessRecord) {
    const confirmed = await confirm({
      title: 'Revoke Access',
      description: `Remove ${record.user.name}'s access to this account?`,
      confirmText: 'Revoke',
      cancelText: 'Keep',
    })
    if (!confirmed) return
    try {
      const res = await fetch(`/api/expense-account/${accountId}/access/${record.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Failed to revoke'); return }
      toast.push(`Access revoked for ${record.user.name}`)
      loadRecords()
    } catch {
      toast.error('Failed to revoke access')
    }
  }

  const activeRecords = records.filter(r => r.isActive)
  const revokedRecords = records.filter(r => !r.isActive)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Restricted Access</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Grant specific users read-only access to submit combo requests on this account.
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            + Grant Access
          </button>
        )}
      </div>

      {/* Add user form */}
      {showAddForm && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-4">
          <p className="text-sm font-medium text-blue-900">Grant access to a user</p>

          {/* User search */}
          <div className="relative">
            <label className="block text-xs text-gray-600 mb-1">Search user</label>
            <input
              ref={searchRef}
              type="text"
              value={userSearch}
              onChange={e => { setUserSearch(e.target.value); setSelectedUser(null) }}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Type a name..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectUser(u)}
                    className="w-full flex flex-col items-start px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{u.name}</span>
                    {u.email && <span className="text-xs text-gray-500">{u.email}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Permission toggles */}
          <div className="space-y-2">
            <PermissionToggle
              label="Can submit combo requests"
              description="User can create and submit new combo payment requests"
              checked={newCanCreate}
              onChange={setNewCanCreate}
            />
            <PermissionToggle
              label="Can only view own requests"
              description="User sees only their own requests, not all account transactions"
              checked={newViewOwnOnly}
              onChange={setNewViewOwnOnly}
            />
            <PermissionToggle
              label="Can view account balance"
              description="User can see the account balance total"
              checked={newViewBalance}
              onChange={setNewViewBalance}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setShowAddForm(false); setSelectedUser(null); setUserSearch('') }}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGrantAccess}
              disabled={!selectedUser || addingUser}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {addingUser ? 'Granting...' : 'Grant Access'}
            </button>
          </div>
        </div>
      )}

      {/* Active access records */}
      {loading && <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>}

      {!loading && activeRecords.length === 0 && (
        <div className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-lg">
          No restricted access grants yet.
        </div>
      )}

      {activeRecords.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {activeRecords.map(record => (
            <div key={record.id} className="px-4 py-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{record.user.name}</p>
                  <p className="text-xs text-gray-500">{record.user.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Granted by {record.grantor.name} · {new Date(record.grantedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(record)}
                  className="shrink-0 text-xs text-red-600 border border-red-200 hover:border-red-400 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                >
                  Revoke
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <InlineToggle
                  label="Can create requests"
                  checked={record.canCreateRequests}
                  onChange={() => togglePerm(record, 'canCreateRequests')}
                />
                <InlineToggle
                  label="Own requests only"
                  checked={record.canViewOwnOnly}
                  onChange={() => togglePerm(record, 'canViewOwnOnly')}
                />
                <InlineToggle
                  label="Can view balance"
                  checked={record.canViewBalance}
                  onChange={() => togglePerm(record, 'canViewBalance')}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revoked records (collapsed) */}
      {revokedRecords.length > 0 && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">
            {revokedRecords.length} revoked record{revokedRecords.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {revokedRecords.map(r => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-gray-500 line-through">{r.user.name}</span>
                <span className="text-gray-400">
                  {r.revokedAt ? new Date(r.revokedAt).toLocaleDateString() : 'revoked'}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function PermissionToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <div className="relative shrink-0 mt-0.5">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div
          className={`w-8 h-4 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
          onClick={() => onChange(!checked)}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
          onClick={() => onChange(!checked)}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </label>
  )
}

function InlineToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
        checked
          ? 'border-blue-300 bg-blue-50 text-blue-700'
          : 'border-gray-200 bg-gray-50 text-gray-500'
      }`}
    >
      <span>{checked ? '✓' : '○'}</span>
      <span>{label}</span>
    </button>
  )
}
