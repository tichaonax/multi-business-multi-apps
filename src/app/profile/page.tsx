'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { SessionUser } from '@/lib/permission-utils'
import { EmployeeContractViewer } from '@/components/contracts/employee-contract-viewer'
import { PolicyViewer } from '@/components/policies/PolicyViewer'

const CATEGORY_LABELS: Record<string, string> = {
  HR: 'HR', SAFETY: 'Safety', IT: 'IT', FINANCE: 'Finance', CODE_OF_CONDUCT: 'Code of Conduct', OTHER: 'Other',
}

interface PolicyAck {
  id: string
  policyId: string
  policyVersion: number
  acknowledgedAt: string
  disclaimerSnapshot: string | null
  business: { id: string; name: string }
  policy: { id: string; title: string; category: string; contentType: string } | null
  versionContent: string | null
  versionFileId: string | null
}

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  businessMemberships: Array<{
    businessId: string
    role: string
    isActive: boolean
    business: {
      id: string
      name: string
      type: string
    }
    template?: {
      id: string
      name: string
    }
  }>
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [policyAcks, setPolicyAcks] = useState<PolicyAck[]>([])
  const [viewingAck, setViewingAck] = useState<PolicyAck | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/user/profile`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          name: data.name,
          email: data.email
        })
      } else {
        setError('Failed to load profile')
      }
    } catch (error) {
      setError('Error loading profile')
    } finally {
      setLoading(false)
    }

    try {
      const res = await fetch(`/api/policies/user/${session.user.id}`)
      if (res.ok) setPolicyAcks(await res.json())
    } catch {}
  }

  const handlePrintSignedSummary = (ack: PolicyAck) => {
    const win = window.open('', '_blank')
    if (!win) return
    const title = ack.policy?.title ?? 'Policy'
    const date = new Date(ack.acknowledgedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
    const disclaimer = ack.disclaimerSnapshot ?? ''
    win.document.write(`
      <!DOCTYPE html><html><head><title>Policy Acknowledgment — ${title}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; color: #111; line-height: 1.6; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { font-size: 13px; color: #555; margin-bottom: 24px; }
        .divider { border-top: 1px solid #ccc; margin: 20px 0; }
        .label { font-size: 12px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: .05em; }
        .value { font-size: 15px; margin-bottom: 16px; }
        .disclaimer { background: #f5f5f5; border: 1px solid #ddd; padding: 16px; font-size: 13px; font-style: italic; border-radius: 4px; }
        .footer { margin-top: 40px; font-size: 12px; color: #888; }
        @media print { body { margin: 20mm; } }
      </style></head><body>
      <h1>Policy Acknowledgment Record</h1>
      <p class="meta">This document confirms that the employee named below has read and acknowledged the policy.</p>
      <div class="divider"></div>
      <div class="label">Policy</div><div class="value">${title} (Version ${ack.policyVersion})</div>
      <div class="label">Category</div><div class="value">${CATEGORY_LABELS[ack.policy?.category ?? ''] ?? ack.policy?.category ?? '—'}</div>
      <div class="label">Business</div><div class="value">${ack.business?.name ?? '—'}</div>
      <div class="label">Employee</div><div class="value">${(session as any)?.user?.name ?? '—'}</div>
      <div class="label">Date &amp; Time Acknowledged</div><div class="value">${date}</div>
      <div class="divider"></div>
      <div class="label">Acknowledgment Statement</div>
      <div class="disclaimer">${disclaimer}</div>
      <div class="footer">Generated ${new Date().toLocaleString('en-GB')} · Multi-Business Management Platform</div>
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (response.ok) {
        setSuccess('Profile updated successfully')
        setProfile({ ...profile!, ...formData })
        setEditing(false)
        // Update the session with new name
        await update({ name: formData.name })
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      setError('Error updating profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !profile) {
    return (
      <ContentLayout title="Profile Settings">
        <div className="card">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading profile...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  if (!profile) {
    return (
      <ContentLayout title="Profile Settings">
        <div className="card">
          <div className="text-center py-8">
            <p className="text-gray-600">Profile not found</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout 
      title="Profile Settings"
      subtitle="Manage your account information and preferences"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Profile Settings', isActive: true }
      ]}
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <span className="text-red-400 mr-2">⚠️</span>
            <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <span className="text-green-400 mr-2">✅</span>
            <span className="text-green-700 dark:text-green-400 text-sm">{success}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Basic Information
              </h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{profile.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <p className="text-gray-900 dark:text-white">{profile.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Email changes require administrative approval
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  System Role
                </label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Status
                </label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {profile.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {editing && (
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setEditing(false)
                    setFormData({
                      name: profile.name,
                      email: profile.email
                    })
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Business Memberships */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Business Access
            </h3>
            
            {profile.businessMemberships.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                You don't have access to any businesses yet.
              </p>
            ) : (
              <div className="space-y-4">
                {profile.businessMemberships.map((membership) => (
                  <div
                    key={membership.businessId}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      membership.isActive 
                        ? 'bg-white dark:bg-gray-700 border-green-200 dark:border-green-600' 
                        : 'bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-500'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {membership.businesses.name}
                        </h4>
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {membership.businesses.type}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          membership.isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {membership.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Role: <span className="font-medium">
                          {membership.template?.name || membership.role}
                        </span>
                        {membership.template && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            Template
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Employee Contracts */}
        <EmployeeContractViewer />

        {/* My Policy Agreements */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              My Policy Agreements
            </h3>

            {policyAcks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No policy acknowledgments on record.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Policy</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Business</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Version</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Date Acknowledged</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {policyAcks.map(ack => (
                      <tr key={ack.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{ack.policy?.title ?? '—'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{CATEGORY_LABELS[ack.policy?.category ?? ''] ?? ack.policy?.category}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{ack.business?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">v{ack.policyVersion}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                          {new Date(ack.acknowledgedAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            {(ack.versionContent || ack.versionFileId) && (
                              <button
                                onClick={() => setViewingAck(ack)}
                                className="text-xs px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                View
                              </button>
                            )}
                            <button
                              onClick={() => handlePrintSignedSummary(ack)}
                              className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              Print Summary
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Policy view modal */}
        {viewingAck && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{viewingAck.policy?.title}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {CATEGORY_LABELS[viewingAck.policy?.category ?? ''] ?? viewingAck.policy?.category} · Version {viewingAck.policyVersion} · {viewingAck.business?.name}
                  </p>
                </div>
                <button onClick={() => setViewingAck(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold ml-4">×</button>
              </div>
              <PolicyViewer
                content={viewingAck.versionContent}
                fileId={viewingAck.versionFileId}
                contentType={viewingAck.policy?.contentType as any}
                onScrolledToEnd={() => {}}
                hasScrolledToEnd={true}
              />
              <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <button
                  onClick={() => handlePrintSignedSummary(viewingAck)}
                  className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Print Signed Summary
                </button>
                <button onClick={() => setViewingAck(null)} className="text-sm px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account Information */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Account Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Created
                </label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(profile.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Memberships
                </label>
                <p className="text-gray-900 dark:text-white">
                  {profile.businessMemberships.filter(m => m.isActive).length} active, {' '}
                  {profile.businessMemberships.length} total
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContentLayout>
  )
}