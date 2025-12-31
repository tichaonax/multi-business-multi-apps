'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAlert, useConfirm, usePrompt } from '@/components/ui/confirm-modal';
import { fitTemplateName } from '@/lib/text-abbreviation';
import { Barcode, X } from 'lucide-react';
import { globalBarcodeService } from '@/lib/services/global-barcode-service';

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
    batchId?: string;
  };
  business: {
    id: string;
    name: string;
    shortName: string;
  };
  printer: {
    id: string;
    printerName: string;
    printerType: string;
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [printToPdf, setPrintToPdf] = useState(false); // Default to printer mode
  const [showPrinterSelect, setShowPrinterSelect] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [currentReprintJob, setCurrentReprintJob] = useState<PrintJob | null>(null);

  // Barcode scanner support (same as templates page)
  const barcodeBufferRef = useRef<string>('');
  const lastKeypressTimeRef = useRef<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchBusinesses();
    // Scroll to top when page loads (especially after creating a new print job)
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Disable global barcode service when on this page
    // Save the current state so we can restore it
    const wasEnabled = globalBarcodeService.isEnabled();
    globalBarcodeService.disable();

    return () => {
      // Re-enable global barcode service when leaving this page
      if (wasEnabled) {
        globalBarcodeService.enable();
      }
    };
  }, []);

  // Barcode scanner detection (same as templates page)
  useEffect(() => {
    const processScan = () => {
      if (barcodeBufferRef.current.length >= 4) {
        console.log('📊 Barcode scanned on print jobs page:', barcodeBufferRef.current);
        setSearchTerm(barcodeBufferRef.current);
      }
      barcodeBufferRef.current = '';
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeypressTimeRef.current;

      // If search input is focused, let normal typing work
      if (document.activeElement === searchInputRef.current) {
        return;
      }

      // Prevent the global barcode service from processing this
      const target = e.target as HTMLElement | null;
      const isTypingInInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as any).isContentEditable
      );

      if (!isTypingInInput) {
        // We want to handle this scan on the print jobs page
        e.stopPropagation();
        e.stopImmediatePropagation();
      }

      // Barcode scanners type very fast (typically < 50ms between characters)
      // and end with Enter key
      if (e.key === 'Enter') {
        if (!isTypingInInput) {
          e.preventDefault();
        }
        processScan();
      } else if (e.key.length === 1) {
        // Check if this is fast typing (scanner) or slow typing (human)
        if (timeDiff < 80 || barcodeBufferRef.current.length > 0) {
          // Fast typing or continuing a scan - add to buffer
          barcodeBufferRef.current += e.key;
          lastKeypressTimeRef.current = now;

          // Clear existing timeout
          if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
          }

          // Set timeout to process scan if no more keys come
          scanTimeoutRef.current = setTimeout(() => {
            processScan();
          }, 150);
        } else {
          // Slow typing - reset buffer
          barcodeBufferRef.current = e.key;
          lastKeypressTimeRef.current = now;
        }
      }
    };

    // Add event listener with capture phase to intercept before global service
    window.addEventListener('keydown', handleKeyPress, true);
    return () => {
      window.removeEventListener('keydown', handleKeyPress, true);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Read print mode from localStorage on mount (client-side only)
  useEffect(() => {
    const savedMode = localStorage.getItem('barcodePrintToPdf');
    if (savedMode === 'true') {
      setPrintToPdf(true);
    }
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

    setCurrentReprintJob(job);

    // Ask which printer format to use if in PDF mode
    let printerType = 'document'; // Default

    if (printToPdf) {
      const useReceiptFormat = await confirm({
        title: 'Select Label Format',
        description: 'Which format would you like?\n\n• Receipt Format: Single column, vertical strip (for receipt printers)\n• Document Format: 3x6 grid with cut lines (for laser/inkjet printers)',
        confirmText: 'Receipt Format',
        cancelText: 'Document Format',
      });

      printerType = useReceiptFormat ? 'receipt' : 'document';

      // Continue with PDF generation
      await handleReprintWithOptions(jobId, job, null, printerType);
    } else {
      // Regular print mode - fetch and show printer selector
      try {
        const printersResponse = await fetch('/api/network-printers?onlineOnly=true');
        if (printersResponse.ok) {
          const printersData = await printersResponse.json();
          const printers = printersData.printers || [];

          if (printers.length === 0) {
            await alert({
              title: 'No Printers Available',
              description: 'No online printers found. Please check printer connectivity.',
            });
            return;
          }

          setAvailablePrinters(printers);

          // Set default to original printer if available
          const defaultPrinter = printers.find((p: any) => p.id === job.printer?.id);
          setSelectedPrinterId(defaultPrinter?.id || printers[0].id);

          setShowPrinterSelect(true);
        }
      } catch (error) {
        console.error('Error fetching printers:', error);
        await alert({
          title: 'Error',
          description: 'Failed to fetch available printers.',
        });
      }
    }
  };

  const handlePrinterSelectConfirm = async () => {
    if (!currentReprintJob || !selectedPrinterId) return;

    setShowPrinterSelect(false);
    await handleReprintWithOptions(currentReprintJob.id, currentReprintJob, selectedPrinterId, 'document');
  };

  const handleReprintWithOptions = async (jobId: string, job: PrintJob, printerId: string | null, printerType: string) => {

    // Check current PDF mode preference
    const modeText = printToPdf
      ? '📄 PDF MODE: Labels will be downloaded as PNG file'
      : '🖨️ PRINTER MODE: Labels will be sent to printer';

    // Ask user for quantity (default to original quantity)
    const quantityInput = await prompt({
      title: 'Reprint Barcode Labels',
      description: `${modeText}\n\nOriginal quantity: ${job.requestedQuantity}. How many labels would you like to print?`,
      placeholder: 'Enter quantity',
      defaultValue: job.requestedQuantity.toString(),
      inputType: 'number',
      confirmText: printToPdf ? 'Download PNG' : 'Print',
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
      // Check if Print to PDF mode is enabled - use state variable
      if (printToPdf) {
        // Generate and download PNG file instead of creating a print job
        const response = await fetch('/api/universal/barcode-management/print-jobs/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: job.templateId,
            quantity,
            customData: job.customData,
            printerType, // Use selected printer type
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
          body: JSON.stringify({
            quantity,
            printerId: printerId, // Include selected printer ID
          }),
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

  // Filter jobs based on search term
  const filteredJobs = printJobs.filter((job) => {
    if (!searchTerm) return true;
    // Trim whitespace and normalize for barcode scanner input
    const search = searchTerm.trim().toLowerCase();
    return (
      job.itemName?.toLowerCase().includes(search) ||
      job.barcodeData?.toLowerCase().includes(search) ||
      job.barcodeData?.toLowerCase().trim() === search || // Exact match for barcode
      job.template.name?.toLowerCase().includes(search) ||
      job.business.name?.toLowerCase().includes(search) ||
      job.id?.toLowerCase().includes(search)
    );
  });

  const groupedJobs = {
    QUEUED: filteredJobs.filter((j) => j.status === 'QUEUED'),
    PRINTING: filteredJobs.filter((j) => j.status === 'PRINTING'),
    COMPLETED: filteredJobs.filter((j) => j.status === 'COMPLETED'),
    FAILED: filteredJobs.filter((j) => j.status === 'FAILED'),
    CANCELLED: filteredJobs.filter((j) => j.status === 'CANCELLED'),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/universal/barcode-management"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
          >
            ← Back to Barcode Management
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Print Queue
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage and monitor barcode print jobs
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="Search by name, SKU, barcode, or job ID..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3 pr-20"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-10 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => searchInputRef.current?.focus()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Scan barcode to search"
                >
                  <Barcode className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* PDF/Printer Mode Toggle */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="globalPrintToPdf"
                  type="checkbox"
                  checked={printToPdf}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setPrintToPdf(newValue);
                    localStorage.setItem('barcodePrintToPdf', newValue.toString());
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="globalPrintToPdf" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {printToPdf
                    ? '📄 PDF Mode: Reprint will download PNG files'
                    : '🖨️ Printer Mode: Reprint will send to printer'}
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This setting applies to all reprints and new print jobs
              </p>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredJobs.length} {searchTerm && `(filtered from ${printJobs.length})`} of {pagination.total} print jobs
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
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? `No print jobs found matching "${searchTerm}"` : 'No print jobs found'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
                    Batch
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white" title={job.itemName || 'Unknown Item'}>
                        {job.itemName ? fitTemplateName(job.itemName, 40) : 'Unknown Item'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {job.id.substring(0, 8)}...
                      </div>
                    </td>
                    {selectedBusinessId === 'all' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {job.business.name}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 dark:text-white">
                        {job.barcodeData}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {job.template.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 dark:text-white">
                        {job.requestedQuantity}-{job.template.batchId || job.id.slice(-3).toUpperCase()}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(job.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
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

      {/* Printer Selection Modal */}
      {showPrinterSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Printer
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Choose a printer for this print job:
              </label>
              <select
                value={selectedPrinterId}
                onChange={(e) => setSelectedPrinterId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availablePrinters.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name} ({printer.type}) - {printer.status}
                  </option>
                ))}
              </select>
            </div>

            {currentReprintJob && (
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                <p>Original printer: {currentReprintJob.printer?.printerName || 'Unknown'}</p>
                <p>Quantity: {currentReprintJob.requestedQuantity}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPrinterSelect(false);
                  setCurrentReprintJob(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrinterSelectConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
