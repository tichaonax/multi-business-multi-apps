import { useState, useCallback } from 'react'

export type QuickEditMode = 'none' | 'image' | 'price'

/**
 * Mutually-exclusive Image Upload / Price Adjustment mode toggle for the POS
 * quick-edit feature (MBM-290). Pressing a button activates its mode and clears
 * the other; pressing the same (already-active) button returns to 'none'.
 */
export function usePosQuickEditMode() {
  const [activeMode, setActiveMode] = useState<QuickEditMode>('none')

  const toggleImageMode = useCallback(() => {
    setActiveMode(prev => (prev === 'image' ? 'none' : 'image'))
  }, [])

  const togglePriceMode = useCallback(() => {
    setActiveMode(prev => (prev === 'price' ? 'none' : 'price'))
  }, [])

  const exitMode = useCallback(() => setActiveMode('none'), [])

  return { activeMode, toggleImageMode, togglePriceMode, exitMode }
}
