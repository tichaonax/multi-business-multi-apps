'use client'

import { QuickEditMode } from '@/hooks/use-pos-quick-edit-mode'

interface Props {
  mode: Exclude<QuickEditMode, 'none'>
  onClick: () => void
}

/**
 * Per-card corner action button shown while a quick-edit mode is active
 * (MBM-290). Parent card container needs `relative` positioning — this renders
 * `absolute bottom-1 right-1`. Camera icon for image mode, $ tag for price mode,
 * distinct colors so the two are never confused at a glance.
 */
export function QuickEditCardButton({ mode, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      title={mode === 'image' ? 'Update image' : 'Adjust price'}
      className={`absolute bottom-1 right-1 z-20 w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-lg border-2 border-white dark:border-gray-900 ${
        mode === 'image' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
      }`}
    >
      {mode === 'image' ? '📷' : '💲'}
    </button>
  )
}
