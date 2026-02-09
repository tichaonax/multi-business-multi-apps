'use client'

import { useState } from 'react'

interface CloseBooksBannerProps {
  businessId: string
  date: string
  managerName: string
}

export function CloseBooksBanner({ businessId, date, managerName }: CloseBooksBannerProps) {
  const [closingBooks, setClosingBooks] = useState(false)
  const [booksClosed, setBooksClosed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  if (booksClosed) {
    return (
      <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
        <span className="text-sm text-green-700 dark:text-green-400 font-medium">
          🔒 Books closed for {date}
        </span>
      </div>
    )
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        🔒 Close Books for {date}
      </button>
    )
  }

  return (
    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p className="text-sm text-red-700 dark:text-red-400 mb-2 font-medium">
        Close books for {date}? This will prevent any more manual entries for this date.
      </p>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setClosingBooks(true)
            setError(null)
            try {
              const res = await fetch('/api/universal/close-books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId, date, managerName }),
              })
              const data = await res.json()
              if (!res.ok) {
                setError(data.error || 'Failed to close books')
              } else {
                setBooksClosed(true)
                setShowConfirm(false)
              }
            } catch {
              setError('Network error')
            } finally {
              setClosingBooks(false)
            }
          }}
          disabled={closingBooks}
          className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
        >
          {closingBooks ? 'Closing...' : 'Confirm Close'}
        </button>
        <button
          onClick={() => { setShowConfirm(false); setError(null) }}
          className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
