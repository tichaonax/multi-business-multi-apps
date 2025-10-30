'use client';

import { useState, useRef } from 'react';
import { useConfirm, useAlert } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Users,
  Building,
  UserCheck,
  Loader2,
  Eye,
  AlertCircle,
} from 'lucide-react';

interface ImportOptions {
  dataType: 'users' | 'businesses' | 'employees' | 'business-memberships';
  mode: 'create' | 'update' | 'upsert';
  validateOnly: boolean;
}

interface ImportResult {
  success: boolean;
  message: string;
  results?: {
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    previewData: any[];
  };
}

export function DataImport() {
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    dataType: 'users',
    mode: 'create',
    validateOnly: false,
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm()
  const customAlert = useAlert()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/json' || selectedFile.name.endsWith('.csv')) {
        setImportFile(selectedFile);
        setImportResult(null);
        setShowPreview(false);
      } else {
        await customAlert({ title: 'Invalid File', description: 'Please select a JSON or CSV file.' });
      }
    }
  };

  const handlePreview = async () => {
    if (!importFile) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('dataType', importOptions.dataType);
      formData.append('mode', importOptions.mode);
      formData.append('validateOnly', 'true');

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const result = await response.json();
      setImportResult(result);
      setShowPreview(true);

    } catch (error) {
      await customAlert({ title: 'Preview Failed', description: 'Preview failed. Please check the file format and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    const ok = await confirm({ title: 'Import data', description: 'Are you sure you want to import this data? This action may modify existing records.', confirmText: 'Import', cancelText: 'Cancel' })
    if (!ok) return

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('dataType', importOptions.dataType);
      formData.append('mode', importOptions.mode);
      formData.append('validateOnly', 'false');

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult(result);
      setShowPreview(false);

    } catch (error) {
      await customAlert({ title: 'Import Failed', description: 'Import failed. Please check the file format and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setImportFile(null);
    setImportResult(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const dataTypes = [
    {
      id: 'users' as const,
      name: 'Users',
      description: 'Import user accounts and basic information',
      icon: Users,
      requiredFields: ['email', 'name', 'role'],
      optionalFields: ['passwordHash', 'permissions', 'isActive'],
    },
    {
      id: 'businesses' as const,
      name: 'Businesses',
      description: 'Import business information and settings',
      icon: Building,
      requiredFields: ['name', 'type'],
      optionalFields: ['description', 'settings', 'isActive'],
    },
    {
      id: 'employees' as const,
      name: 'Employees',
      description: 'Import employee records and employment data',
      icon: UserCheck,
      requiredFields: ['employeeNumber', 'fullName', 'phone', 'nationalId', 'jobTitleId', 'compensationTypeId', 'primaryBusinessId'],
      optionalFields: ['email', 'address', 'hireDate', 'isActive'],
    },
    {
      id: 'business-memberships' as const,
      name: 'Business Memberships',
      description: 'Import user-business relationships and roles',
      icon: UserCheck,
      requiredFields: ['userId', 'businessId', 'role'],
      optionalFields: ['permissions', 'isActive', 'templateId'],
    },
  ];

  const modes = [
    {
      id: 'create' as const,
      name: 'Create Only',
      description: 'Only create new records, skip existing ones',
    },
    {
      id: 'update' as const,
      name: 'Update Only',
      description: 'Only update existing records, skip new ones',
    },
    {
      id: 'upsert' as const,
      name: 'Create or Update',
      description: 'Create new records or update existing ones',
    },
  ];

  const selectedDataType = dataTypes.find(type => type.id === importOptions.dataType);

  return (
    <div className="space-y-6">
      {/* Data Type Selection */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Select Data Type to Import
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${importOptions.dataType === type.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                onClick={() =>
                  setImportOptions({ ...importOptions, dataType: type.id })
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
      </div>

      {/* Import Mode Selection */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Import Mode
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modes.map((mode) => (
            <div
              key={mode.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${importOptions.mode === mode.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              onClick={() =>
                setImportOptions({ ...importOptions, mode: mode.id })
              }
            >
              <h4 className="font-medium text-slate-900 dark:text-slate-100">
                {mode.name}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {mode.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Field Requirements */}
      {selectedDataType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
            Field Requirements for {selectedDataType.name}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Required Fields
              </h5>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                {selectedDataType.requiredFields.map((field) => (
                  <li key={field}>• {field}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Optional Fields
              </h5>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                {selectedDataType.optionalFields.map((field) => (
                  <li key={field}>• {field}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* File Upload */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Upload File
        </h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${importFile
              ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
              : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
            }`}
        >
          {importFile ? (
            <div className="space-y-2">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
              <p className="text-green-900 dark:text-green-100 font-medium">
                File selected
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Different File
                </Button>
                <Button
                  variant="outline"
                  onClick={clearFile}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <FileText className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-slate-900 dark:text-slate-100 font-medium">
                Select Import File
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose a CSV or JSON file to import
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

      {/* Action Buttons */}
      {importFile && (
        <div className="flex justify-end gap-3">
          <Button
            onClick={handlePreview}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {loading ? 'Validating...' : 'Preview & Validate'}
          </Button>

          <Button
            onClick={handleImport}
            disabled={loading || !importResult?.validation?.isValid}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {loading ? 'Importing...' : 'Import Data'}
          </Button>
        </div>
      )}

      {/* Validation Results */}
      {importResult?.validation && showPreview && (
        <div className={`p-4 rounded-lg border ${importResult.validation.isValid
            ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
            : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          }`}>
          <div className="flex items-center gap-2 mb-4">
            {importResult.validation.isValid ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <h4 className={`font-medium ${importResult.validation.isValid
                ? 'text-green-900 dark:text-green-100'
                : 'text-red-900 dark:text-red-100'
              }`}>
              {importResult.validation.isValid ? 'Validation Passed' : 'Validation Failed'}
            </h4>
          </div>

          {importResult.validation.errors.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-red-900 dark:text-red-100 mb-2">
                Errors ({importResult.validation.errors.length}):
              </h5>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importResult.validation.errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm text-red-800 dark:text-red-200"
                  >
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {importResult.validation.warnings.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                Warnings ({importResult.validation.warnings.length}):
              </h5>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importResult.validation.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="text-sm text-yellow-800 dark:text-yellow-200"
                  >
                    • {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {importResult.validation.previewData.length > 0 && (
            <div>
              <h5 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                Preview Data (showing first 5 records):
              </h5>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {Object.keys(importResult.validation.previewData[0]).map((key) => (
                        <th key={key} className="text-left p-2 font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.validation.previewData.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td key={cellIndex} className="p-2">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Results */}
      {importResult?.results && !showPreview && (
        <div className={`p-4 rounded-lg border ${importResult.success
            ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
            : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          }`}>
          <div className="flex items-center gap-2 mb-4">
            {importResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <h4 className={`font-medium ${importResult.success
                ? 'text-green-900 dark:text-green-100'
                : 'text-red-900 dark:text-red-100'
              }`}>
              {importResult.success ? 'Import Completed' : 'Import Failed'}
            </h4>
          </div>

          {importResult.results && (
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div className="text-green-800 dark:text-green-200">
                <span className="font-medium">Created:</span>{' '}
                <span className="font-bold text-green-900 dark:text-green-100">
                  {importResult.results.created}
                </span>
              </div>
              <div className="text-blue-800 dark:text-blue-200">
                <span className="font-medium">Updated:</span>{' '}
                <span className="font-bold text-blue-900 dark:text-blue-100">
                  {importResult.results.updated}
                </span>
              </div>
              <div className="text-yellow-800 dark:text-yellow-200">
                <span className="font-medium">Skipped:</span>{' '}
                <span className="font-bold text-yellow-900 dark:text-yellow-100">
                  {importResult.results.skipped}
                </span>
              </div>
            </div>
          )}

          {importResult.results?.errors.length > 0 && (
            <div>
              <h5 className="font-medium text-red-900 dark:text-red-100 mb-2">
                Errors ({importResult.results.errors.length}):
              </h5>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importResult.results.errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm text-red-800 dark:text-red-200"
                  >
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}