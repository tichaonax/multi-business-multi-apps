'use client'

import { useState } from 'react'
import type { DiffItem } from '@/app/api/admin/seed-templates/diff/route'

interface DiffViewerProps {
  items: DiffItem[]
  onClose: () => void
}

export function DiffViewer({ items, onClose }: DiffViewerProps) {
  const [filter, setFilter] = useState<'all' | 'added' | 'removed' | 'modified'>('all')
  
  const filteredItems = items.filter(item => 
    filter === 'all' || item.status === filter
  )

  const counts = {
    added: items.filter(i => i.status === 'added').length,
    removed: items.filter(i => i.status === 'removed').length,
    modified: items.filter(i => i.status === 'modified').length
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Template Diff Viewer
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comparing template with existing business data
          </p>
        </div>

        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilter('added')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'added'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              + Added ({counts.added})
            </button>
            <button
              onClick={() => setFilter('removed')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'removed'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              - Removed ({counts.removed})
            </button>
            <button
              onClick={() => setFilter('modified')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'modified'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ~ Modified ({counts.modified})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No {filter !== 'all' ? filter : ''} items found
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 ${
                  item.status === 'added'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : item.status === 'removed'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : item.status === 'modified'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">
                        {item.type === 'category' && '📁'}
                        {item.type === 'subcategory' && '📂'}
                        {item.type === 'product' && '📦'}
                      </span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </h3>
                      <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded ${
                        item.status === 'added'
                          ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100'
                          : item.status === 'removed'
                          ? 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100'
                          : item.status === 'modified'
                          ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100'
                          : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Show changes for modified items */}
                    {item.status === 'modified' && item.changes && item.changes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {item.changes.map((change, changeIdx) => (
                          <div key={changeIdx} className="flex items-start gap-4 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">
                              {change.field}:
                            </span>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-red-600 dark:text-red-400">-</span>
                                <code className="bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded text-red-900 dark:text-red-200">
                                  {JSON.stringify(change.oldValue)}
                                </code>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400">+</span>
                                <code className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded text-green-900 dark:text-green-200">
                                  {JSON.stringify(change.newValue)}
                                </code>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show existing vs template for added/removed */}
                    {(item.status === 'added' || item.status === 'removed') && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(item.existing || item.template, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Close Diff Viewer
          </button>
        </div>
      </div>
    </div>
  )
}
