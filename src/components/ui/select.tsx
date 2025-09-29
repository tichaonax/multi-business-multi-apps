'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  value: string
  onValueChange: (value: string) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

const useSelectContext = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select')
  }
  return context
}

interface SelectProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  disabled?: boolean
}

const Select = ({ children, value, onValueChange, defaultValue }: SelectProps) => {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(defaultValue || '')

  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
  }

  return (
    <SelectContext.Provider value={{
      open,
      setOpen,
      value: currentValue,
      onValueChange: handleValueChange
    }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ children, className, ...props }, ref) => {
    const { open, setOpen } = useSelectContext()

    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${className || ''}`}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

interface SelectValueProps {
  placeholder?: string
  children?: React.ReactNode
}

const SelectValue = ({ placeholder, children }: SelectValueProps) => {
  const { value } = useSelectContext()

  // If children are provided, use them when there's a value
  if (children && value) {
    return <span className="text-foreground">{children}</span>
  }

  return (
    <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
      {value || placeholder}
    </span>
  )
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

const SelectContent = ({ children, className }: SelectContentProps) => {
  const { open, setOpen } = useSelectContext()
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      className={`absolute top-full left-0 z-50 w-full mt-1 max-h-96 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700 ${className || ''}`}
    >
      {children}
    </div>
  )
}

interface SelectItemProps {
  children: React.ReactNode
  value: string
  className?: string
}

const SelectItem = ({ children, value, className }: SelectItemProps) => {
  const { value: selectedValue, onValueChange } = useSelectContext()
  const isSelected = selectedValue === value

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-600 dark:focus:bg-gray-600 ${
        isSelected ? 'bg-gray-100 dark:bg-gray-600' : ''
      } ${className || ''}`}
      onClick={() => onValueChange(value)}
    >
      {children}
    </div>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }