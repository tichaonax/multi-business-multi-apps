'use client'

import { useState, useEffect } from 'react'
import { ModalPortal } from '@/components/ui/modal-portal'

interface AvailableEmployee {
  id: string
  fullName: string
  employeeNumber: string
  email: string | null
  phone: string
  employmentStatus: string
  primaryBusiness: { id: string | null; name: string | null; type: string | null }
}

interface LinkEmployeeModalProps {
  userId: string
  userName: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

/**
 * The reverse of ManageUserAccountModal's "link" mode — that one starts from
 * an employee and searches unlinked users; this starts from a user (admin/users
 * page) and searches unlinked employees, so a user account created separately
 * from its employee record (e.g. via a different onboarding flow) can be
 * connected instead of a duplicate employee record getting created for them.
 * Same underlying link, opposite direction: PUT /api/users/[userId]/link-employee.
 */
export function LinkEmployeeModal({ userId, userName, isOpen, onClose, onSuccess, onError }: LinkEmployeeModalProps) {
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState(false)
  // Pre-fill with the user's own first name so a likely match — the common
  // case, the same person's employee record just never got linked — shows
  // up immediately with nothing typed. Still editable.
  const [searchTerm, setSearchTerm] = useState(() => userName.split(' ')[0] || '')
  const [employees, setEmployees] = useState<AvailableEmployee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const handle = setTimeout(fetchAvailableEmployees, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, searchTerm])

  if (!isOpen) return null

  async function fetchAvailableEmployees() {
    try {
      setLoading(true)
      const params = new URLSearchParams({ status: 'all', limit: '50' })
      if (searchTerm) params.set('search', searchTerm)
      const res = await fetch(`/api/employees/available-for-users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Error fetching available employees:', error)
      onError('Failed to load available employees')
    } finally {
      setLoading(false)
    }
  }

  async function handleLink() {
    if (!selectedEmployeeId) {
      onError('Please select an employee to link')
      return
    }
    setLinking(true)
    try {
      const res = await fetch(`/api/users/${userId}/link-employee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployeeId }),
      })
      const result = await res.json()
      if (res.ok) {
        onSuccess(result.message)
        onClose()
      } else {
        onError(result.error || 'Failed to link employee')
      }
    } catch (error) {
      onError('Failed to link employee')
    } finally {
      setLinking(false)
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-primary">Link Existing Employee</h2>
              <p className="text-sm text-secondary mt-0.5">for user {userName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" disabled={linking}>✕</button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search employees by name, number, email or national ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full px-4 py-2.5 text-base"
              />
            </div>

            <div className="max-h-72 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
              {loading ? (
                <div className="p-4 text-center text-secondary">Loading employees...</div>
              ) : employees.length === 0 ? (
                <div className="p-4 text-center text-secondary">No unlinked employees found</div>
              ) : (
                employees.map(employee => (
                  <div
                    key={employee.id}
                    className={`p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedEmployeeId === employee.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => setSelectedEmployeeId(employee.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        checked={selectedEmployeeId === employee.id}
                        onChange={() => setSelectedEmployeeId(employee.id)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-primary">{employee.fullName}</p>
                        <p className="text-sm text-secondary">
                          {employee.employeeNumber}
                          {employee.email ? ` · ${employee.email}` : ''}
                          {employee.phone ? ` · ${employee.phone}` : ''}
                        </p>
                        {employee.primaryBusiness?.name && (
                          <span className="inline-block text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-0.5 rounded mt-1">
                            {employee.primaryBusiness.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <button onClick={onClose} className="btn-secondary" disabled={linking}>Cancel</button>
            <button onClick={handleLink} disabled={!selectedEmployeeId || linking} className="btn-primary">
              {linking ? 'Linking...' : 'Link Employee'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
