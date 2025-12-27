'use client'

import { BusinessProtectedRoute } from '@/components/auth/business-protected-route';
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context';
import { useState, useEffect } from 'react';
import { BusinessSwitcher } from '@/components/business/business-switcher';
import { BusinessCreationModal } from '@/components/user-management/business-creation-modal';
import { BusinessDeletionModal } from '@/components/business/business-deletion-modal';
import BusinessReactivationModal from '@/components/business/business-reactivation-modal';
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
  const { currentBusiness, hasPermission, activeBusinesses, switchBusiness, refreshBusinesses, loading: contextLoading, isSystemAdmin } = useBusinessPermissionsContext();
  const toast = useToastContext()
  const router = useRouter()
  const [showCreateBusiness, setShowCreateBusiness] = useState(false)
  const [showEditBusiness, setShowEditBusiness] = useState(false)
  const [showDeleteBusiness, setShowDeleteBusiness] = useState(false)
  const [showReactivateBusiness, setShowReactivateBusiness] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editBusinessInitial, setEditBusinessInitial] = useState<{
    name?: string
    type?: string
    description?: string
    address?: string
    phone?: string
    receiptReturnPolicy?: string
    taxIncludedInPrice?: boolean
    taxRate?: string
    taxLabel?: string
  } | null>(null)
  const [editBusinessId, setEditBusinessId] = useState<string | null>(null)
  const { format: globalDateFormat } = useDateFormat();
  
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  const [editingMember, setEditingMember] = useState<BusinessMember | null>(null);
  const [editMemberRole, setEditMemberRole] = useState('');
  const [updatingMember, setUpdatingMember] = useState(false);
  const [inactiveBusinessCount, setInactiveBusinessCount] = useState(0);
  const customAlert = useAlert();

  useEffect(() => {
    if (currentBusiness?.businessId) {
      setMembersLoading(true);
      fetchMembers();
    }
  }, [currentBusiness?.businessId]);

  useEffect(() => {
    if (isSystemAdmin) {
      fetchInactiveBusinessCount();
    }
  }, [isSystemAdmin]);

  const fetchInactiveBusinessCount = async () => {
    try {
      const response = await fetch('/api/admin/businesses/inactive');
      if (response.ok) {
        const data = await response.json();
        setInactiveBusinessCount(data.length);
      }
    } catch (error) {
      console.error('Failed to fetch inactive business count:', error);
    }
  };

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

  const handleEditMember = (member: BusinessMember) => {
    setEditingMember(member);
    setEditMemberRole(member.role);
  };

  const updateMemberRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !currentBusiness?.businessId) return;

    setUpdatingMember(true);
    try {
      const response = await fetch(`/api/businesses/${currentBusiness.businessId}/members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editMemberRole }),
      });

      if (response.ok) {
        toast.push('Member role updated successfully');
        setEditingMember(null);
        fetchMembers();
      } else {
        const error = await response.json();
        await customAlert({ title: 'Update failed', description: error.error || 'Failed to update member role' })
      }
    } catch (error) {
      console.error('Failed to update member:', error);
      await customAlert({ title: 'Update failed', description: 'Failed to update member role' })
    } finally {
      setUpdatingMember(false);
    }
  };

  const removeMember = async (memberId: string, memberName: string) => {
    if (!currentBusiness?.businessId) return;

    const confirmed = await customAlert({
      title: 'Remove Member',
      description: `Are you sure you want to remove ${memberName} from this business?`,
      confirmText: 'Remove',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/businesses/${currentBusiness.businessId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.push('Member removed successfully');
        fetchMembers();
      } else {
        const error = await response.json();
        await customAlert({ title: 'Remove failed', description: error.error || 'Failed to remove member' })
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      await customAlert({ title: 'Remove failed', description: 'Failed to remove member' })
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
        toast.push('Member invited successfully');
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
          {/* Admin Quick Links */}
          {isSystemAdmin && (
            <div className="card p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">System Administrator</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    {inactiveBusinessCount > 0
                      ? `Access administrative functions (${inactiveBusinessCount} inactive business${inactiveBusinessCount !== 1 ? 'es' : ''})`
                      : 'Access administrative functions (no inactive businesses)'}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/business/inactive')}
                  disabled={inactiveBusinessCount === 0}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    inactiveBusinessCount === 0
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  🗃️ View Inactive Businesses
                </button>
              </div>
            </div>
          )}

          {/* WiFi Integration */}
          {(currentBusiness?.businessType === 'restaurant' || currentBusiness?.businessType === 'grocery') && currentBusiness?.isActive && (
            <div className="card p-4 mb-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                    📶 WiFi Integration
                  </h3>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-3">
                    Sell WiFi tokens to customers through your POS system
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push('/wifi-portal/setup')}
                      className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      📡 ESP32 WiFi Setup
                    </button>
                    <button
                      onClick={() => router.push('/r710-portal/setup')}
                      className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      📶 R710 WiFi Setup
                      <span className="text-[10px] bg-indigo-500 px-1 py-0.5 rounded">Enterprise</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inactive Business Warning */}
          {!currentBusiness?.isActive && (
            <div className="card p-6 mb-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-2">
                    Business Inactive - Read-Only Mode
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-400 mb-3">
                    This business has been deactivated. All data is preserved but cannot be modified.
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 list-disc list-inside mb-4">
                    <li>Cannot edit business information</li>
                    <li>Cannot add, edit, or remove members</li>
                    <li>Cannot modify products, orders, or inventory</li>
                    <li>Data is viewable but read-only</li>
                  </ul>
                  {isSystemAdmin && (
                    <button
                      onClick={() => setShowReactivateBusiness(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                    >
                      ✨ Reactivate This Business
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

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
                {/* Show reactivation button if business is inactive and user is admin */}
                {isSystemAdmin && !currentBusiness?.isActive && (
                  <button
                    onClick={() => setShowReactivateBusiness(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Reactivate Business
                  </button>
                )}
                
                {/* Only show edit/delete for active businesses */}
                {currentBusiness?.isActive && (
                  <>
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
                              description: biz?.businessDescription || '',
                              address: biz?.address || '',
                              phone: biz?.phone || '',
                              receiptReturnPolicy: biz?.receiptReturnPolicy || 'All sales are final, returns not accepted',
                              taxIncludedInPrice: biz?.taxIncludedInPrice !== undefined ? biz.taxIncludedInPrice : true,
                              taxRate: biz?.taxRate ? String(biz.taxRate) : '',
                              taxLabel: biz?.taxLabel || ''
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="card">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Team Members</h2>
                {hasPermission('canInviteUsers') && currentBusiness?.isActive && (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {membersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Loading members...
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {member.user?.name || 'Unknown User'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {member.user?.email || 'No email'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded capitalize">
                            {member.role?.replace('-', ' ') || 'No role'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDateByFormat(member.joinedAt, globalDateFormat)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {hasPermission('canEditUserPermissions') && currentBusiness?.isActive && (
                            <button 
                              onClick={() => handleEditMember(member)}
                              className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                            >
                              Edit
                            </button>
                          )}
                          {hasPermission('canRemoveUsers') && member.role !== 'business-owner' && currentBusiness?.isActive && (
                            <button 
                              onClick={() => removeMember(member.id, member.user?.name || 'Unknown User')}
                              className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                            >
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

          {/* Invite Form - Only show for active businesses */}
          {hasPermission('canInviteUsers') && currentBusiness?.isActive && (
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
            // Close modal immediately to prevent it from blocking renders
            setShowEditBusiness(false)
            
            try {
              if (result?.message) {
                toast.push(result.message)
              }
              
              // Store the ID before async operations
              const bizIdToRefresh = editBusinessId
              
              // Give database time to commit
              await new Promise(resolve => setTimeout(resolve, 150))
              
              // Refresh memberships to get updated business name
              await refreshBusinesses()
              
              // Give React time to propagate state changes
              await new Promise(resolve => setTimeout(resolve, 100))
              
              // Switch to force re-render (creates new array in context)
              if (bizIdToRefresh) {
                try {
                  await switchBusiness(bizIdToRefresh)
                } catch (e) {
                  console.error('Failed to switch after edit:', e)
                }
              }
            } catch (err) {
              console.error('Error handling edit success:', err)
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
          onSuccess={async () => {
            setShowDeleteBusiness(false)
            const deletedBusinessName = currentBusiness.businessName
            
            try {
              // Show initial success message
              toast.push(`${deletedBusinessName} deleted successfully`)
              
              // Refresh the business list to get updated data
              await refreshBusinesses()
              await fetchInactiveBusinessCount() // Update inactive count
              
              // Wait a bit for context to fully update
              await new Promise(resolve => setTimeout(resolve, 200))
              
              // Navigate to dashboard - it will handle business selection properly
              router.push('/dashboard')
            } catch (err) {
              console.error('Failed to refresh businesses after deletion:', err)
              toast.push('Business deleted. Please refresh the page.')
              router.push('/dashboard')
            }
          }}
          onError={(error) => {
            toast.push(error)
            setShowDeleteBusiness(false)
          }}
        />
      )}

      {/* Business Reactivation Modal */}
      {showReactivateBusiness && currentBusiness?.businessId && currentBusiness?.businessName && (
        <BusinessReactivationModal
          business={{
            id: currentBusiness.businessId,
            name: currentBusiness.businessName,
            type: currentBusiness.businessType || 'other'
          }}
          onClose={() => setShowReactivateBusiness(false)}
          onSuccess={async () => {
            setShowReactivateBusiness(false)
            toast.push('Business reactivated successfully')
            // Refresh the business context to show updated active status and update sidebar
            try {
              await refreshBusinesses()
              await fetchInactiveBusinessCount() // Update inactive count
              toast.push('Business list updated')
            } catch (e) {
              console.error('Failed to refresh businesses after reactivation:', e)
            }
          }}
        />
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Member Role
                </h2>
                <button
                  onClick={() => setEditingMember(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
            </div>
            <form onSubmit={updateMemberRole} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Member
                </label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {editingMember.user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {editingMember.user?.name || 'Unknown User'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {editingMember.user?.email || 'No email'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={editMemberRole}
                  onChange={(e) => setEditMemberRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  required
                >
                  <option value="employee">Employee</option>
                  <option value="business-manager">Business Manager</option>
                  <option value="read-only">Read Only</option>
                  {hasPermission('canManageBusinessUsers') && (
                    <option value="business-owner">Business Owner</option>
                  )}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  disabled={updatingMember}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingMember}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingMember ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function BusinessManagePageWithProtection() {
  const { isSystemAdmin, hasPermission } = useBusinessPermissionsContext();

  // Allow access if user is system admin OR has the required business permissions
  const hasAccess = isSystemAdmin || (hasPermission('canViewBusiness') && hasPermission('canViewUsers'));

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access business management.
          </p>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <BusinessManagePageContent />;
}

export default function BusinessManagePage() {
  return <BusinessManagePageWithProtection />;
}