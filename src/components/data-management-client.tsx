'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DataExport } from '@/components/data-export';
import { DataImport } from '@/components/data-import';
import { DataBackup } from '@/components/data-backup';
import { DataSeed } from '@/components/data-seed';
import { Download, Upload, HardDrive, Shield, Sprout } from 'lucide-react';
import { ContentLayout } from '@/components/layout/content-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';

export function DataManagementClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'backup' | 'seed'>('export');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isAdmin = session.user?.role === 'admin';

  return (
    <ProtectedRoute>
      <ContentLayout
        title="🗂️ Data Management"
        subtitle={`Export your data for analysis, import bulk data from CSV files, or create database backups${!isAdmin ? '. Import and backup functionality requires administrator privileges.' : ''}`}
        maxWidth="7xl"
      >
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('export')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'export'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                <Download className="h-4 w-4 inline mr-2" />
                Export Data
              </button>
              <button
                onClick={() => setActiveTab('import')}
                disabled={!isAdmin}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'import' && isAdmin
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : !isAdmin
                      ? 'border-transparent text-slate-300 cursor-not-allowed dark:text-slate-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                Import Data
                {!isAdmin && (
                  <span className="ml-1 text-xs">(Admin Only)</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('backup')}
                disabled={!isAdmin}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'backup' && isAdmin
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : !isAdmin
                      ? 'border-transparent text-slate-300 cursor-not-allowed dark:text-slate-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                <HardDrive className="h-4 w-4 inline mr-2" />
                Backup & Restore
                {!isAdmin && (
                  <span className="ml-1 text-xs">(Admin Only)</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('seed')}
                disabled={!isAdmin}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'seed' && isAdmin
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : !isAdmin
                      ? 'border-transparent text-slate-300 cursor-not-allowed dark:text-slate-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                <Sprout className="h-4 w-4 inline mr-2" />
                Seed & Validate
                {!isAdmin && (
                  <span className="ml-1 text-xs">(Admin Only)</span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-lg dark:bg-slate-800 p-6">
          {activeTab === 'export' && (
            <DataExport userRole={session.user?.role} />
          )}

          {activeTab === 'import' && (
            <>
              {isAdmin ? (
                <DataImport />
              ) : (
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Administrator Access Required
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Data import functionality is restricted to administrators
                    only. Please contact your system administrator for
                    assistance.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'backup' && (
            <>
              {isAdmin ? (
                <DataBackup />
              ) : (
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Administrator Access Required
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Backup and restore functionality is restricted to
                    administrators only. Please contact your system
                    administrator for assistance.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'seed' && (
            <>
              {isAdmin ? (
                <DataSeed />
              ) : (
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Administrator Access Required
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Seed and validation functionality is restricted to
                    administrators only. Please contact your system
                    administrator for assistance.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 dark:bg-blue-950 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Data Management Guidelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Export Best Practices
              </h4>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                <li>• Use date filters to export specific time periods</li>
                <li>• CSV format is recommended for spreadsheet analysis</li>
                <li>• JSON format preserves exact data structure</li>
                <li>• PDF format creates professional reports</li>
                <li>• Regular exports can serve as data backups</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Import Guidelines
              </h4>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                <li>• Always validate data before importing</li>
                <li>• Ensure CSV headers match expected format</li>
                <li>• Import creates or updates existing records</li>
                <li>• Backup existing data before large imports</li>
                <li>• Use preview feature to check data quality</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Backup & Restore
              </h4>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                <li>• Create regular full database backups</li>
                <li>• Store backups in secure, separate locations</li>
                <li>• Test restore procedures periodically</li>
                <li>• Backup before major data operations</li>
                <li>• Document backup and restore procedures</li>
              </ul>
            </div>
          </div>
        </div>
      </ContentLayout>
    </ProtectedRoute>
  );
}