'use client';


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAlert, useConfirm } from '@/components/ui/confirm-modal';

interface DashboardStats {
  totalTemplates: number;
  totalPrintJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeInventoryItems: number;
}

interface RecentActivity {
  id: string;
  type: 'template' | 'print_job' | 'inventory_item';
  action: string;
  description: string;
  timestamp: string;
  businessName?: string;
  itemName?: string;
  barcodeData?: string;
  templateName?: string;
  requestedQuantity?: number;
  printedQuantity?: number;
  fullBusinessName?: string;
}

export default function BarcodeManagementDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const alert = useAlert();
  const confirm = useConfirm();
  const [stats, setStats] = useState<DashboardStats>({
    totalTemplates: 0,
    totalPrintJobs: 0,
    queuedJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    activeInventoryItems: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (businesses.length > 0) {
      fetchDashboardData();
    }
  }, [selectedBusinessId, businesses]);

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/user/business-memberships');
      if (response.ok) {
        const memberships = await response.json();
        // Transform memberships to business format
        const businessList = memberships.map((m: any) => ({
          id: m.businessId,
          name: m.businessName,
          type: m.businessType,
        }));
        setBusinesses(businessList);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBusinessId !== 'all') {
        params.append('businessId', selectedBusinessId);
      }

      // Fetch templates
      const templatesRes = await fetch(`/api/universal/barcode-management/templates?${params}&limit=100`);
      const templatesData = await templatesRes.json();

      // Fetch print jobs
      const jobsRes = await fetch(`/api/universal/barcode-management/print-jobs?${params}&limit=100`);
      const jobsData = await jobsRes.json();

      // Fetch inventory items
      const inventoryRes = await fetch(`/api/universal/barcode-management/inventory-items?${params}&limit=100`);
      const inventoryData = await inventoryRes.json();

      // Calculate stats
      const printJobs = jobsData.printJobs || [];
      setStats({
        totalTemplates: templatesData.pagination?.total || 0,
        totalPrintJobs: jobsData.pagination?.total || 0,
        queuedJobs: printJobs.filter((j: any) => j.status === 'QUEUED').length,
        completedJobs: printJobs.filter((j: any) => j.status === 'COMPLETED').length,
        failedJobs: printJobs.filter((j: any) => j.status === 'FAILED').length,
        activeInventoryItems: (inventoryData.inventoryItems || []).filter((i: any) => i.isActive).length,
      });

      // Build recent activity from print jobs with full details
      const activity: RecentActivity[] = printJobs.slice(0, 10).map((job: any) => ({
        id: job.id,
        type: 'print_job',
        action: job.status,
        description: `${job.itemName || 'Item'} - ${job.requestedQuantity} labels`,
        timestamp: job.createdAt,
        businessName: job.business?.shortName || job.business?.name,
        itemName: job.itemName,
        barcodeData: job.barcodeData,
        templateName: job.template?.name,
        requestedQuantity: job.requestedQuantity,
        printedQuantity: job.printedQuantity,
        fullBusinessName: job.business?.name,
      }));

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'QUEUED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'PRINTING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleCleanup = async () => {
    const confirmed = await confirm({
      title: 'Delete Old Print Jobs',
      description: 'This will permanently delete all print jobs older than 4 months. This action cannot be undone.',
      confirmText: 'Yes, delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const response = await fetch('/api/universal/barcode-management/cleanup', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        await alert({
          title: 'Cleanup Complete',
          description: `Successfully purged ${data.deletedCount} print jobs older than 4 months.`,
        });
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        await alert({
          title: 'Error',
          description: data.error || 'Failed to cleanup print jobs',
        });
      }
    } catch (error) {
      console.error('Error cleaning up print jobs:', error);
      await alert({
        title: 'Error',
        description: 'Failed to cleanup print jobs. Please try again.',
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Barcode Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage barcode templates, print jobs, and inventory linkages
          </p>
        </div>

        {/* Business Filter */}
        <div className="mb-6">
          <label htmlFor="business-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Business
          </label>
          <select
            id="business-filter"
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2.5 px-3"
          >
            <option value="all">All Businesses</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Templates</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTemplates}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Queued Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.queuedJobs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completedJobs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failedJobs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Inventory</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeInventoryItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">🖨️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Print Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPrintJobs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              href="/universal/barcode-management/templates/new"
              className="flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors"
            >
              <span className="mr-2">➕</span>
              Create Template
            </Link>
            <Link
              href="/universal/barcode-management/templates"
              className="flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition-colors"
            >
              <span className="mr-2">📋</span>
              View Templates
            </Link>
            <Link
              href="/universal/barcode-management/print-jobs"
              className="flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow transition-colors"
            >
              <span className="mr-2">🖨️</span>
              Print Queue
            </Link>
            <Link
              href="/universal/barcode-management/reports"
              className="flex items-center justify-center px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition-colors"
            >
              <span className="mr-2">📊</span>
              View Reports
            </Link>
            <button
              onClick={handleCleanup}
              disabled={isCleaningUp}
              className="flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="mr-2">🗑️</span>
              {isCleaningUp ? 'Cleaning...' : 'Cleanup Old Jobs'}
            </button>
          </div>
        </div>

        {/* Recent Print Jobs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Print Jobs</h2>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              No recent print jobs
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Item Name
                    </th>
                    {selectedBusinessId === 'all' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Business
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Template SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {recentActivity.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.itemName || 'Unknown Item'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {activity.id.substring(0, 8)}...
                        </div>
                      </td>
                      {selectedBusinessId === 'all' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {activity.fullBusinessName}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900 dark:text-white">
                          {activity.barcodeData}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.templateName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(activity.action)}`}>
                          {activity.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {activity.printedQuantity} / {activity.requestedQuantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatTimestamp(activity.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
