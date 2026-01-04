'use client';

import { useState } from 'react';
import { Sprout, CheckCircle2, AlertCircle, Loader2, Database, FileCheck, Sparkles, RotateCcw, Clock } from 'lucide-react';

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

interface DemoSeedResult {
  success: boolean;
  message?: string;
  summary?: {
    totalSteps: number;
    successful: number;
    warnings: number;
    totalDuration: string;
    businessTypes: string[];
    features: string[];
  };
  results?: Array<{
    step: string;
    script: string;
    status: string;
    duration: number;
    output?: string;
  }>;
  warnings?: Array<{
    step: string;
    script: string;
    error: string;
    severity: string;
  }>;
  error?: string;
  details?: string;
}

interface DemoRestoreResult {
  success: boolean;
  message?: string;
  duration?: string;
  error?: string;
}

export function DataSeed() {
  const [seeding, setSeeding] = useState(false);
  const [validating, setValidating] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);

  // Demo Data Management State
  const [demoSeeding, setDemoSeeding] = useState(false);
  const [demoRestoring, setDemoRestoring] = useState(false);
  const [demoSeedResult, setDemoSeedResult] = useState<DemoSeedResult | null>(null);
  const [demoRestoreResult, setDemoRestoreResult] = useState<DemoRestoreResult | null>(null);
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>(['restaurant', 'grocery', 'hardware', 'clothing']);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['all']);
  const [daysOfHistory, setDaysOfHistory] = useState<number>(30);

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

  const handleDemoSeed = async () => {
    setDemoSeeding(true);
    setDemoSeedResult(null);

    try {
      const response = await fetch('/api/admin/seed-complete-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessTypes: selectedBusinessTypes,
          features: selectedFeatures,
          daysOfHistory
        })
      });

      const result = await response.json();
      setDemoSeedResult(result);
    } catch (error: any) {
      setDemoSeedResult({
        success: false,
        error: error.message || 'Failed to seed demo data'
      });
    } finally {
      setDemoSeeding(false);
    }
  };

  const handleDemoRestore = async () => {
    if (!confirm('⚠️ This will delete all existing demo data and restore from template. Continue?')) {
      return;
    }

    setDemoRestoring(true);
    setDemoRestoreResult(null);

    try {
      const response = await fetch('/api/admin/restore-demo-template', {
        method: 'POST'
      });

      const result = await response.json();
      setDemoRestoreResult(result);
    } catch (error: any) {
      setDemoRestoreResult({
        success: false,
        error: error.message || 'Failed to restore demo template'
      });
    } finally {
      setDemoRestoring(false);
    }
  };

  const toggleBusinessType = (type: string) => {
    setSelectedBusinessTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleFeature = (feature: string) => {
    if (feature === 'all') {
      setSelectedFeatures(['all']);
    } else {
      const filtered = selectedFeatures.filter(f => f !== 'all');
      if (filtered.includes(feature)) {
        setSelectedFeatures(filtered.filter(f => f !== feature));
      } else {
        setSelectedFeatures([...filtered, feature]);
      }
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
              Populate all 95 database tables with comprehensive test data (sessions excluded). The script is re-runnable and will skip existing records.
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

      {/* Demo Data Management Section */}
      <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-6 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Complete Demo Data Management
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Comprehensive demo data seeding with all features: 4 businesses, 16 employees, 1,284 products, WiFi tokens, printers, payroll, HR, and construction projects.
            </p>

            {/* Business Types Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Business Types
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'restaurant', label: '🍽️ Restaurant' },
                  { value: 'grocery', label: '🛒 Grocery' },
                  { value: 'hardware', label: '🔧 Hardware' },
                  { value: 'clothing', label: '👔 Clothing' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleBusinessType(value)}
                    disabled={demoSeeding}
                    className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                      selectedBusinessTypes.includes(value)
                        ? 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-300'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Features Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Features
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'all', label: '✨ All Features' },
                  { value: 'wifi', label: '📡 WiFi Portal' },
                  { value: 'printers', label: '🖨️ Printers' },
                  { value: 'payroll', label: '💰 Payroll' },
                  { value: 'hr', label: '👥 HR Features' },
                  { value: 'construction', label: '🏗️ Construction' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleFeature(value)}
                    disabled={demoSeeding}
                    className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                      selectedFeatures.includes(value)
                        ? 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-300'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Days of History */}
            <div className="mb-4">
              <label htmlFor="daysOfHistory" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Days of History: <span className="text-purple-600 dark:text-purple-400 font-semibold">{daysOfHistory}</span>
              </label>
              <input
                type="range"
                id="daysOfHistory"
                min="7"
                max="90"
                step="1"
                value={daysOfHistory}
                onChange={(e) => setDaysOfHistory(Number(e.target.value))}
                disabled={demoSeeding}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>7 days</span>
                <span>90 days</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleDemoSeed}
                disabled={demoSeeding || demoRestoring || selectedBusinessTypes.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-400 disabled:cursor-not-allowed"
              >
                {demoSeeding ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Seeding Demo Data...
                  </>
                ) : (
                  <>
                    <Sparkles className="-ml-1 mr-2 h-4 w-4" />
                    Seed Complete Demo Data
                  </>
                )}
              </button>

              <button
                onClick={handleDemoRestore}
                disabled={demoSeeding || demoRestoring}
                className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {demoRestoring ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="-ml-1 mr-2 h-4 w-4" />
                    Reset to Demo Template
                  </>
                )}
              </button>
            </div>

            {/* Demo Seed Result */}
            {demoSeedResult && (
              <div className={`mt-4 p-4 rounded-md ${
                demoSeedResult.success
                  ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'
                  : 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800'
              }`}>
                <div className="flex items-start">
                  {demoSeedResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4 className={`text-sm font-semibold ${
                      demoSeedResult.success
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {demoSeedResult.success ? 'Demo Data Seeded Successfully!' : 'Seeding Failed'}
                    </h4>
                    {demoSeedResult.message && (
                      <p className={`text-sm mt-1 ${
                        demoSeedResult.success
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {demoSeedResult.message}
                      </p>
                    )}
                    {demoSeedResult.summary && (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-white/50 dark:bg-slate-900/50 p-2 rounded">
                            <span className="text-slate-600 dark:text-slate-400">Total Steps:</span>
                            <span className="ml-2 font-semibold text-green-700 dark:text-green-300">
                              {demoSeedResult.summary.totalSteps}
                            </span>
                          </div>
                          <div className="bg-white/50 dark:bg-slate-900/50 p-2 rounded">
                            <span className="text-slate-600 dark:text-slate-400">Successful:</span>
                            <span className="ml-2 font-semibold text-green-700 dark:text-green-300">
                              {demoSeedResult.summary.successful}
                            </span>
                          </div>
                          <div className="bg-white/50 dark:bg-slate-900/50 p-2 rounded">
                            <span className="text-slate-600 dark:text-slate-400">Duration:</span>
                            <span className="ml-2 font-semibold text-green-700 dark:text-green-300">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {demoSeedResult.summary.totalDuration}
                            </span>
                          </div>
                          {demoSeedResult.summary.warnings > 0 && (
                            <div className="bg-yellow-50/50 dark:bg-yellow-900/50 p-2 rounded">
                              <span className="text-slate-600 dark:text-slate-400">Warnings:</span>
                              <span className="ml-2 font-semibold text-yellow-700 dark:text-yellow-300">
                                {demoSeedResult.summary.warnings}
                              </span>
                            </div>
                          )}
                        </div>
                        {demoSeedResult.results && demoSeedResult.results.length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm font-medium text-green-700 dark:text-green-300 hover:text-green-600 dark:hover:text-green-200">
                              View Detailed Results ({demoSeedResult.results.length} steps)
                            </summary>
                            <div className="mt-2 max-h-64 overflow-y-auto border border-green-200 dark:border-green-800 rounded">
                              <table className="min-w-full text-xs">
                                <thead className="sticky top-0 bg-green-100 dark:bg-green-900">
                                  <tr>
                                    <th className="px-2 py-1 text-left">Step</th>
                                    <th className="px-2 py-1 text-left">Script</th>
                                    <th className="px-2 py-1 text-center">Status</th>
                                    <th className="px-2 py-1 text-right">Duration</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-green-200 dark:divide-green-800">
                                  {demoSeedResult.results.map((result, idx) => (
                                    <tr key={idx} className="hover:bg-green-50 dark:hover:bg-green-950">
                                      <td className="px-2 py-1">{result.step}</td>
                                      <td className="px-2 py-1 text-slate-600 dark:text-slate-400">{result.script}</td>
                                      <td className="px-2 py-1 text-center">
                                        {result.status === 'success' ? (
                                          <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 inline" />
                                        ) : (
                                          <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 inline" />
                                        )}
                                      </td>
                                      <td className="px-2 py-1 text-right text-slate-600 dark:text-slate-400">
                                        {(result.duration / 1000).toFixed(1)}s
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        )}
                        {demoSeedResult.warnings && demoSeedResult.warnings.length > 0 && (
                          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
                            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                              ⚠️ Warnings ({demoSeedResult.warnings.length})
                            </p>
                            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                              {demoSeedResult.warnings.map((warning, idx) => (
                                <li key={idx}>
                                  <span className="font-medium">{warning.step}:</span> {warning.error}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {demoSeedResult.error && (
                      <p className="text-sm mt-1 text-red-700 dark:text-red-300">
                        Error: {demoSeedResult.error}
                      </p>
                    )}
                    {demoSeedResult.details && (
                      <p className="text-sm mt-1 text-red-700 dark:text-red-300">
                        {demoSeedResult.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Demo Restore Result */}
            {demoRestoreResult && (
              <div className={`mt-4 p-4 rounded-md ${
                demoRestoreResult.success
                  ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'
                  : 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800'
              }`}>
                <div className="flex items-start">
                  {demoRestoreResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-2" />
                  )}
                  <div className="flex-1">
                    <h4 className={`text-sm font-semibold ${
                      demoRestoreResult.success
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {demoRestoreResult.success ? 'Demo Template Restored Successfully!' : 'Restoration Failed'}
                    </h4>
                    {demoRestoreResult.message && (
                      <p className={`text-sm mt-1 ${
                        demoRestoreResult.success
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {demoRestoreResult.message}
                      </p>
                    )}
                    {demoRestoreResult.duration && (
                      <p className="text-sm mt-1 text-green-700 dark:text-green-300">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Duration: {demoRestoreResult.duration}
                      </p>
                    )}
                    {demoRestoreResult.error && (
                      <p className="text-sm mt-1 text-red-700 dark:text-red-300">
                        Error: {demoRestoreResult.error}
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
                          Tables Matched: {validationResult.results.tablesMatched} / 95
                        </p>
                        <div className="mt-3">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                            All Tables ({Object.keys(validationResult.results.summary).length} total):
                          </p>
                          <div className="max-h-96 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded">
                            <table className="min-w-full text-sm">
                              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                                <tr>
                                  <th className="px-3 py-2 text-left">Table</th>
                                  <th className="px-3 py-2 text-right">Database</th>
                                  <th className="px-3 py-2 text-right">Backup</th>
                                  <th className="px-3 py-2 text-right">Diff</th>
                                  <th className="px-3 py-2 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {Object.entries(validationResult.results.summary).map(([tableName, tableData]: [string, any]) => {
                                  const dbCount = typeof tableData.database === 'number' ? tableData.database : 0;
                                  const backupCount = typeof tableData.backup === 'number' ? tableData.backup : 0;
                                  const diff = dbCount - backupCount;
                                  const matched = tableData.matched;

                                  return (
                                    <tr key={tableName} className={matched ? '' : 'bg-red-50 dark:bg-red-950'}>
                                      <td className="px-3 py-2 font-medium">{tableName}</td>
                                      <td className="px-3 py-2 text-right">{dbCount}</td>
                                      <td className="px-3 py-2 text-right">{backupCount}</td>
                                      <td className={`px-3 py-2 text-right font-semibold ${
                                        diff === 0 ? 'text-slate-500' : diff > 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                                      }`}>
                                        {diff !== 0 && (diff > 0 ? '+' : '')}{diff === 0 ? '—' : diff}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        {matched ? (
                                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 inline" />
                                        ) : (
                                          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 inline" />
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
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
          <li>The seed script populates all 95 tables with test data (sessions excluded)</li>
          <li>It's re-runnable and will skip records that already exist</li>
          <li>Validation compares backup file record counts with database</li>
          <li>Use this to ensure your backup system captures all data</li>
        </ul>
      </div>
    </div>
  );
}
