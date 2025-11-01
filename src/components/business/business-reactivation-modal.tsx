'use client'

import { useState } from 'react'
import { X, AlertTriangle, RefreshCw } from 'lucide-react'

interface BusinessReactivationModalProps {
  business: {
    id: string
    name: string
    type: string
  }
  onClose: () => void
  onSuccess: () => void
}

export default function BusinessReactivationModal({ 
  business, 
  onClose, 
  onSuccess 
}: BusinessReactivationModalProps) {
  const [isReactivating, setIsReactivating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReactivate = async () => {
    setIsReactivating(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/businesses/${business.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: true
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reactivate business')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setIsReactivating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Reactivate Business
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isReactivating}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">You are about to reactivate:</p>
                <p className="font-semibold">{business.name}</p>
                <p className="text-xs mt-1 opacity-80">Type: {business.type}</p>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>Reactivating this business will:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Make it visible in business lists</li>
              <li>Allow users to access its data again</li>
              <li>Enable all business operations</li>
              <li>Restore it to the business switcher</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isReactivating}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleReactivate}
            disabled={isReactivating}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isReactivating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Reactivating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Reactivate Business
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
