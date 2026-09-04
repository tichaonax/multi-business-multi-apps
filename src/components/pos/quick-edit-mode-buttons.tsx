'use client'

import { QuickEditMode } from '@/hooks/use-pos-quick-edit-mode'

interface Props {
  activeMode: QuickEditMode
  onToggleImage: () => void
  onTogglePrice: () => void
  /** Compact icon-only buttons for tight header bars (defaults to false — label + icon). */
  compact?: boolean
}

/**
 * The two POS header toggle buttons (MBM-290). Only rendered by the parent POS
 * page when the current user has `canQuickEditPOSItems` — this component itself
 * does no permission checking, it just renders whatever `activeMode` it's given.
 */
export function QuickEditModeButtons({ activeMode, onToggleImage, onTogglePrice, compact = false }: Props) {
  const base = 'px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium flex items-center gap-1'

  return (
    <>
      <button
        type="button"
        onClick={onToggleImage}
        title={activeMode === 'image' ? 'Image mode active — click to exit' : 'Update menu-item images'}
        aria-pressed={activeMode === 'image'}
        className={`${base} ${
          activeMode === 'image'
            ? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-500'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        📷 <span className={compact ? 'hidden' : 'hidden sm:inline'}>Update Images</span>
        {activeMode === 'image' && <span className="text-[10px] font-bold uppercase tracking-wide">● Active</span>}
      </button>
      <button
        type="button"
        onClick={onTogglePrice}
        title={activeMode === 'price' ? 'Price mode active — click to exit' : 'Adjust menu-item prices'}
        aria-pressed={activeMode === 'price'}
        className={`${base} ${
          activeMode === 'price'
            ? 'bg-green-600 text-white ring-2 ring-green-300 dark:ring-green-500'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        💲 <span className={compact ? 'hidden' : 'hidden sm:inline'}>Adjust Prices</span>
        {activeMode === 'price' && <span className="text-[10px] font-bold uppercase tracking-wide">● Active</span>}
      </button>
    </>
  )
}
