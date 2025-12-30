'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAlert, useConfirm, usePrompt } from '@/components/ui/confirm-modal';

interface PrintJob {
  id: string;
  status: string;
  itemType: string;
  itemName: string;
  requestedQuantity: number;
  printedQuantity: number;
  barcodeData: string;
  template: {
    id: string;
    name: string;
    symbology: string;
  };
  business: {
    id: string;
    name: string;
    shortName: string;
  };
  printer: {
    id: string;
    name: string;
    type: string;
  } | null;
  createdBy: {
    name: string;
  };
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export default function PrintJobsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const alert = useAlert();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (businesses.length > 0) {
      fetchPrintJobs();
    }
  }, [selectedBusinessId, selectedStatus, pagination.page, businesses]);

  // Auto-refresh every 3 seconds to show updated job statuses (silent mode - no loading flash)
  useEffect(() => {
    const interval = setInterval(() => {
      if (businesses.length > 0) {
        fetchPrintJobs(true); // Silent refresh - no loading state
      }
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [selectedBusinessId, selectedStatus, pagination.page, businesses]);

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

  const fetchPrintJobs = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (selectedBusinessId !== 'all') params.append('businessId', selectedBusinessId);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`/api/universal/barcode-management/print-jobs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPrintJobs(data.printJobs || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching print jobs:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleCancelJob = async (jobId: string) => {
    const confirmed = await confirm({
      title: 'Cancel Print Job',
      description: 'Are you sure you want to cancel this print job?',
      confirmText: 'Yes, cancel',
      cancelText: 'No, keep it',
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/universal/barcode-management/print-jobs/${jobId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        await alert({
          title: 'Success',
          description: 'Print job cancelled successfully',
        });
        fetchPrintJobs(); // Refresh list
      } else {
        const data = await response.json();
        await alert({
          title: 'Error',
          description: data.error || 'Failed to cancel job',
        });
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      await alert({
        title: 'Error',
        description: 'Failed to cancel job',
      });
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/universal/barcode-management/print-jobs/${jobId}/retry`, {
        method: 'POST',
      });

      if (response.ok) {
        await alert({
          title: 'Success',
          description: 'Print job queued for retry. It will print automatically.',
        });
        fetchPrintJobs(); // Refresh list
      } else {
        const data = await response.json();
        await alert({
          title: 'Error',
          description: data.error || 'Failed to retry job',
        });
      }
    } catch (error) {
      console.error('Error retrying job:', error);
      await alert({
        title: 'Error',
        description: 'Failed to retry job',
      });
    }
  };

  const handleReprintJob = async (jobId: string) => {
    // Find the job to get the original quantity
    const job = printJobs.find(j => j.id === jobId);
    if (!job) return;

    // Ask user for quantity (default to original quantity)
    const quantityInput = await prompt({
      title: 'Reprint Barcode Labels',
      description: `Original quantity: ${job.requestedQuantity}. How many labels would you like to print?`,
      placeholder: 'Enter quantity',
      defaultValue: job.requestedQuantity.toString(),
      inputType: 'number',
      confirmText: 'Print',
      cancelText: 'Cancel',
      validator: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) return 'Quantity must be at least 1';
        if (num > 1000) return 'Quantity cannot exceed 1000';
        return null;
      },
    });

    if (!quantityInput) return; // User cancelled

    const quantity = parseInt(quantityInput) || job.requestedQuantity;

    try {
      // Check if Print to PDF mode is enabled
      const printToPdf = localStorage.getItem('barcodePrintToPdf') === 'true';

      if (printToPdf) {
        // Generate and download PNG file instead of creating a print job
        const response = await fetch('/api/universal/barcode-management/print-jobs/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: job.templateId,
            quantity,
            customData: job.customData,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `barcode-labels-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          await alert({
            title: 'Success',
            description: `PNG file with ${quantity} label${quantity > 1 ? 's' : ''} downloaded successfully.`,
          });
        } else {
          const data = await response.json();
          await alert({
            title: 'Error',
            description: data.error || 'Failed to generate PNG file',
          });
        }
      } else {
        // Normal reprint - create a new print job
        const response = await fetch(`/api/universal/barcode-management/print-jobs/${jobId}/reprint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity }),
        });

        if (response.ok) {
          await alert({
            title: 'Success',
            description: `Reprint job created for ${quantity} label${quantity > 1 ? 's' : ''}. It will print automatically.`,
          });
          fetchPrintJobs(); // Refresh list
        } else {
          const data = await response.json();
          await alert({
            title: 'Error',
            description: data.error || 'Failed to create reprint job',
          });
        }
      }
    } catch (error) {
      console.error('Error reprinting job:', error);
      await alert({
        title: 'Error',
        description: 'Failed to create reprint job',
      });
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const groupedJobs = {
    QUEUED: printJobs.filter((j) => j.status === 'QUEUED'),
    PRINTING: printJobs.filter((j) => j.status === 'PRINTING'),
    COMPLETED: printJobs.filter((j) => j.status === 'COMPLETED'),
    FAILED: printJobs.filter((j) => j.status === 'FAILED'),
    CANCELLED: printJobs.filter((j) => j.status === 'CANCELLED'),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Print Queue
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage and monitor barcode print jobs
            </p>
          </div>
          <Link
            href="/universal/barcode-management"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Back to Barcode Management
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="business-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business
              </label>
              <select
                id="business-filter"
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
              >
                <option value="all">All Businesses</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
              >
                <option value="all">All Statuses</option>
                <option value="QUEUED">Queued</option>
                <option value="PRINTING">Printing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {printJobs.length} of {pagination.total} print jobs
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Queued</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{groupedJobs.QUEUED.length}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Printing</p>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{groupedJobs.PRINTING.length}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Completed</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{groupedJobs.COMPLETED.length}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Failed</p>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{groupedJobs.FAILED.length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Cancelled</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{groupedJobs.CANCELLED.length}</p>
          </div>
        </div>

        {/* Print Jobs List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading print jobs...</p>
          </div>
        ) : printJobs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No print jobs found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Job ID / Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Printer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {printJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {job.itemName || 'Unknown Item'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {job.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {job.template.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {job.template.symbology}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      {job.errorMessage && (
                        <p className="mt-1 text-xs text-red-600">{job.errorMessage}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {job.printedQuantity} / {job.requestedQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {job.printer?.name || 'Not assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(job.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/universal/barcode-management/print-jobs/${job.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View
                        </Link>
                        {(job.status === 'QUEUED' || job.status === 'PRINTING') && (
                          <button
                            onClick={() => handleCancelJob(job.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Cancel
                          </button>
                        )}
                        {(job.status === 'FAILED' || job.status === 'CANCELLED') && (
                          <button
                            onClick={() => handleRetryJob(job.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            Retry
                          </button>
                        )}
                        {job.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleReprintJob(job.id)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            Reprint
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
