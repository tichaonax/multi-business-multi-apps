'use client'

import { BusinessProtectedRoute } from '@/components/auth/business-protected-route';
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context';
import { useState, useEffect } from 'react';
import { BusinessSwitcher } from '@/components/business/business-switcher';
import { BusinessCreationModal } from '@/components/user-management/business-creation-modal';
import { BusinessDeletionModal } from '@/components/business/business-deletion-modal';
import { useToastContext } from '@/components/ui/toast'
import { ContentLayout } from '@/components/layout/content-layout';
import { formatDateByFormat } from '@/lib/country-codes';
import { useDateFormat } from '@/contexts/settings-context';
import { useAlert } from '@/components/ui/confirm-modal'
import { useRouter } from 'next/navigation'

interface BusinessMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: string;
  permissions: any;
  isActive: boolean;
  joinedAt: string;
}

function BusinessManagePageContent() {
  const { currentBusiness, hasPermission, activeBusinesses, switchBusiness, loading: contextLoading, isSystemAdmin } = useBusinessPermissionsContext();
  const toast = useToastContext()
  const router = useRouter()
  const [showCreateBusiness, setShowCreateBusiness] = useState(false)
  const [showEditBusiness, setShowEditBusiness] = useState(false)
  const [showDeleteBusiness, setShowDeleteBusiness] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editBusinessInitial, setEditBusinessInitial] = useState<{ name?: string; type?: string; description?: string } | null>(null)
  const [editBusinessId, setEditBusinessId] = useState<string | null>(null)
  const { format: globalDateFormat } = useDateFormat();
  
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  const customAlert = useAlert();

  useEffect(() => {
    if (currentBusiness?.businessId) {
      setMembersLoading(true);
      fetchMembers();
    }
  }, [currentBusiness?.businessId]);


  const fetchMembers = async () => {
    if (!currentBusiness?.businessId) return;
    
    try {
      const response = await fetch(`/api/businesses/${currentBusiness.businessId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      } else {
        console.error('Failed to fetch members:', await response.text());
        setMembers([]);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !currentBusiness?.businessId) return;

    setInviting(true);
    try {
      const response = await fetch(`/api/businesses/${currentBusiness.businessId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (response.ok) {
        setInviteEmail('');
        setInviteRole('employee');
        fetchMembers();
      } else {
        const error = await response.json();
        await customAlert({ title: 'Invite failed', description: error.error || 'Failed to invite member' })
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
      await customAlert({ title: 'Invite failed', description: 'Failed to invite member' })
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <ContentLayout
        title="🏢 Business Management"
        subtitle={`Manage ${currentBusiness?.businessName} members and settings`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Business', isActive: true }
        ]}
        headerActions={
          <div className="flex items-center space-x-3">
            <BusinessSwitcher 
              currentBusiness={currentBusiness}
              businesses={activeBusinesses}
              onSwitch={switchBusiness}
              loading={contextLoading}
            />
            {isSystemAdmin && (
              <button
                onClick={() => setShowCreateBusiness(true)}
                className="btn-secondary"
              >
                + Add Business
              </button>
            )}
          </div>
        }
      >

          {/* Business Info */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-primary">Business Information</h2>
            <div className="flex justify-between items-start">
              <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business Name</label>
                    <p className="mt-1 text-lg text-gray-900 dark:text-white">{currentBusiness?.businessName}</p>
                    {currentBusiness?.businessName.includes('[Demo]') && (
                      <span className="inline-flex items-center mt-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full">
                        Demo Business
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Role</label>
                    <p className="mt-1 text-lg capitalize text-gray-900 dark:text-white">
                      {currentBusiness?.role?.replace('-', ' ')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex flex-col gap-2">
                {(isSystemAdmin || hasPermission('canEditBusiness')) && (
                  <button
                    onClick={async () => {
                      // Fetch full business config (includes description) before opening edit modal
                      const id = currentBusiness?.businessId
                      if (!id) return
                      try {
                        setEditLoading(true)
                        const res = await fetch(`/api/universal/business-config?businessId=${encodeURIComponent(id)}`)
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}))
                          toast.push(err?.error || 'Failed to load business details')
                          return
                        }
                        const json = await res.json()
                        const biz = json?.data
                        setEditBusinessInitial({
                          name: biz?.businessName || currentBusiness?.businessName || '',
                          type: biz?.businessType || currentBusiness?.businessType || 'other',
                          description: biz?.businessDescription || ''
                        })
                        setEditBusinessId(id)
                        setShowEditBusiness(true)
                      } catch (err) {
                        console.error('Failed to fetch business details for edit:', err)
                        toast.push('Failed to load business details')
                      } finally {
                        setEditLoading(false)
                      }
                    }}
                    className="btn-secondary"
                    disabled={editLoading}
                  >
                    {editLoading ? 'Loading...' : 'Edit Business'}
                  </button>
                )}
                {isSystemAdmin && hasPermission('canDeleteBusiness') && (
                  <button
                    onClick={() => setShowDeleteBusiness(true)}
                    className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Delete Business
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="card">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Team Members</h2>
                {hasPermission('canInviteUsers') && (
                  <button
                    onClick={() => document.getElementById('invite-form')?.scrollIntoView()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Invite Member
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-neutral-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {membersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Loading members...
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {member.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.user.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded capitalize">
                            {member.role.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateByFormat(member.joinedAt, globalDateFormat)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {hasPermission('canEditUserPermissions') && (
                            <button className="text-blue-600 hover:text-blue-500 mr-3">
                              Edit
                            </button>
                          )}
                          {hasPermission('canRemoveUsers') && member.role !== 'business-owner' && (
                            <button className="text-red-600 hover:text-red-500">
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invite Form */}
          {hasPermission('canInviteUsers') && (
            <div id="invite-form" className="card p-6">
              <h2 className="text-xl font-semibold mb-4">Invite New Member</h2>
              <form onSubmit={inviteMember} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="member@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="employee">Employee</option>
                      <option value="business-manager">Business Manager</option>
                      <option value="read-only">Read Only</option>
                      {hasPermission('canManageBusinessUsers') && (
                        <option value="business-owner">Business Owner</option>
                      )}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? 'Inviting...' : 'Send Invitation'}
                </button>
              </form>
            </div>
          )}
      </ContentLayout>
      {/* Business Creation Modal */}
      {showCreateBusiness && (
        <BusinessCreationModal
          onClose={() => setShowCreateBusiness(false)}
          onSuccess={async (result) => {
            try {
              if (result?.message) {
                toast.push(result.message)
              }
              const newBusinessId = result?.business?.id || result?.business?.businessId
              if (newBusinessId) {
                // Attempt to switch to the newly-created business. The provider will
                // refresh memberships or use the admin path as needed.
                await switchBusiness(newBusinessId)
                toast.push('Switched to newly-created business')
              }
            } catch (err) {
              console.error('Failed to switch to new business:', err)
              toast.push('Business created but failed to switch')
            } finally {
              setShowCreateBusiness(false)
            }
          }}
          onError={(error) => {
            toast.push(error)
          }}
        />
      )}
      {/* Business Edit Modal (pre-fill + submit via PUT) */}
      {showEditBusiness && editBusinessInitial && editBusinessId && (
        <BusinessCreationModal
          onClose={() => setShowEditBusiness(false)}
          onSuccess={async (result) => {
            try {
              if (result?.message) {
                toast.push(result.message)
              }
              // After edit, refresh memberships/current business display if possible
              if (editBusinessId) {
                try {
                  await switchBusiness(editBusinessId)
                } catch (e) {
                  // switching is best-effort; ignore failures but log
                  console.error('Failed to refresh/switch after edit:', e)
                }
              }
            } catch (err) {
              console.error('Error handling edit success:', err)
            } finally {
              setShowEditBusiness(false)
            }
          }}
          onError={(error) => {
            toast.push(error)
          }}
          initial={editBusinessInitial}
          method="PUT"
          id={editBusinessId}
        />
      )}

      {/* Business Deletion Modal */}
      {showDeleteBusiness && currentBusiness?.businessId && (
        <BusinessDeletionModal
          businessId={currentBusiness.businessId}
          onClose={() => setShowDeleteBusiness(false)}
          onSuccess={() => {
            setShowDeleteBusiness(false)
            toast.push('Business deleted successfully')
            // Redirect to dashboard since current business is gone
            router.push('/dashboard')
          }}
          onError={(error) => {
            toast.push(error)
            setShowDeleteBusiness(false)
          }}
        />
      )}
    </>
  );
}

export default function BusinessManagePage() {
  return (
    <BusinessProtectedRoute 
      requiredPermissions={['canViewBusiness', 'canViewUsers']}
    >
      <BusinessManagePageContent />
    </BusinessProtectedRoute>
  );
}