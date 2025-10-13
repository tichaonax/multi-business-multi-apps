'use client'

import { BusinessProtectedRoute } from '@/components/auth/business-protected-route';
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context';
import { useState, useEffect } from 'react';
import { BusinessSwitcher } from '@/components/business/business-switcher';
import { ContentLayout } from '@/components/layout/content-layout';
import { formatDateByFormat } from '@/lib/country-codes';
import { useDateFormat } from '@/contexts/settings-context';

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
  const { currentBusiness, hasPermission, activeBusinesses, switchBusiness, loading: contextLoading } = useBusinessPermissionsContext();
  const { format: globalDateFormat } = useDateFormat();
  
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);

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
        alert(error.error || 'Failed to invite member');
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
      alert('Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  return (
      <ContentLayout
        title="🏢 Business Management"
        subtitle={`Manage ${currentBusiness?.businessName} members and settings`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Business', isActive: true }
        ]}
        headerActions={
          <BusinessSwitcher 
            currentBusiness={currentBusiness}
            businesses={activeBusinesses}
            onSwitch={switchBusiness}
            loading={contextLoading}
          />
        }
      >

          {/* Business Info */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-primary">Business Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Name</label>
                <p className="mt-1 text-lg">{currentBusiness?.businessName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Role</label>
                <p className="mt-1 text-lg capitalize">
                  {currentBusiness?.role?.replace('-', ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white rounded-lg shadow-md">
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
                <thead className="bg-gray-50">
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
                              {member.users.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.users.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.users.email}
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
            <div id="invite-form" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Invite New Member</h2>
              <form onSubmit={inviteMember} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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