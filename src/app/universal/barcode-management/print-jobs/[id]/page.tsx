'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAlert, useConfirm } from '@/components/ui/confirm-modal';

export default function PrintJobDetailsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const alert = useAlert();
  const confirm = useConfirm();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/universal/barcode-management/print-jobs/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJob(data);
      } else {
        await alert({
          title: 'Error',
          description: 'Print job not found',
        });
        router.push('/universal/barcode-management/print-jobs');
      }
    } catch (error) {
      console.error('Error fetching print job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async () => {
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
        fetchJob(); // Refresh job data
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading print job...</p>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/universal/barcode-management/print-jobs"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Print Queue
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Print Job Details
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Job ID: {job.id}
              </p>
            </div>
            <span className={`px-4 py-2 text-sm font-medium rounded ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
          </div>
        </div>

        {/* Job Information */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Job Information
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Item Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.itemName || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Item Type</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.itemType || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Barcode Data</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">{job.barcodeData || 'N/A'}</code>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Business</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.business?.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Requested Quantity</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.requestedQuantity}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Printed Quantity</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.printedQuantity}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created By</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.createdBy?.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDateTime(job.createdAt)}</dd>
              </div>
              {job.completedAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed At</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDateTime(job.completedAt)}</dd>
                </div>
              )}
            </dl>
            {job.errorMessage && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 rounded-lg">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Error Message:</p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{job.errorMessage}</p>
              </div>
            )}
          </div>

          {/* Template Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Template Information
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Template Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.template?.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Symbology</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.template?.symbology}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Template ID</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  <Link
                    href={`/universal/barcode-management/templates/${job.template?.id}`}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {job.template?.id}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          {/* Printer Info */}
          {job.printer && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Printer Information
              </h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Printer Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.printer.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Printer Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.printer.type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Printer Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.printer.status}</dd>
                </div>
                {job.printer.location && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.printer.location}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Print Settings Snapshot */}
          {job.printSettings && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Print Settings
              </h2>
              <pre className="text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto">
                {JSON.stringify(job.printSettings, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href="/universal/barcode-management/print-jobs"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Back to Queue
            </Link>
            {(job.status === 'QUEUED' || job.status === 'PRINTING') && (
              <button
                onClick={handleCancelJob}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Cancel Job
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
