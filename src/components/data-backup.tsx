'use client';

import { useState, useRef } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button';
import {
  Download,
  Upload,
  Database,
  AlertTriangle,
  CheckCircle,
  HardDrive,
  Users,
  Building,
  UserCheck,
  Loader2,
} from 'lucide-react';

interface BackupOptions {
  type: 'full' | 'users' | 'business-data' | 'employees' | 'reference-data';
  includeAuditLogs: boolean;
}

interface RestoreResult {
  message: string;
  results: {
    restored: {
      users: number;
      businesses: number;
      employees: number;
      businessMemberships: number;
      auditLogs: number;
      referenceData: number;
    };
    errors: string[];
  };
}

export function DataBackup() {
  const [loading, setLoading] = useState(false);
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    type: 'full',
    includeAuditLogs: false,
  });
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm()

  const handleBackup = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set('type', backupOptions.type);
      params.set('includeAuditLogs', backupOptions.includeAuditLogs.toString());

      const response = await fetch(`/api/backup?${params}`);

      if (!response.ok) {
        throw new Error('Backup failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `backup_${backupOptions.type}_${new Date().toISOString().split('T')[0]}.json`;

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
      alert('Backup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setRestoreFile(selectedFile);
      setRestoreResult(null);
    } else {
      alert('Please select a JSON backup file');
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    const ok = await confirm({ title: 'Restore backup', description: 'Are you sure you want to restore from this backup? This will overwrite existing data and cannot be undone.', confirmText: 'Restore', cancelText: 'Cancel' })
    if (!ok) return

    try {
      setLoading(true);

      const fileContent = await restoreFile.text();
      const backupData = JSON.parse(fileContent);

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupData),
      });

      if (!response.ok) {
        throw new Error('Restore failed');
      }

      const result = await response.json();
      setRestoreResult(result);
    } catch (error) {
      alert('Restore failed. Please check the backup file and try again.');
    } finally {
      setLoading(false);
    }
  };

  const backupTypes = [
    {
      id: 'full' as const,
      name: 'Full Backup',
      description: 'Complete database backup with all data including users, businesses, employees, and reference data',
      icon: Database,
    },
    {
      id: 'users' as const,
      name: 'Users & Permissions',
      description: 'User accounts, business memberships, and permission settings',
      icon: Users,
    },
    {
      id: 'business-data' as const,
      name: 'Business Data',
      description: 'Business information, settings, and business-specific data',
      icon: Building,
    },
    {
      id: 'employees' as const,
      name: 'Employee Data',
      description: 'Employee records, contracts, and employment information',
      icon: UserCheck,
    },
    {
      id: 'reference-data' as const,
      name: 'Reference Data',
      description: 'Job titles, compensation types, benefit types, and system templates',
      icon: HardDrive,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Backup Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Create Backup
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create a backup of your database for safekeeping or migration purposes.
            Choose the type of data to include in your backup.
          </p>
        </div>

        {/* Backup Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {backupTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${backupOptions.type === type.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                onClick={() =>
                  setBackupOptions({ ...backupOptions, type: type.id })
                }
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">
                      {type.name}
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

        {/* Backup Options */}
        {backupOptions.type === 'full' && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeAuditLogs"
              checked={backupOptions.includeAuditLogs}
              onChange={(e) =>
                setBackupOptions({
                  ...backupOptions,
                  includeAuditLogs: e.target.checked,
                })
              }
              className="mr-2"
            />
            <label
              htmlFor="includeAuditLogs"
              className="text-sm text-slate-700 dark:text-slate-300"
            >
              Include audit logs (last 10,000 entries)
            </label>
          </div>
        )}

        {/* Create Backup Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleBackup}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {loading ? 'Creating Backup...' : 'Create Backup'}
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700"></div>

      {/* Restore Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Restore from Backup
          </h3>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-100">
                  Warning: Data Overwrite
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Restoring from backup will overwrite existing data. This
                  action cannot be undone. It&apos;s recommended to create a
                  backup before restoring.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${restoreFile
                ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
                : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
              }`}
          >
            {restoreFile ? (
              <div className="space-y-2">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                <p className="text-green-900 dark:text-green-100 font-medium">
                  Backup file selected
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {restoreFile.name} ({(restoreFile.size / 1024).toFixed(1)} KB)
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Different File
                  </Button>
                  <Button onClick={handleRestore} disabled={loading} variant="outline">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Restore Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <HardDrive className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-slate-900 dark:text-slate-100 font-medium">
                  Select Backup File
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Choose a JSON backup file to restore
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="mt-4"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Restore Results */}
        {restoreResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-800">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-900 dark:text-green-100">
                Restore Completed
              </h4>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Users:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreResult.results.restored.users}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Businesses:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreResult.results.restored.businesses}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Employees:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreResult.results.restored.employees}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Memberships:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreResult.results.restored.businessMemberships}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Audit Logs:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreResult.results.restored.auditLogs}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Reference Data:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreResult.results.restored.referenceData}
                </span>
              </div>
            </div>

            {restoreResult.results.errors.length > 0 && (
              <div>
                <h5 className="font-medium text-red-900 dark:text-red-100 mb-2">
                  Errors ({restoreResult.results.errors.length}):
                </h5>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {restoreResult.results.errors.map((error, index) => (
                    <div
                      key={index}
                      className="text-xs text-red-800 dark:text-red-200"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}