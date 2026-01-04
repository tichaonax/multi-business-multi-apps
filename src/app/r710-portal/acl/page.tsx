'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { isSystemAdmin } from '@/lib/permission-utils'
import Link from 'next/link'

interface AclMacEntry {
  mac: string
  macComment?: string
}

interface AclList {
  id: string
  name: string
  description: string
  defaultMode: 'allow' | 'deny'
  denyMacs: AclMacEntry[]
  acceptMacs: AclMacEntry[]
  editable: boolean
  ipAddress?: string
}

export default function R710AclPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <R710AclContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function R710AclContent() {
  const { data: session } = useSession()
  const { currentBusiness } = useBusinessPermissionsContext()
  const user = session?.user as any
  const [aclLists, setAclLists] = useState<AclList[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadAclLists()
  }, [currentBusiness?.businessId])

  const loadAclLists = async () => {
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
        setAclLists(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load ACL lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (aclId: string, aclName: string) => {
    if (!confirm(`Are you sure you want to delete ACL "${aclName}"? This cannot be undone.`)) {
      return
    }

    try {
      setDeleting(aclId)

      const params = new URLSearchParams({
        businessId: currentBusiness?.businessId || ''
      })

      const response = await fetch(`/api/r710/acl/${aclId}?${params.toString()}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        await loadAclLists()
      } else {
        const error = await response.json()
        alert(`Failed to delete ACL: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to delete ACL:', error)
      alert('Failed to delete ACL')
    } finally {
      setDeleting(null)
    }
  }

  const getModeDisplay = (mode: 'allow' | 'deny') => {
    return mode === 'deny' ? 'Whitelist (Allow Only)' : 'Blacklist (Deny)'
  }

  const getModeColor = (mode: 'allow' | 'deny') => {
    return mode === 'deny' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  }

  const getMacCount = (acl: AclList) => {
    return acl.defaultMode === 'deny' ? acl.acceptMacs.length : acl.denyMacs.length
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <Link href="/r710-portal" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                📶 MAC Access Control Lists
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage device whitelists and blacklists for R710 WLANs
            </p>
          </div>

          {isSystemAdmin(user) && (
            <Link
              href="/r710-portal/acl/create"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create ACL
            </Link>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading ACL lists...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && aclLists.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No ACL lists</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new MAC access control list.
          </p>
          {isSystemAdmin(user) && (
            <div className="mt-6">
              <Link
                href="/r710-portal/acl/create"
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create ACL
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ACL Lists */}
      {!loading && aclLists.length > 0 && (
        <div className="space-y-4">
          {aclLists.map((acl) => (
            <div
              key={acl.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {acl.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getModeColor(acl.defaultMode)}`}>
                        {getModeDisplay(acl.defaultMode)}
                      </span>
                      {!acl.editable && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          System
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {acl.description}
                    </p>

                    {/* Stats */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">MAC Addresses</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{getMacCount(acl)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Mode</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {acl.defaultMode === 'deny' ? 'Whitelist' : 'Blacklist'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Device</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {acl.ipAddress || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/r710-portal/acl/${acl.id}`}
                      className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </Link>

                    {acl.editable && isSystemAdmin(user) && (
                      <button
                        onClick={() => handleDelete(acl.id, acl.name)}
                        disabled={deleting === acl.id}
                        className="inline-flex items-center px-3 py-2 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting === acl.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 dark:border-red-300 mr-1"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
