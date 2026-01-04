'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { isSystemAdmin } from '@/lib/permission-utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface MacEntry {
  mac: string
  macComment?: string
  businessId?: string
  createdBy?: {
    id: string
    name: string
    email: string
  }
  createdAt?: string
}

interface AclList {
  id: string
  name: string
  description: string
  defaultMode: 'allow' | 'deny'
  denyMacs: MacEntry[]
  acceptMacs: MacEntry[]
  editable: boolean
  ipAddress?: string
}

export default function AclDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <AclDetailContent params={params} />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function AclDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const { currentBusiness } = useBusinessPermissionsContext()
  const router = useRouter()
  const user = session?.user as any

  const [acl, setAcl] = useState<AclList | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mode: 'allow' as 'allow' | 'deny'
  })
  const [macEntries, setMacEntries] = useState<MacEntry[]>([])

  useEffect(() => {
    loadAcl()
  }, [resolvedParams.id, currentBusiness?.businessId])

  const loadAcl = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (currentBusiness?.businessId) {
        params.append('businessId', currentBusiness.businessId)
      }

      const response = await fetch(`/api/r710/acl?${params.toString()}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const aclList = data.data.find((a: AclList) => a.id === resolvedParams.id)

        if (aclList) {
          setAcl(aclList)
          setFormData({
            name: aclList.name,
            description: aclList.description,
            mode: aclList.defaultMode
          })
          // Get the MACs based on mode
          const macs = aclList.defaultMode === 'deny' ? aclList.acceptMacs : aclList.denyMacs
          setMacEntries(macs)
        }
      }
    } catch (error) {
      console.error('Failed to load ACL:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMac = () => {
    setMacEntries([...macEntries, { mac: '', macComment: '' }])
  }

  const handleRemoveMac = (index: number) => {
    setMacEntries(macEntries.filter((_, i) => i !== index))
  }

  const handleMacChange = (index: number, field: keyof MacEntry, value: string) => {
    const updated = [...macEntries]
    updated[index] = { ...updated[index], [field]: value }
    setMacEntries(updated)
  }

  const formatMacAddress = (mac: string): string => {
    const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase()
    if (cleaned.length !== 12) return mac
    return cleaned.match(/.{1,2}/g)?.join(':') || mac
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('ACL name is required')
      return false
    }

    if (!formData.description.trim()) {
      setError('Description is required')
      return false
    }

    for (const entry of macEntries) {
      if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(entry.mac)) {
        setError(`Invalid MAC address: ${entry.mac}`)
        return false
      }
    }

    setError('')
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    if (!currentBusiness?.businessId) {
      setError('No business selected')
      return
    }

    try {
      setSaving(true)
      setError('')

      const payload = {
        businessId: currentBusiness.businessId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        mode: formData.mode,
        macs: macEntries.map(e => ({ mac: e.mac, macComment: e.macComment || '' }))
      }

      const response = await fetch(`/api/r710/acl/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setEditing(false)
        await loadAcl()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to update ACL')
      }
    } catch (error) {
      console.error('Failed to update ACL:', error)
      setError('Failed to update ACL')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ACL "${acl?.name}"? This cannot be undone.`)) {
      return
    }

    try {
      const params = new URLSearchParams({
        businessId: currentBusiness?.businessId || ''
      })

      const response = await fetch(`/api/r710/acl/${resolvedParams.id}?${params.toString()}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        router.push('/r710-portal/acl')
      } else {
        const error = await response.json()
        alert(`Failed to delete ACL: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to delete ACL:', error)
      alert('Failed to delete ACL')
    }
  }

  const getMacList = () => {
    if (!acl) return []
    return acl.defaultMode === 'deny' ? acl.acceptMacs : acl.denyMacs
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading ACL...</p>
      </div>
    )
  }

  if (!acl) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">ACL not found</h3>
        <div className="mt-6">
          <Link
            href="/r710-portal/acl"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Back to ACL List
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/r710-portal/acl" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {editing ? 'Edit ACL' : acl.name}
              </h1>
              {!editing && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    acl.defaultMode === 'deny' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {acl.defaultMode === 'deny' ? 'Whitelist (Allow Only)' : 'Blacklist (Deny)'}
                  </span>
                  {!acl.editable && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      System
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {!editing && acl.editable && isSystemAdmin(user) && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* View Mode */}
      {!editing && (
        <div className="space-y-6">
          {/* Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{acl.description}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Device IP</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{acl.ipAddress || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Mode</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {acl.defaultMode === 'deny' ? 'Whitelist (Allow Only Listed MACs)' : 'Blacklist (Deny Listed MACs)'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total MACs</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{getMacList().length}</dd>
              </div>
            </dl>
          </div>

          {/* MAC Addresses */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {acl.defaultMode === 'deny' ? 'Allowed' : 'Blocked'} MAC Addresses
            </h2>
            {getMacList().length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No MAC addresses in this list</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        MAC Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Comment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Added By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {getMacList().map((entry, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                          {entry.mac}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {entry.macComment || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {entry.createdBy?.name || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {editing && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ACL Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mode (cannot be changed after creation)
                </label>
                <div className={`p-4 border-2 rounded-lg ${
                  formData.mode === 'deny' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {formData.mode === 'deny' ? '✅ Whitelist (Allow Only)' : '🚫 Blacklist (Deny)'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAC Addresses */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">MAC Addresses</h2>
              <button
                type="button"
                onClick={handleAddMac}
                className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add MAC
              </button>
            </div>

            {macEntries.length > 0 ? (
              <div className="space-y-3">
                {macEntries.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={entry.mac}
                        onChange={(e) => handleMacChange(index, 'mac', e.target.value.toUpperCase())}
                        onBlur={(e) => {
                          const formatted = formatMacAddress(e.target.value)
                          handleMacChange(index, 'mac', formatted)
                        }}
                        placeholder="XX:XX:XX:XX:XX:XX"
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                      />
                      <input
                        type="text"
                        value={entry.macComment || ''}
                        onChange={(e) => handleMacChange(index, 'macComment', e.target.value)}
                        placeholder="Comment (optional)"
                        maxLength={31}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMac(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No MAC addresses. Add some using the button above.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setEditing(false)
                setError('')
                // Reset to original values
                if (acl) {
                  setFormData({
                    name: acl.name,
                    description: acl.description,
                    mode: acl.defaultMode
                  })
                  setMacEntries(acl.defaultMode === 'deny' ? acl.acceptMacs : acl.denyMacs)
                }
              }}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
