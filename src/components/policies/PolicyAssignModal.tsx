'use client'

import { useState, useEffect } from 'react'

interface Member {
  userId: string
  userName: string
  role: string
}

interface Props {
  policy: { id: string; title: string; currentVersion: number }
  businessId: string
  onClose: () => void
  onSuccess: () => void
  onError: (msg: string) => void
}

const ROLES = [
  'business-owner', 'business-manager', 'employee', 'salesperson',
  'restaurant-associate', 'grocery-associate', 'clothing-associate',
  'read-only', 'delivery-driver',
]

export default function PolicyAssignModal({ policy, businessId, onClose, onSuccess, onError }: Props) {
  const [scope, setScope] = useState<'ALL_EMPLOYEES' | 'BY_ROLE' | 'INDIVIDUAL'>('ALL_EMPLOYEES')
  const [roleTarget, setRoleTarget] = useState('employee')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    if (scope !== 'INDIVIDUAL') return
    setLoadingMembers(true)
    fetch(`/api/user/business-memberships?businessId=${businessId}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.memberships ?? []
        setMembers(list.map((m: any) => ({
          userId: m.userId ?? m.id,
          userName: m.userName ?? m.name ?? m.users?.name ?? 'Unknown',
          role: m.role,
        })))
      })
      .catch(() => onError('Failed to load members'))
      .finally(() => setLoadingMembers(false))
  }, [scope, businessId])

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleAssign = async () => {
    if (scope === 'INDIVIDUAL' && selectedUserIds.length === 0) {
      onError('Select at least one employee')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/policies/${policy.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          scope,
          roleTarget: scope === 'BY_ROLE' ? roleTarget : undefined,
          userIds: scope === 'INDIVIDUAL' ? selectedUserIds : undefined,
          dueDate: dueDate || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      onSuccess()
    } catch (e: any) {
      onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Policy</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {policy.title} — v{policy.currentVersion}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign To</label>
            <div className="grid grid-cols-3 gap-2">
              {(['ALL_EMPLOYEES', 'BY_ROLE', 'INDIVIDUAL'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    scope === s
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {s === 'ALL_EMPLOYEES' ? 'All Employees' : s === 'BY_ROLE' ? 'By Role' : 'Select Individuals'}
                </button>
              ))}
            </div>
          </div>

          {/* Role picker */}
          {scope === 'BY_ROLE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select
                value={roleTarget}
                onChange={e => setRoleTarget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          {/* Individual picker */}
          {scope === 'INDIVIDUAL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Employees</label>
              {loadingMembers ? (
                <div className="text-sm text-gray-400 py-3 text-center">Loading members…</div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {members.map(m => (
                    <label key={m.userId} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(m.userId)}
                        onChange={() => toggleUser(m.userId)}
                        className="rounded"
                      />
                      <div>
                        <span className="text-sm text-gray-900 dark:text-white">{m.userName}</span>
                        <span className="ml-2 text-xs text-gray-400">{m.role}</span>
                      </div>
                    </label>
                  ))}
                  {members.length === 0 && (
                    <p className="text-sm text-gray-400 p-3 text-center">No members found</p>
                  )}
                </div>
              )}
              {selectedUserIds.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{selectedUserIds.length} employee(s) selected</p>
              )}
            </div>
          )}

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Date <span className="font-normal text-gray-400">(optional — blocks access after this date)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              If no due date: employee is blocked immediately until acknowledged.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Annual refresher 2026"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Cancel</button>
          <button
            onClick={handleAssign}
            disabled={saving}
            className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Assigning…' : 'Assign Policy'}
          </button>
        </div>
      </div>
    </div>
  )
}
