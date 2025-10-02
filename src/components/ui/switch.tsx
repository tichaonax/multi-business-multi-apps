'use client'

import { forwardRef } from 'react'

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'default' | 'sm' | 'lg'
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className = '', size = 'default', checked, onChange, ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-8 h-4',
      default: 'w-11 h-6',
      lg: 'w-14 h-8'
    }

    const thumbSizeClasses = {
      sm: 'w-3 h-3',
      default: 'w-5 h-5',
      lg: 'w-6 h-6'
    }

    const translateClasses = {
      sm: checked ? 'translate-x-4' : 'translate-x-0.5',
      default: checked ? 'translate-x-5' : 'translate-x-0.5',
      lg: checked ? 'translate-x-6' : 'translate-x-1'
    }

    return (
      <label className="relative inline-block cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          ref={ref}
          checked={checked}
          onChange={onChange}
          {...props}
        />
        <div
          className={`
            ${sizeClasses[size]}
            bg-gray-200 rounded-full transition-colors duration-200 cursor-pointer
            peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2
            dark:bg-gray-700 dark:peer-checked:bg-blue-500
            ${className}
          `}
        >
          <div
            className={`
              ${thumbSizeClasses[size]}
              bg-white rounded-full shadow-md transform transition-transform duration-200
              ${translateClasses[size]}
            `}
          />
        </div>
      </label>
    )
  }
)

Switch.displayName = 'Switch'

export { Switch }