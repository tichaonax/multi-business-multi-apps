'use client'

import { Building2, Users, CheckCircle2 } from 'lucide-react'

interface Business {
  id: string
  name: string
  type: string
  shortName: string | null
  employeeCount: number
  isActive: boolean
}

interface BusinessSelectorProps {
  businesses: Business[]
  selectedBusinessId: string | null
  onSelect: (businessId: string) => void
  loading?: boolean
}

export function BusinessSelector({
  businesses,
  selectedBusinessId,
  onSelect,
  loading = false
}: BusinessSelectorProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Target Business:
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-24"
            />
          ))}
        </div>
      </div>
    )
  }

  if (businesses.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Compatible Businesses
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          There are no active businesses of the same type available for transfer.
          You must create a compatible business first or cancel the deletion.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Select Target Business ({businesses.length} available):
      </div>
      <div className="grid gap-3 md:grid-cols-2 max-h-96 overflow-y-auto pr-2">
        {businesses.map((business) => {
          const isSelected = business.id === selectedBusinessId

          return (
            <button
              key={business.id}
              onClick={() => onSelect(business.id)}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow'
              }`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              )}

              {/* Business Icon & Name */}
              <div className="flex items-start gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected 
                    ? 'bg-blue-100 dark:bg-blue-800' 
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Building2 className={`w-5 h-5 ${
                    isSelected 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold truncate ${
                    isSelected 
                      ? 'text-blue-900 dark:text-blue-100' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {business.name}
                  </h4>
                  {business.shortName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {business.shortName}
                    </p>
                  )}
                </div>
              </div>

              {/* Business Details */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>{business.employeeCount} employee{business.employeeCount !== 1 ? 's' : ''}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  isSelected
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {business.type}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {selectedBusinessId && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ✓ Business selected. Click "Next" to preview the transfer.
          </p>
        </div>
      )}
    </div>
  )
}
