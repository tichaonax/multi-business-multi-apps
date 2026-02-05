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
    includeDemoData: false, // Demo data excluded by default (production setting)
    includeBusinessData: true, // Business data included by default
    selectedDemoBusinessId: undefined,
  });
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoreProgressId, setRestoreProgressId] = useState<string | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<any | null>(null);
  const pollingRef = useRef<number | null>(null);
  const polling404Count = useRef<number>(0);
  const [demoBusinesses, setDemoBusinesses] = useState<DemoBusiness[]>([]);
  const [loadingDemos, setLoadingDemos] = useState(false);
  const [deletingDemo, setDeletingDemo] = useState<string | null>(null);
  const [realBusinesses, setRealBusinesses] = useState<RealBusiness[]>([]);
  const [loadingRealBusinesses, setLoadingRealBusinesses] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm()
  const customAlert = useAlert()

  // Load demo and real businesses on component mount
  useEffect(() => {
    loadDemoBusinesses();
    loadRealBusinesses();
  }, []);

  // Show completion alert after successful restore
  useEffect(() => {
    if (restoreResult) {
      // Show alert and redirect when user clicks OK
      const showCompletionAlert = async () => {
        await customAlert({
          title: '✅ Restore Complete!',
          description: 'Your backup has been successfully restored. Click OK to reload the application and see your restored data.'
        });
        window.location.href = '/dashboard';
      };
      showCompletionAlert();
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

      // API always compresses backups by default, so always use .json.gz
      const filename = `MultiBusinessSyncService-backup_${backupOptions.type}_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.json.gz`;

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
    if (selectedFile) {
      // Accept both .json and .json.gz files
      const isJson = selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json');
      const isGzip = selectedFile.type === 'application/gzip' || selectedFile.type === 'application/x-gzip' || selectedFile.name.endsWith('.gz') || selectedFile.name.endsWith('.json.gz');

      if (isJson || isGzip) {
        setRestoreFile(selectedFile);
        setRestoreResult(null);
      } else {
        await customAlert({ title: 'Invalid File', description: 'Please select a JSON or compressed (.json.gz) backup file.' });
      }
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    const ok = await confirm({ title: 'Restore backup', description: 'Are you sure you want to restore from this backup? This will overwrite existing data and cannot be undone.', confirmText: 'Restore', cancelText: 'Cancel' })
    if (!ok) return

    try {
      setLoading(true);

      // Check if file is compressed
      const isCompressed = restoreFile.name.endsWith('.gz') || restoreFile.name.endsWith('.json.gz');

      console.log('[Restore] File:', restoreFile.name, 'Size:', restoreFile.size, 'Compressed:', isCompressed);

      let requestBody: any;

      if (isCompressed) {
        console.log('[Restore] Reading compressed file...');
        // For compressed files, read as ArrayBuffer
        const arrayBuffer = await restoreFile.arrayBuffer();
        console.log('[Restore] ArrayBuffer size:', arrayBuffer.byteLength);

        // Convert ArrayBuffer to base64 using proper binary encoding
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        console.log('[Restore] Base64 size:', base64.length);

        // Verify it's a gzip file (magic bytes 0x1f 0x8b)
        console.log('[Restore] First two bytes:', bytes[0].toString(16), bytes[1].toString(16),
                    'Expected: 1f 8b', bytes[0] === 0x1f && bytes[1] === 0x8b ? '✓' : '✗');

        requestBody = { compressedData: base64 };
      } else {
        console.log('[Restore] Reading JSON file...');
        // For JSON files, read as text and parse
        const fileContent = await restoreFile.text();
        console.log('[Restore] JSON content length:', fileContent.length);
        const backupData = JSON.parse(fileContent);
        console.log('[Restore] Parsed backup data, version:', backupData.metadata?.version);
        requestBody = { backupData };
      }

      // Note: For now, always use /api/backup endpoint
      // Demo backup detection will happen on server side based on metadata
      const endpoint = '/api/backup';

      console.log('[Restore] Sending request to:', endpoint);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[Restore] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Restore] API error:', errorData);
        throw new Error(errorData.error || errorData.details || 'Restore failed');
      }

      const result = await response.json();
      console.log('[Restore] Result:', result);

      // If the API returned a `results` object, it's a completed (wait=true) response
      if (result?.results) {
        setRestoreResult(result as RestoreResult);
        setRestoreProgressId(null);
        setRestoreProgress(null);
      } else if (result?.progressId) {
        // Background restore started - use progressId to poll
        setRestoreResult(null);
        setRestoreProgressId(result.progressId as string);
        setRestoreProgress(null);
      } else {
        // Fallback: may contain message only
        setRestoreResult(null);
        setRestoreProgressId(null);
        setRestoreProgress(null);
      }
    } catch (error: any) {
      console.error('[Restore] Error:', error);
      await customAlert({
        title: 'Restore Failed',
        description: error.message || 'The restore operation failed. Please check the backup file and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!restoreFile) return;

    try {
      setValidating(true);
      setValidationResult(null);

      // Check if file is compressed
      const isCompressed = restoreFile.name.endsWith('.gz') || restoreFile.name.endsWith('.json.gz');

      console.log('[Validate] File:', restoreFile.name, 'Size:', restoreFile.size, 'Compressed:', isCompressed);

      let requestBody: any;

      if (isCompressed) {
        console.log('[Validate] Reading compressed file...');
        // For compressed files, read as ArrayBuffer
        const arrayBuffer = await restoreFile.arrayBuffer();

        // Convert ArrayBuffer to base64
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        requestBody = { compressedData: base64 };
      } else {
        console.log('[Validate] Reading JSON file...');
        // For JSON files, read as text and parse
        const fileContent = await restoreFile.text();
        const backupData = JSON.parse(fileContent);
        requestBody = { backupData };
      }

      console.log('[Validate] Sending validation request...');
      const response = await fetch('/api/backup/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Validation failed');
      }

      const result = await response.json();
      console.log('[Validate] Validation complete:', result);
      setValidationResult(result);

      // Show summary alert
      const summary = result.summary;
      const statusEmoji = {
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
      }[summary.overallStatus] || '📊';

      await customAlert({
        title: `${statusEmoji} Validation ${summary.overallStatus.toUpperCase()}`,
        description: result.message || 'Validation complete. See details below.'
      });
    } catch (error: any) {
      console.error('[Validate] Error:', error);
      await customAlert({
        title: 'Validation Failed',
        description: error.message || 'Failed to validate backup file.'
      });
    } finally {
      setValidating(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // Validate file type
      const isJson = droppedFile.type === 'application/json' || droppedFile.name.endsWith('.json');
      const isGzip = droppedFile.type === 'application/gzip' || droppedFile.type === 'application/x-gzip' || droppedFile.name.endsWith('.gz') || droppedFile.name.endsWith('.json.gz');

      if (isJson || isGzip) {
        setRestoreFile(droppedFile);
        setRestoreResult(null);
      } else {
        await customAlert({ title: 'Invalid File', description: 'Please select a JSON or compressed (.json.gz) backup file.' });
      }
    }
  };

  // Poll progress endpoint when we have a progressId
  useEffect(() => {
    if (!restoreProgressId) {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/backup/progress?id=${encodeURIComponent(restoreProgressId)}`);
        if (res.status === 404) {
          polling404Count.current += 1;
          // After 3 consecutive 404s, stop polling and show alert
          if (polling404Count.current >= 3) {
            if (pollingRef.current) {
              window.clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            await customAlert({ title: 'Restore Progress Unavailable', description: 'The restore progress ID could not be found on the server. The background restore may have failed or the server restarted. Please try again or check server logs.' });
            setRestoreProgressId(null);
          }
          return
        }
        polling404Count.current = 0;
        if (res.ok) {
          const data = await res.json();
          setRestoreProgress(data?.progress ?? null);

          // Stop polling if model indicates completion or error
          const model = data?.progress?.model;
          const isComplete = model === 'completed' ||
                           (data?.progress?.total && data?.progress?.processed &&
                            data.progress.processed >= data.progress.total);
          const isError = model === 'error';

          if (isComplete) {
            if (pollingRef.current) {
              window.clearInterval(pollingRef.current);
              pollingRef.current = null;
            }

            // Build detailed summary
            const progress = data?.progress;
            const totalProcessed = progress?.processed ?? 0;
            const totalSkipped = progress?.skipped ?? 0;
            const total = progress?.total ?? 0;

            let summary = `Successfully restored ${totalProcessed} records out of ${total} total.`;

            if (totalSkipped > 0) {
              summary += `\n\n⚠️ ${totalSkipped} records were skipped:`;
              if (progress?.skippedReasons) {
                if (progress.skippedReasons.foreignKeyErrors > 0) {
                  summary += `\n• ${progress.skippedReasons.foreignKeyErrors} foreign key constraint errors (missing referenced data)`;
                }
                if (progress.skippedReasons.validationErrors > 0) {
                  summary += `\n• ${progress.skippedReasons.validationErrors} validation errors (duplicate or invalid data)`;
                }
                if (progress.skippedReasons.otherErrors > 0) {
                  summary += `\n• ${progress.skippedReasons.otherErrors} other errors`;
                }
              }
            }

            summary += '\n\nClick OK to reload the application.';

            // Mark as finished
            setRestoreProgressId(null);
            // Show completion alert then redirect
            await customAlert({
              title: totalSkipped > 0 ? '⚠️ Restore Complete (with warnings)' : '✅ Restore Complete!',
              description: summary
            });
            window.location.href = '/dashboard';
          } else if (isError) {
            if (pollingRef.current) {
              window.clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setRestoreProgressId(null);
            await customAlert({ title: 'Restore Failed', description: 'The restore operation encountered errors. Please check the logs.' });
          }
        }
      } catch (err) {
        console.warn('Failed to poll backup progress', err);
      }
    };

    // Start immediate poll then interval
    void poll();
    pollingRef.current = window.setInterval(poll, 2000) as unknown as number;

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [restoreProgressId]);

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
            accept=".json,.gz,.json.gz,application/json,application/gzip,application/x-gzip"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              restoreFile
                ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
                : isDragging
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950'
                : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
                  <Button onClick={handleValidate} disabled={validating || loading} variant="outline">
                    {validating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Validate Backup
                      </>
                    )}
                  </Button>
                  <Button onClick={handleRestore} disabled={loading || validating} variant="outline">
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
                  {isDragging ? 'Drop backup file here' : 'Select or Drop Backup File'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {isDragging
                    ? 'Release to upload the file'
                    : 'Drag and drop a .json or .json.gz backup file, or click to browse'}
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

        {/* Validation Results */}
        {validationResult && (
          <div className={`p-4 border-2 rounded-lg ${
            validationResult.summary.overallStatus === 'success'
              ? 'bg-green-50 border-green-500 dark:bg-green-950 dark:border-green-600'
              : validationResult.summary.overallStatus === 'warning'
              ? 'bg-amber-50 border-amber-500 dark:bg-amber-950 dark:border-amber-600'
              : 'bg-red-50 border-red-500 dark:bg-red-950 dark:border-red-600'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {validationResult.summary.overallStatus === 'success' && <CheckCircle className="h-7 w-7 text-green-600" />}
              {validationResult.summary.overallStatus === 'warning' && <AlertTriangle className="h-7 w-7 text-amber-600" />}
              {validationResult.summary.overallStatus === 'error' && <AlertTriangle className="h-7 w-7 text-red-600" />}
              <div>
                <h4 className={`font-bold text-xl ${
                  validationResult.summary.overallStatus === 'success'
                    ? 'text-green-900 dark:text-green-100'
                    : validationResult.summary.overallStatus === 'warning'
                    ? 'text-amber-900 dark:text-amber-100'
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {validationResult.summary.overallStatus === 'success' && '✅ Perfect Match'}
                  {validationResult.summary.overallStatus === 'warning' && '⚠️ Warning - Some Differences'}
                  {validationResult.summary.overallStatus === 'error' && '❌ Mismatch Detected'}
                </h4>
                <p className={`text-sm ${
                  validationResult.summary.overallStatus === 'success'
                    ? 'text-green-700 dark:text-green-300'
                    : validationResult.summary.overallStatus === 'warning'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {validationResult.message}
                </p>
              </div>
            </div>

            {/* Critical: Show Unexpected Mismatches First */}
            {validationResult.summary.unexpectedMismatches > 0 && (
              <div className="mb-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg dark:bg-red-900 dark:border-red-600">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-red-900 dark:text-red-100 text-lg mb-1">
                      {validationResult.summary.unexpectedMismatches} Table{validationResult.summary.unexpectedMismatches > 1 ? 's' : ''} Don't Match
                    </h5>
                    <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                      These tables have different record counts than the backup, which shouldn't happen. This might mean the database was modified after restore.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {validationResult.summary.results
                    .filter((r: any) => r.status === 'unexpected-mismatch')
                    .map((result: any, index: number) => (
                      <div key={index} className="p-3 bg-white dark:bg-slate-800 rounded border-l-4 border-red-500">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-red-900 dark:text-red-100 text-base">
                            📋 {result.tableName}
                          </span>
                          <span className="text-2xl">❌</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <div className="text-red-800 dark:text-red-200">
                            <span className="font-medium">In Backup:</span> <span className="font-bold">{result.backupCount} records</span>
                          </div>
                          <div className="text-red-800 dark:text-red-200">
                            <span className="font-medium">In Database:</span> <span className="font-bold">{result.databaseCount} records</span>
                          </div>
                        </div>
                        <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 p-2 rounded">
                          <span className="font-medium">⚠️ Issue:</span>{' '}
                          {result.databaseCount > result.backupCount
                            ? `Database has ${result.difference} EXTRA record${result.difference > 1 ? 's' : ''} not in backup`
                            : `Database is MISSING ${result.difference} record${result.difference > 1 ? 's' : ''} from backup`}
                        </div>
                        {result.notes && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-400 italic">
                            {result.notes}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                          <span className="font-medium">💡 Likely Cause:</span>{' '}
                          {result.databaseCount > result.backupCount
                            ? 'Data was added to database after restore (or auto-created by system)'
                            : 'Data failed to restore from backup (check restore logs)'}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div className="text-blue-800 dark:text-blue-200">
                <span className="font-medium">Total Tables:</span>{' '}
                <span className="font-bold text-blue-900 dark:text-blue-100">
                  {validationResult.summary.totalTables}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">✅ Exact Matches:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {validationResult.summary.exactMatches}
                </span>
              </div>
              <div className="text-amber-800 dark:text-amber-200">
                <span className="font-medium">⚠️ Expected Diff:</span>{' '}
                <span className="font-bold text-amber-900 dark:text-amber-100">
                  {validationResult.summary.expectedDifferences}
                </span>
              </div>
              <div className="text-red-800 dark:text-red-200">
                <span className="font-medium">❌ Mismatches:</span>{' '}
                <span className="font-bold text-red-900 dark:text-red-100">
                  {validationResult.summary.unexpectedMismatches}
                </span>
              </div>
            </div>

            {/* Detailed Report */}
            {validationResult.report && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-blue-900 dark:text-blue-100 hover:underline">
                  View Detailed Report
                </summary>
                <pre className="mt-2 p-4 bg-slate-100 dark:bg-slate-900 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                  {validationResult.report}
                </pre>
              </details>
            )}

            {/* Expected Differences Section */}
            {validationResult.summary.expectedDifferences > 0 && (
              <div className="mb-4 p-3 bg-amber-100 border border-amber-400 rounded-lg dark:bg-amber-900 dark:border-amber-600">
                <h5 className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {validationResult.summary.expectedDifferences} Expected Difference{validationResult.summary.expectedDifferences > 1 ? 's' : ''}
                </h5>
                <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                  These are normal differences caused by foreign key constraints or validation errors during restore.
                </p>
                <details>
                  <summary className="cursor-pointer text-sm text-amber-700 dark:text-amber-300 hover:underline">
                    Show {validationResult.summary.expectedDifferences} expected difference{validationResult.summary.expectedDifferences > 1 ? 's' : ''}
                  </summary>
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {validationResult.summary.results
                      .filter((r: any) => r.status === 'expected-difference')
                      .map((result: any, index: number) => (
                        <div key={index} className="text-xs p-2 bg-white dark:bg-slate-800 rounded">
                          <span className="font-medium">{result.tableName}:</span> Backup {result.backupCount} → DB {result.databaseCount}
                          {result.notes && <div className="text-amber-600 dark:text-amber-400 mt-1">{result.notes}</div>}
                        </div>
                      ))}
                  </div>
                </details>
              </div>
            )}

            {/* All Results Section */}
            {validationResult.summary.results && validationResult.summary.results.length > 0 && (
              <div className="mt-4">
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:underline mb-2">
                    📊 View All {validationResult.summary.totalTables} Table Results
                  </summary>
                  <div className="space-y-1 max-h-96 overflow-y-auto mt-2">
                    {validationResult.summary.results.map((result: any, index: number) => (
                      <div
                        key={index}
                        className={`text-xs p-2 rounded ${
                          result.status === 'exact-match'
                            ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
                            : result.status === 'expected-difference'
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                            : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{result.tableName}</span>
                          <span>
                            {result.status === 'exact-match' && '✅'}
                            {result.status === 'expected-difference' && '⚠️'}
                            {result.status === 'unexpected-mismatch' && '❌'}
                          </span>
                        </div>
                        <div className="mt-1">
                          Backup: {result.backupCount} | Database: {result.databaseCount}
                          {result.difference > 0 && ` | Diff: ${result.difference}`}
                        </div>
                        {result.notes && (
                          <div className="mt-1 text-xs opacity-75">{result.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Restore Results */}
        { (restoreResult || restoreProgress) && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-800">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-900 dark:text-green-100">
                {restoreResult ? 'Restore Completed' : 'Restore In Progress'}
              </h4>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Users:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreProgress?.modelCounts?.users?.successful ?? 0}
                  {restoreProgress?.modelCounts?.users?.skipped ? ` (${restoreProgress.modelCounts.users.skipped} skipped)` : ''}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Businesses:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreProgress?.modelCounts?.businesses?.successful ?? 0}
                  {restoreProgress?.modelCounts?.businesses?.skipped ? ` (${restoreProgress.modelCounts.businesses.skipped} skipped)` : ''}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Employees:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreProgress?.modelCounts?.employees?.successful ?? 0}
                  {restoreProgress?.modelCounts?.employees?.skipped ? ` (${restoreProgress.modelCounts.employees.skipped} skipped)` : ''}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Products:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreProgress?.modelCounts?.businessProducts?.successful ?? 0}
                  {restoreProgress?.modelCounts?.businessProducts?.skipped ? ` (${restoreProgress.modelCounts.businessProducts.skipped} skipped)` : ''}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Customers:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreProgress?.modelCounts?.businessCustomers?.successful ?? 0}
                  {restoreProgress?.modelCounts?.businessCustomers?.skipped ? ` (${restoreProgress.modelCounts.businessCustomers.skipped} skipped)` : ''}
                </span>
              </div>
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Orders:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {restoreProgress?.modelCounts?.businessOrders?.successful ?? 0}
                  {restoreProgress?.modelCounts?.businessOrders?.skipped ? ` (${restoreProgress.modelCounts.businessOrders.skipped} skipped)` : ''}
                </span>
              </div>
            </div>

            {/* If progress exists, show overall processed/total and model */}
            {restoreProgress && !restoreResult && (
              <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                <div>
                  <span className="font-medium">Processed:</span> {restoreProgress.processed ?? 0} / {restoreProgress.total ?? '...'} records
                  {restoreProgress.skipped > 0 && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      ({restoreProgress.skipped} skipped)
                    </span>
                  )}
                </div>
                {restoreProgress.skippedReasons && (restoreProgress.skippedReasons.foreignKeyErrors > 0 || restoreProgress.skippedReasons.validationErrors > 0 || restoreProgress.skippedReasons.otherErrors > 0) && (
                  <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Skip reasons:
                    {restoreProgress.skippedReasons.foreignKeyErrors > 0 && ` Foreign Keys: ${restoreProgress.skippedReasons.foreignKeyErrors}`}
                    {restoreProgress.skippedReasons.validationErrors > 0 && `, Validation: ${restoreProgress.skippedReasons.validationErrors}`}
                    {restoreProgress.skippedReasons.otherErrors > 0 && `, Other: ${restoreProgress.skippedReasons.otherErrors}`}
                  </div>
                )}
                <div>Last activity: {restoreProgress.model ?? 'N/A'} {restoreProgress.model !== 'completed' && restoreProgress.recordId ? `(record ${restoreProgress.recordId})` : ''}</div>
              </div>
            )}

            {restoreProgress && !restoreResult && restoreProgress.total > 0 && (() => {
              // Include skipped records in progress to reach 100%
              const processed = restoreProgress.processed ?? 0;
              const skipped = restoreProgress.skipped ?? 0;
              const effectiveProgress = processed + skipped;
              const total = restoreProgress.total || 1;
              const percent = Math.min(100, Math.round((effectiveProgress / total) * 100));
              return (
                <div className="mt-2">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-green-600 dark:bg-green-400 transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 text-right mt-1">
                    {percent}% complete{skipped > 0 ? ` (${skipped} skipped)` : ''}
                  </div>
                </div>
              );
            })()}

            {(restoreResult?.results?.errors?.length > 0 || (restoreProgress?.errors?.length ?? 0) > 0) && (
              <div>
                <h5 className="font-medium text-red-900 dark:text-red-100 mb-2">
                  Errors ({restoreResult?.results?.errors?.length ?? restoreProgress?.errors?.length ?? 0}):
                </h5>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {(restoreResult?.results?.errors ?? restoreProgress?.errors ?? []).map((error, index) => (
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