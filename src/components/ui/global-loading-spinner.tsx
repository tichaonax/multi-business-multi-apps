'use client'

import { useNavigation } from '@/contexts/navigation-context'

export function GlobalLoadingSpinner() {
  const { isNavigating } = useNavigation()

  if (!isNavigating) return null

  return (
    // Make overlay visually dim the page but allow clicks to pass through
    // so underlying View buttons remain clickable. The inner panel keeps pointer events enabled.
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col items-center space-y-4 pointer-events-auto">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-primary font-medium">Loading...</p>
      </div>
    </div>
  )
}