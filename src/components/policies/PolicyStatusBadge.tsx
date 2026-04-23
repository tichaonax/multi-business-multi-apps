'use client'

const COLORS: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  PUBLISHED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  ARCHIVED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  ACKNOWLEDGED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  PENDING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  WAIVED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
}

const LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
  ACKNOWLEDGED: 'Acknowledged',
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
  WAIVED: 'Waived',
}

export function PolicyStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
