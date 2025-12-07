'use client';

import { useState } from 'react';
import { Sprout, CheckCircle2, AlertCircle, Loader2, Database, FileCheck } from 'lucide-react';

interface SeedResult {
  success: boolean;
  message?: string;
  stats?: {
    tables: string;
    records: string;
  };
  error?: string;
  output?: string;
}

interface ValidationResult {
  success: boolean;
  validated?: boolean;
  backupFile?: string;
  results?: {
    tablesMatched: number;
    tablesMismatched: number;
    mismatches: Array<{
      table: string;
      database: number;
      backup: number;
      difference: number;
    }>;
  };
  error?: string;
}

export function DataSeed() {
  const [seeding, setSeeding] = useState(false);
  const [validating, setValidating] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);

    try {
      const response = await fetch('/api/admin/seed', {
        method: 'POST'
      });

      const result = await response.json();
      setSeedResult(result);
    } catch (error: any) {
      setSeedResult({
        success: false,
        error: error.message
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedBackupFile) {
      setValidationResult({
        success: false,
        error: 'Please select a backup file'
      });
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      // Read the file content
      const fileContent = await selectedBackupFile.text();
      const backupData = JSON.parse(fileContent);

      const response = await fetch('/api/admin/validate-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          backupFileName: selectedBackupFile.name,
          backupData
        })
      });

      const result = await response.json();
      setValidationResult(result);
    } catch (error: any) {
      setValidationResult({
        success: false,
        error: error.message || 'Failed to read or parse backup file'
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seed Test Data Section */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Sprout className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Seed Test Data
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Populate all 96 database tables with comprehensive test data. The script is re-runnable and will skip existing records.
            </p>

            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
            >
              {seeding ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Seeding Data...
                </>
              ) : (
                <>
                  <Database className="-ml-1 mr-2 h-4 w-4" />
                  Run Seed Script
                </>
              )}
            </button>

            {seedResult && (
              <div className={`mt-4 p-4 rounded-md ${
                seedResult.success
                  ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'
                  : 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800'
              }`}>
                <div className="flex items-start">
                  {seedResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-2" />
                  )}
                  <div className="flex-1">
                    <h4 className={`text-sm font-semibold ${
                      seedResult.success
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {seedResult.success ? 'Seed Completed Successfully' : 'Seed Failed'}
                    </h4>
                    {seedResult.message && (
                      <p className={`text-sm mt-1 ${
                        seedResult.success
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {seedResult.message}
                      </p>
                    )}
                    {seedResult.stats && (
                      <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                        <p>Tables: {seedResult.stats.tables}</p>
                        <p>Records: {seedResult.stats.records}</p>
                      </div>
                    )}
                    {seedResult.error && (
                      <p className="text-sm mt-1 text-red-700 dark:text-red-300">
                        Error: {seedResult.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validate Backup Section */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Validate Backup File
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Compare a backup file against the current database to ensure all data is captured correctly.
            </p>

            <div className="mb-4">
              <label htmlFor="backupFile" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Backup File
              </label>
              <input
                type="file"
                id="backupFile"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setSelectedBackupFile(file || null);
                }}
                className="block w-full text-sm text-slate-500 dark:text-slate-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-blue-900 dark:file:text-blue-300
                  dark:hover:file:bg-blue-800"
              />
              {selectedBackupFile && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Selected: {selectedBackupFile.name} ({(selectedBackupFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <button
              onClick={handleValidate}
              disabled={validating || !selectedBackupFile}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {validating ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Validating...
                </>
              ) : (
                <>
                  <FileCheck className="-ml-1 mr-2 h-4 w-4" />
                  Validate Backup
                </>
              )}
            </button>

            {validationResult && (
              <div className={`mt-4 p-4 rounded-md ${
                validationResult.validated
                  ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'
                  : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
              }`}>
                <div className="flex items-start">
                  {validationResult.validated ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2" />
                  )}
                  <div className="flex-1">
                    <h4 className={`text-sm font-semibold ${
                      validationResult.validated
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-yellow-900 dark:text-yellow-100'
                    }`}>
                      {validationResult.validated ? 'Validation Passed!' : 'Validation Issues Found'}
                    </h4>
                    {validationResult.results && (
                      <div className="mt-2 space-y-2">
                        <p className={`text-sm ${
                          validationResult.validated
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-yellow-700 dark:text-yellow-300'
                        }`}>
                          Tables Matched: {validationResult.results.tablesMatched} / 96
                        </p>
                        {validationResult.results.tablesMismatched > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                              Mismatched Tables:
                            </p>
                            <div className="max-h-60 overflow-y-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="bg-yellow-100 dark:bg-yellow-900">
                                    <th className="px-3 py-2 text-left">Table</th>
                                    <th className="px-3 py-2 text-right">Database</th>
                                    <th className="px-3 py-2 text-right">Backup</th>
                                    <th className="px-3 py-2 text-right">Diff</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-yellow-200 dark:divide-yellow-800">
                                  {validationResult.results.mismatches.map((mismatch, idx) => (
                                    <tr key={idx}>
                                      <td className="px-3 py-2">{mismatch.table}</td>
                                      <td className="px-3 py-2 text-right">{mismatch.database}</td>
                                      <td className="px-3 py-2 text-right">{mismatch.backup}</td>
                                      <td className={`px-3 py-2 text-right ${
                                        mismatch.difference > 0 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {mismatch.difference > 0 ? '+' : ''}{mismatch.difference}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {validationResult.error && (
                      <p className="text-sm mt-1 text-red-700 dark:text-red-300">
                        Error: {validationResult.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 dark:bg-slate-900 dark:border-slate-700">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          About Seed & Validate
        </h4>
        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
          <li>The seed script populates all 96 tables with test data</li>
          <li>It's re-runnable and will skip records that already exist</li>
          <li>Validation compares backup file record counts with database</li>
          <li>Use this to ensure your backup system captures all data</li>
        </ul>
      </div>
    </div>
  );
}
