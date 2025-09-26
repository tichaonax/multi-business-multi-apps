'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Download,
  FileText,
  Calendar,
  Users,
  Building,
  UserCheck,
  FileSpreadsheet,
  FileJson,
  Loader2,
} from 'lucide-react';

interface ExportOptions {
  dataType: 'users' | 'businesses' | 'employees' | 'business-memberships' | 'audit-logs';
  format: 'csv' | 'json' | 'pdf';
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
  businessId?: string;
  includeInactive: boolean;
}

interface DataExportProps {
  userRole?: string;
}

export function DataExport({ userRole }: DataExportProps) {
  const [loading, setLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    dataType: 'users',
    format: 'csv',
    dateRange: {},
    includeInactive: false,
  });

  const isAdmin = userRole === 'admin';

  const handleExport = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set('dataType', exportOptions.dataType);
      params.set('format', exportOptions.format);
      params.set('includeInactive', exportOptions.includeInactive.toString());

      if (exportOptions.dateRange.startDate) {
        params.set('startDate', exportOptions.dateRange.startDate);
      }
      if (exportOptions.dateRange.endDate) {
        params.set('endDate', exportOptions.dateRange.endDate);
      }
      if (exportOptions.businessId) {
        params.set('businessId', exportOptions.businessId);
      }

      const response = await fetch(`/api/export?${params}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export_${exportOptions.dataType}_${new Date().toISOString().split('T')[0]}.${exportOptions.format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const dataTypes = [
    {
      id: 'users' as const,
      name: 'Users',
      description: 'User accounts, roles, and permissions',
      icon: Users,
      adminOnly: false,
    },
    {
      id: 'businesses' as const,
      name: 'Businesses',
      description: 'Business information and settings',
      icon: Building,
      adminOnly: false,
    },
    {
      id: 'employees' as const,
      name: 'Employees',
      description: 'Employee records and employment information',
      icon: UserCheck,
      adminOnly: false,
    },
    {
      id: 'business-memberships' as const,
      name: 'Business Memberships',
      description: 'User-business relationships and roles',
      icon: UserCheck,
      adminOnly: true,
    },
    {
      id: 'audit-logs' as const,
      name: 'Audit Logs',
      description: 'System activity and security logs',
      icon: FileText,
      adminOnly: true,
    },
  ];

  const formats = [
    {
      id: 'csv' as const,
      name: 'CSV',
      description: 'Comma-separated values for spreadsheets',
      icon: FileSpreadsheet,
    },
    {
      id: 'json' as const,
      name: 'JSON',
      description: 'JavaScript Object Notation for developers',
      icon: FileJson,
    },
    {
      id: 'pdf' as const,
      name: 'PDF',
      description: 'Portable Document Format for reports',
      icon: FileText,
    },
  ];

  const availableDataTypes = dataTypes.filter(type => !type.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      {/* Data Type Selection */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Select Data to Export
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableDataTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  exportOptions.dataType === type.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                onClick={() =>
                  setExportOptions({ ...exportOptions, dataType: type.id })
                }
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">
                      {type.name}
                      {type.adminOnly && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                          Admin Only
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {type.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Format Selection */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Export Format
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {formats.map((format) => {
            const Icon = format.icon;
            return (
              <div
                key={format.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  exportOptions.format === format.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                onClick={() =>
                  setExportOptions({ ...exportOptions, format: format.id })
                }
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">
                      {format.name}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {format.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Range Filter */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Date Range Filter (Optional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={exportOptions.dateRange.startDate || ''}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    dateRange: {
                      ...exportOptions.dateRange,
                      startDate: e.target.value,
                    },
                  })
                }
                className="pl-10 w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={exportOptions.dateRange.endDate || ''}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    dateRange: {
                      ...exportOptions.dateRange,
                      endDate: e.target.value,
                    },
                  })
                }
                className="pl-10 w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Options */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Export Options
        </h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeInactive"
              checked={exportOptions.includeInactive}
              onChange={(e) =>
                setExportOptions({
                  ...exportOptions,
                  includeInactive: e.target.checked,
                })
              }
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <label
              htmlFor="includeInactive"
              className="text-sm text-slate-700 dark:text-slate-300"
            >
              Include inactive records
            </label>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {loading ? 'Exporting...' : 'Export Data'}
        </Button>
      </div>

      {/* Export Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950 dark:border-blue-800">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Export Summary
        </h4>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <p>
            <span className="font-medium">Data Type:</span>{' '}
            {dataTypes.find(t => t.id === exportOptions.dataType)?.name}
          </p>
          <p>
            <span className="font-medium">Format:</span>{' '}
            {formats.find(f => f.id === exportOptions.format)?.name}
          </p>
          {exportOptions.dateRange.startDate && (
            <p>
              <span className="font-medium">Start Date:</span>{' '}
              {exportOptions.dateRange.startDate}
            </p>
          )}
          {exportOptions.dateRange.endDate && (
            <p>
              <span className="font-medium">End Date:</span>{' '}
              {exportOptions.dateRange.endDate}
            </p>
          )}
          <p>
            <span className="font-medium">Include Inactive:</span>{' '}
            {exportOptions.includeInactive ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    </div>
  );
}