'use client';

import { useState, useRef, useEffect } from 'react';
import { useConfirm, useAlert } from '@/components/ui/confirm-modal'
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
  Trash2,
  Package,
  ShoppingCart,
  Users as UsersIcon,
  Boxes,
} from 'lucide-react';

interface BackupOptions {
  type: 'full' | 'users' | 'business-data' | 'employees' | 'reference-data' | 'demo-only';
  includeAuditLogs: boolean;
  includeDemoData: boolean;
  includeBusinessData: boolean;
  selectedDemoBusinessId?: string;
  selectedRealBusinessId?: string;
}

interface DemoBusiness {
  id: string;
  name: string;
  type: string;
  description: string | null;
  createdAt: string;
  counts: {
    products: number;
    variants: number;
    categories: number;
    suppliers: number;
    customers: number;
    employees: number;
    members: number;
    stockMovements: number;
  };
}

interface RealBusiness {
  id: string;
  name: string;
  type: string;
  description: string | null;
  createdAt: string;
  counts: {
    products: number;
    variants: number;
    categories: number;
    suppliers: number;
    customers: number;
    employees: number;
    members: number;
    stockMovements: number;
  };
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
    includeDemoData: false, // Demo data excluded by default
    includeBusinessData: true, // Business data included by default
    selectedDemoBusinessId: undefined,
  });
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [demoBusinesses, setDemoBusinesses] = useState<DemoBusiness[]>([]);
  const [loadingDemos, setLoadingDemos] = useState(false);
  const [deletingDemo, setDeletingDemo] = useState<string | null>(null);
  const [realBusinesses, setRealBusinesses] = useState<RealBusiness[]>([]);
  const [loadingRealBusinesses, setLoadingRealBusinesses] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm()
  const customAlert = useAlert()

  // Load demo and real businesses on component mount
  useEffect(() => {
    loadDemoBusinesses();
    loadRealBusinesses();
  }, []);

  // Auto-reload page after successful restore
  useEffect(() => {
    if (restoreResult) {
      // Wait 2 seconds to show the success message, then reload
      const timer = setTimeout(() => {
        window.location.reload();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [restoreResult]);

  const loadDemoBusinesses = async () => {
    setLoadingDemos(true);
    try {
      const response = await fetch('/api/admin/demo-businesses');
      if (response.ok) {
        const data = await response.json();
        setDemoBusinesses(data.businesses || []);
      }
    } catch (error) {
      console.error('Failed to load demo businesses:', error);
    } finally {
      setLoadingDemos(false);
    }
  };

  const loadRealBusinesses = async () => {
    setLoadingRealBusinesses(true);
    try {
      const response = await fetch('/api/admin/real-businesses');
      if (response.ok) {
        const data = await response.json();
        setRealBusinesses(data.businesses || []);
      }
    } catch (error) {
      console.error('Failed to load real businesses:', error);
    } finally {
      setLoadingRealBusinesses(false);
    }
  };

  const handleDeleteDemoBusiness = async (businessId: string, businessName: string) => {
    const ok = await confirm({
      title: 'Delete Demo Business',
      description: `Are you sure you want to delete "${businessName}"? This will permanently delete all products, inventory, categories, suppliers, employees, and related data. This action cannot be undone.`,
      confirmText: 'Delete Demo Business',
      cancelText: 'Cancel'
    });

    if (!ok) return;

    setDeletingDemo(businessId);
    try {
      const response = await fetch(`/api/admin/demo-backup?businessId=${businessId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await customAlert({
          title: 'Success',
          description: `Demo business "${businessName}" has been deleted successfully.`
        });
        // Reload demo businesses list
        await loadDemoBusinesses();
      } else {
        const data = await response.json();
        await customAlert({
          title: 'Delete Failed',
          description: data.error || 'Failed to delete demo business.'
        });
      }
    } catch (error) {
      await customAlert({
        title: 'Delete Failed',
        description: 'An error occurred while deleting the demo business.'
      });
    } finally {
      setDeletingDemo(null);
    }
  };

  const handleBackup = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set('type', backupOptions.type);
      params.set('includeAuditLogs', backupOptions.includeAuditLogs.toString());
      params.set('includeBusinessData', backupOptions.includeBusinessData.toString());
      
      // For demo-only backups, always include demo data
      if (backupOptions.type === 'demo-only') {
        params.set('includeDemoData', 'true');
        // If specific demo business is selected, add businessId
        if (backupOptions.selectedDemoBusinessId) {
          params.set('businessId', backupOptions.selectedDemoBusinessId);
        }
      } else {
        params.set('includeDemoData', backupOptions.includeDemoData.toString());
      }
      
      // Add businessId if specific real business is selected
      if (backupOptions.selectedRealBusinessId) {
        params.set('businessId', backupOptions.selectedRealBusinessId);
      }

      const response = await fetch(`/api/backup?${params}`);

      if (!response.ok) {
        throw new Error('Backup failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `MultiBusinessSyncService-backup_${backupOptions.type}_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.json`;

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
      await customAlert({ title: 'Backup Failed', description: 'The backup operation failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setRestoreFile(selectedFile);
      setRestoreResult(null);
    } else {
      await customAlert({ title: 'Invalid File', description: 'Please select a JSON backup file.' });
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

      // Determine which endpoint to use based on backup type
      const isDemoBackup = backupData.metadata?.backupType === 'demo-business';
      const endpoint = isDemoBackup ? '/api/admin/demo-backup' : '/api/backup';

      const response = await fetch(endpoint, {
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
      await customAlert({ title: 'Restore Failed', description: 'The restore operation failed. Please check the backup file and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const backupTypes = [
    {
      id: 'full' as const,
      name: 'Full Backup (Production)',
      description: 'Complete database backup excluding demo businesses (recommended for production backups)',
      icon: Database,
    },
    {
      id: 'demo-only' as const,
      name: '🎭 Demo Businesses Only',
      description: 'Backup only demo businesses with all their data for restoration or migration',
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

        {/* Demo Business Selector */}
        {backupOptions.type === 'demo-only' && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg dark:bg-purple-950 dark:border-purple-800">
            <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-3">
              Select Demo Business to Backup
            </h4>
            <select
              value={backupOptions.selectedDemoBusinessId || ''}
              onChange={(e) =>
                setBackupOptions({
                  ...backupOptions,
                  selectedDemoBusinessId: e.target.value || undefined,
                })
              }
              className="w-full p-2 border border-purple-300 rounded-md bg-white dark:bg-slate-800 dark:border-purple-700 text-slate-900 dark:text-slate-100"
            >
              <option value="">All Demo Businesses ({demoBusinesses.length})</option>
              {demoBusinesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.type}) - {business.counts.products} products, {business.counts.categories} categories
                </option>
              ))}
            </select>
            {loadingDemos && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                Loading demo businesses...
              </p>
            )}
          </div>
        )}

        {/* Real Business Selector - for users, business-data, and employees backups */}
        {(backupOptions.type === 'users' || backupOptions.type === 'business-data' || backupOptions.type === 'employees') && realBusinesses.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
              Select Business to Backup (Optional)
            </h4>
            <select
              value={backupOptions.selectedRealBusinessId || ''}
              onChange={(e) =>
                setBackupOptions({
                  ...backupOptions,
                  selectedRealBusinessId: e.target.value || undefined,
                })
              }
              className="w-full p-2 border border-blue-300 rounded-md bg-white dark:bg-slate-800 dark:border-blue-700 text-slate-900 dark:text-slate-100"
            >
              <option value="">All Businesses ({realBusinesses.length})</option>
              {realBusinesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.type}) - {business.counts.products} products, {business.counts.employees} employees
                </option>
              ))}
            </select>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Leave blank to backup all businesses, or select a specific business to backup only its data
            </p>
            {loadingRealBusinesses && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Loading businesses...
              </p>
            )}
          </div>
        )}

        {/* Backup Options */}
        <div className="space-y-3">
          {backupOptions.type === 'full' && (
            <>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeBusinessData"
                  checked={backupOptions.includeBusinessData}
                  onChange={(e) =>
                    setBackupOptions({
                      ...backupOptions,
                      includeBusinessData: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label
                  htmlFor="includeBusinessData"
                  className="text-sm text-slate-700 dark:text-slate-300"
                >
                  Include business data (products, inventory, categories, suppliers, customers)
                </label>
              </div>
              
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
            </>
          )}
          
          {backupOptions.type !== 'demo-only' && backupOptions.type !== 'reference-data' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Include Demo Data
                    </label>
                    <input
                      type="checkbox"
                      id="includeDemoData"
                      checked={backupOptions.includeDemoData}
                      onChange={(e) =>
                        setBackupOptions({
                          ...backupOptions,
                          includeDemoData: e.target.checked,
                        })
                      }
                      className="ml-2"
                    />
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {backupOptions.includeDemoData 
                      ? '⚠️ Demo businesses will be included in this backup' 
                      : '✅ Demo businesses will be excluded (recommended for production)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

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

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700"></div>

      {/* Demo Business Management Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            🎭 Demo Business Management
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            View, backup, and manage your demo businesses. Demo businesses are used for testing and training purposes.
          </p>
        </div>

        {loadingDemos ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading demo businesses...</p>
          </div>
        ) : demoBusinesses.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <Database className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No Demo Businesses Found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              There are no demo businesses in the system. You can create demo businesses from the admin panel.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoBusinesses.map((business) => (
              <div
                key={business.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        {business.name}
                      </h4>
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded">
                        {business.type}
                      </span>
                    </div>
                    {business.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {business.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Created: {new Date(business.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-950 rounded">
                    <div className="flex items-center justify-center mb-1">
                      <Package className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                      {business.counts.products}
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      Products
                    </div>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
                    <div className="flex items-center justify-center mb-1">
                      <Boxes className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="text-xs font-semibold text-green-900 dark:text-green-100">
                      {business.counts.categories}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300">
                      Categories
                    </div>
                  </div>
                  <div className="text-center p-2 bg-amber-50 dark:bg-amber-950 rounded">
                    <div className="flex items-center justify-center mb-1">
                      <ShoppingCart className="h-3 w-3 text-amber-600" />
                    </div>
                    <div className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                      {business.counts.suppliers}
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      Suppliers
                    </div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-950 rounded">
                    <div className="flex items-center justify-center mb-1">
                      <UsersIcon className="h-3 w-3 text-purple-600" />
                    </div>
                    <div className="text-xs font-semibold text-purple-900 dark:text-purple-100">
                      {business.counts.employees}
                    </div>
                    <div className="text-xs text-purple-700 dark:text-purple-300">
                      Employees
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-3 space-y-1">
                  <div className="flex justify-between">
                    <span>Variants:</span>
                    <span className="font-medium">{business.counts.variants}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock Movements:</span>
                    <span className="font-medium">{business.counts.stockMovements}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customers:</span>
                    <span className="font-medium">{business.counts.customers}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBackupOptions({
                        ...backupOptions,
                        type: 'demo-only',
                        selectedDemoBusinessId: business.id,
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Backup
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDemoBusiness(business.id, business.name)}
                    disabled={deletingDemo === business.id}
                    className="text-red-600 hover:text-red-700 hover:border-red-300 dark:text-red-400"
                  >
                    {deletingDemo === business.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={loadDemoBusinesses}
            disabled={loadingDemos}
          >
            {loadingDemos ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Refreshing...
              </>
            ) : (
              'Refresh List'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}