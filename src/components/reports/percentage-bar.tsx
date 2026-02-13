/**
 * Visual percentage bar component
 * Inspired by Excel report styling
 */

interface PercentageBarProps {
  percentage: number
  color?: 'green' | 'blue' | 'red' | 'purple' | 'yellow' | 'orange'
  showLabel?: boolean
  className?: string
}

export function PercentageBar({
  percentage,
  color = 'green',
  showLabel = true,
  className = ''
}: PercentageBarProps) {
  const colorClasses = {
    green: 'bg-green-500 dark:bg-green-600',
    blue: 'bg-blue-500 dark:bg-blue-600',
    red: 'bg-red-500 dark:bg-red-600',
    purple: 'bg-purple-500 dark:bg-purple-600',
    yellow: 'bg-yellow-500 dark:bg-yellow-600',
    orange: 'bg-orange-500 dark:bg-orange-600',
  }

  // Ensure percentage is between 0 and 100, rounded to 2 decimal places
  const clampedPercentage = Math.round(Math.min(100, Math.max(0, percentage)) * 100) / 100

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
          {clampedPercentage}%
        </span>
      )}
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-5 overflow-hidden print:bg-gray-200">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300 rounded-full flex items-center justify-end pr-2`}
          style={{ width: `${clampedPercentage}%` }}
        >
          {clampedPercentage > 10 && (
            <span className="text-xs font-bold text-white drop-shadow-sm">
              {clampedPercentage}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
