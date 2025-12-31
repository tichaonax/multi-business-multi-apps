'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAlert, useConfirm } from '@/components/ui/confirm-modal';
import { globalBarcodeService } from '@/lib/services/global-barcode-service';

interface Template {
  id: string;
  name: string;
  barcodeValue: string;
  sku: string | null;
  symbology: string;
  type: string;
  description: string;
  business: {
    id: string;
    name: string;
    shortName: string;
  };
  createdBy: {
    name: string;
  };
  createdAt: string;
  _count: {
    printJobs: number;
  };
}

export default function TemplatesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const alert = useAlert();
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Barcode scanner support
  const barcodeBufferRef = useRef<string>('');
  const lastKeypressTimeRef = useRef<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchBusinesses();

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

  useEffect(() => {
    if (businesses.length > 0) {
      fetchTemplates();
    }
  }, [search, selectedBusinessId, selectedType, pagination.page, businesses]);

  // Barcode scanner detection
  useEffect(() => {
    const processScan = () => {
      if (barcodeBufferRef.current.length >= 4) {
        console.log('📊 Barcode scanned on templates page:', barcodeBufferRef.current);
        setSearch(barcodeBufferRef.current);
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
        // We want to handle this scan on the templates page
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

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append('search', search);
      if (selectedBusinessId !== 'all') params.append('businessId', selectedBusinessId);
      if (selectedType !== 'all') params.append('type', selectedType);

      const response = await fetch(`/api/universal/barcode-management/templates?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    const confirmed = await confirm({
      title: 'Delete Template',
      description: 'Are you sure you want to delete this template? This cannot be undone.',
      confirmText: 'Yes, delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/universal/barcode-management/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await alert({
          title: 'Success',
          description: 'Template deleted successfully',
        });
        fetchTemplates(); // Refresh list
      } else {
        const data = await response.json();
        await alert({
          title: 'Error',
          description: data.error || 'Failed to delete template',
        });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      await alert({
        title: 'Error',
        description: 'Failed to delete template',
      });
    }
  };

  const getSymbologyBadgeColor = (symbology: string) => {
    const colors: Record<string, string> = {
      code128: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      ean13: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      ean8: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      code39: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      upca: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      itf14: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    };
    return colors[symbology] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
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
                Barcode Templates
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your barcode templates
              </p>
            </div>
            <Link
              href="/universal/barcode-management/templates/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors"
            >
              ➕ Create Template
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search (or scan barcode)
              </label>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  id="search"
                  type="text"
                  placeholder="Search by name, value, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3 pr-10"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

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
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                id="type-filter"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
              >
                <option value="all">All Types</option>
                <option value="grocery">Grocery</option>
                <option value="hardware">Hardware</option>
                <option value="clothing">Clothing</option>
                <option value="restaurant">Restaurant</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {templates.length} of {pagination.total} templates
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No templates found</p>
            <Link
              href="/universal/barcode-management/templates/new"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create your first template
            </Link>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Barcode Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Symbology
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Print Jobs
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {template.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {template.type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {template.sku ? (
                        <code className="text-sm text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded">
                          {template.sku}
                        </code>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500 italic">No SKU</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                        {template.barcodeValue}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getSymbologyBadgeColor(template.symbology)}`}>
                        {template.symbology}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {template.business.shortName || template.business.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {template._count.printJobs}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <Link
                          href={`/universal/barcode-management/templates/${template.id}?preview=true`}
                          className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 rounded-md transition-colors"
                          title="Preview barcode"
                        >
                          👁️ Preview
                        </Link>
                        <Link
                          href={`/universal/barcode-management/print-jobs/new?templateId=${template.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 rounded-md transition-colors"
                          title="Create print job"
                        >
                          🖨️ Print
                        </Link>
                        <Link
                          href={`/universal/barcode-management/templates/${template.id}`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          ✏️ Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{template.type}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getSymbologyBadgeColor(template.symbology)}`}>
                    {template.symbology}
                  </span>
                </div>
                <div className="mb-4 space-y-2">
                  {template.sku && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">SKU:</p>
                      <code className="text-sm text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded">
                        {template.sku}
                      </code>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Barcode:</p>
                    <code className="text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                      {template.barcodeValue}
                    </code>
                  </div>
                </div>
                <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <p>{template.description}</p>
                </div>
                <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  <p>{template.business.shortName || template.business.name}</p>
                  <p>{template._count.printJobs} print jobs</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/universal/barcode-management/templates/${template.id}?preview=true`}
                    className="px-3 py-2 text-center bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 rounded-md transition-colors text-sm"
                  >
                    👁️ Preview
                  </Link>
                  <Link
                    href={`/universal/barcode-management/print-jobs/new?templateId=${template.id}`}
                    className="px-3 py-2 text-center bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 rounded-md transition-colors text-sm"
                  >
                    🖨️ Print
                  </Link>
                  <Link
                    href={`/universal/barcode-management/templates/${template.id}`}
                    className="px-3 py-2 text-center bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 rounded-md transition-colors text-sm"
                  >
                    ✏️ Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="px-3 py-2 text-center bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 rounded-md transition-colors text-sm"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
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
