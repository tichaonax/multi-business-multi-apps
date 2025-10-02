'use client'

import React, { createContext, useContext, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface CollapsibleContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const CollapsibleContext = createContext<CollapsibleContextType | null>(null)

function useCollapsible() {
  const context = useContext(CollapsibleContext)
  if (!context) {
    throw new Error('Collapsible components must be used within a Collapsible')
  }
  return context
}

interface CollapsibleProps {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function Collapsible({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className = ''
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const setIsOpen = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  return (
    <CollapsibleContext.Provider value={{ isOpen, setIsOpen }}>
      <div className={className}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

interface CollapsibleTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  className?: string
  onClick?: () => void
}

export function CollapsibleTrigger({
  children,
  asChild = false,
  className = '',
  onClick
}: CollapsibleTriggerProps) {
  const { isOpen, setIsOpen } = useCollapsible()

  const handleClick = () => {
    setIsOpen(!isOpen)
    onClick?.()
  }

  if (asChild) {
    return React.cloneElement(React.Children.only(children) as React.ReactElement, {
      onClick: handleClick,
      'aria-expanded': isOpen,
      'aria-controls': 'collapsible-content'
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={isOpen}
      aria-controls="collapsible-content"
      className={`flex items-center gap-2 ${className}`}
    >
      {isOpen ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
      {children}
    </button>
  )
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

export function CollapsibleContent({
  children,
  className = ''
}: CollapsibleContentProps) {
  const { isOpen } = useCollapsible()

  if (!isOpen) {
    return null
  }

  return (
    <div
      id="collapsible-content"
      className={`overflow-hidden transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  )
}