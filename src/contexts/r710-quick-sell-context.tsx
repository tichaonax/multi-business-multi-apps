'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface R710QuickSellContextType {
  isOpen: boolean
  open: () => void
  close: () => void
}

const R710QuickSellContext = createContext<R710QuickSellContextType | undefined>(undefined)

/**
 * App-wide trigger for the R710 Quick Sell modal — mounted once at the root
 * layout so the sidebar's quick-sell button (rendered inside whichever
 * per-route MainLayout is active) and the modal itself (rendered once, also
 * at the root) can share the same open/close state regardless of which page
 * the user is currently on.
 */
export function R710QuickSellProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  return (
    <R710QuickSellContext.Provider value={{ isOpen, open, close }}>
      {children}
    </R710QuickSellContext.Provider>
  )
}

export function useR710QuickSell() {
  const context = useContext(R710QuickSellContext)
  if (context === undefined) {
    throw new Error('useR710QuickSell must be used within an R710QuickSellProvider')
  }
  return context
}
