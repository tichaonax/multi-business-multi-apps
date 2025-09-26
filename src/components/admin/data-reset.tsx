'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, Shield } from 'lucide-react';

export function DataResetComponent() {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<any>(null);
  const [error, setError] = useState('');

  const requiredConfirmText = 'I understand this will permanently delete all business and employee data';

  const handleReset = async () => {
    if (confirmText !== requiredConfirmText) {
      setError('Please enter the exact confirmation text');
      return;
    }

    setIsResetting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmReset: true,
          confirmMessage: confirmText,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetResult(data);
        setIsConfirming(false);
        setConfirmText('');

        // Force a page reload after a short delay to clear all cached data
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setError(data.message || 'Reset failed');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancel = () => {
    setIsConfirming(false);
    setConfirmText('');
    setError('');
  };

  if (resetResult) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                Data Reset Completed Successfully
              </h4>
              <div className="text-sm text-green-700 dark:text-green-300 mt-2">
                <p><strong>Deleted:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  <li>{resetResult.details.deletedCounts.businesses} businesses</li>
                  <li>{resetResult.details.deletedCounts.employees} employees</li>
                  <li>{resetResult.details.deletedCounts.contracts} contracts</li>
                  <li>{resetResult.details.deletedCounts.memberships} memberships</li>
                </ul>
                <p className="mt-2"><strong>Preserved:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  <li>{resetResult.details.preservedData.users} user accounts</li>
                  <li>All audit logs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Page will reload automatically in a few seconds to clear cached data...
        </p>
      </div>
    );
  }

  if (!isConfirming) {
    return (
      <button
        onClick={() => setIsConfirming(true)}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Reset All Data
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              ⚠️ CRITICAL WARNING: Permanent Data Deletion
            </h4>
            <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
              <p><strong>This action will permanently delete:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>All businesses and their details</li>
                <li>All employees and their information</li>
                <li>All employee contracts</li>
                <li>All business memberships</li>
                <li>All business-related data and relationships</li>
              </ul>

              <p><strong>This action will preserve:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>User accounts and login credentials</li>
                <li>System audit logs and activity history</li>
                <li>System settings and configurations</li>
              </ul>

              <p className="font-semibold text-red-800 dark:text-red-200">
                This action CANNOT be undone! Make sure you have a recent backup.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Type the following text to confirm:
        </label>
        <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded border mb-2">
          {requiredConfirmText}
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type confirmation text here..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          disabled={isResetting}
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={handleCancel}
          disabled={isResetting}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleReset}
          disabled={isResetting || confirmText !== requiredConfirmText}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isResetting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Resetting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Confirm Reset
            </>
          )}
        </button>
      </div>
    </div>
  );
}