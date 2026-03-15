'use client'

import { useState, useEffect } from 'react'
import { useSettings } from '@/contexts/settings-context'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface IdFormatTemplate {
  id: string
  name: string
  description?: string
  pattern: string
  example: string
  countryCode?: string
}

interface NationalIdInputProps {
  value: string
  templateId?: string
  onChange: (nationalId: string, templateId?: string) => void
  onTemplateChange?: (templateId: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
  disabled?: boolean
  showTemplateSelector?: boolean
  autoValidate?: boolean
  twoColumnLayout?: boolean
}

export function NationalIdInput({
  value,
  templateId,
  onChange,
  onTemplateChange,
  label = 'National ID',
  placeholder = 'Enter national ID',
  required = false,
  className = '',
  error,
  disabled = false,
  showTemplateSelector = true,
  autoValidate = true,
  twoColumnLayout = false
}: NationalIdInputProps) {
  const { settings } = useSettings()
  const [idTemplates, setIdTemplates] = useState<IdFormatTemplate[]>([])
  const [validationError, setValidationError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch ID templates on mount
  useEffect(() => {
    fetchIdTemplates()
  }, [])

  // Auto-select default template from global settings when no templateId is provided, fallback to ZIM
  useEffect(() => {
    if (!templateId && idTemplates.length > 0) {
      if (settings.defaultIdFormatTemplateId) {
        const defaultTemplate = idTemplates.find(t => t.id === settings.defaultIdFormatTemplateId)
        if (defaultTemplate) { onChange(value, defaultTemplate.id); return }
      }
      const zimTemplate = idTemplates.find(t => t.countryCode === 'ZIM')
      if (zimTemplate) onChange(value, zimTemplate.id)
    }
  }, [idTemplates, settings.defaultIdFormatTemplateId])

  const fetchIdTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/id-format-templates?isActive=true', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const templates = await response.json()
        setIdTemplates(templates)
      } else {
        console.error('Failed to fetch ID templates:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch ID templates:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get selected template
  const selectedTemplate = idTemplates.find(t => t.id === templateId)
  

  // Format national ID based on template
  const formatNationalId = (inputValue: string, template?: IdFormatTemplate) => {
    if (!template) return inputValue

    // Remove all non-alphanumeric characters from input
    const cleanValue = inputValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    
    // If no clean value, return as-is
    if (!cleanValue) return cleanValue
    
    // Extract format structure from example
    const formatChars = template.example.split('').map((char, index) => ({
      index,
      char,
      isLiteral: !/[a-zA-Z0-9]/.test(char)
    }))
    
    let formatted = ''
    let valueIndex = 0
    
    for (const formatChar of formatChars) {
      if (valueIndex >= cleanValue.length) break
      
      if (formatChar.isLiteral) {
        // Add literal character (like - or space)
        formatted += formatChar.char
      } else {
        // Add character from input
        if (valueIndex < cleanValue.length) {
          formatted += cleanValue[valueIndex]
          valueIndex++
        }
      }
    }
    
    return formatted
  }

  // Common Zimbabwe national ID patterns (DD-DDDDDDDLDD or DD-DDDDDDDDDD)
  const ZIMBABWE_ID_PATTERNS = [
    /^\d{2}-\d{7}[A-Za-z]\d{2}$/,   // e.g. 27-2018980D27, 22-0216080A04
    /^\d{2}-\d{6,7}[A-Za-z]\d{2,3}$/, // slight variations
    /^\d{2}-\d{9,10}$/,               // all-numeric format
  ]

  // Validate national ID against template
  const validateNationalId = (idValue: string, template?: IdFormatTemplate) => {
    if (!autoValidate || !template || !idValue) {
      setValidationError('')
      return true
    }

    try {
      const regex = new RegExp(template.pattern)
      if (regex.test(idValue)) {
        setValidationError('')
        return true
      }

      // Fallback: check against common Zimbabwe ID patterns
      const matchesZimFormat = ZIMBABWE_ID_PATTERNS.some(p => p.test(idValue))
      if (matchesZimFormat) {
        setValidationError('')
        return true
      }

      setValidationError(`Invalid format. Expected: ${template.example}`)
      return false
    } catch (e) {
      setValidationError('Invalid template pattern')
      return false
    }
  }

  // Handle template change
  const handleTemplateChange = (newTemplateId: string) => {
    if (onTemplateChange) {
      onTemplateChange(newTemplateId)
    }
    
    // Clear the national ID when template changes
    onChange('', newTemplateId)
    setValidationError('')
  }

  // Handle national ID input change
  const handleNationalIdChange = (inputValue: string) => {
    let formattedValue = inputValue

    // Format the value if template is selected
    if (selectedTemplate) {
      formattedValue = formatNationalId(inputValue, selectedTemplate)
    }

    onChange(formattedValue, templateId)
    
    // Validate on change if auto-validate is enabled
    if (autoValidate) {
      setTimeout(() => validateNationalId(formattedValue, selectedTemplate), 100)
    }
  }

  // Handle blur validation
  const handleBlur = () => {
    if (autoValidate) {
      validateNationalId(value, selectedTemplate)
    }
  }

  const currentError = error || validationError

  return (
    <div className={className}>
      <div className={twoColumnLayout && showTemplateSelector ? 'grid grid-cols-2 gap-3 items-start' : undefined}>
      {/* Template Selector */}
      {showTemplateSelector && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary mb-2">
            ID Format Template
          </label>
          <SearchableSelect
            options={idTemplates.map(t => ({
              value: t.id,
              label: `${t.name} (${t.countryCode ?? ''}) — e.g. ${t.example}`,
            }))}
            value={templateId || ''}
            onChange={(val) => handleTemplateChange(val)}
            placeholder={loading ? 'Loading formats...' : 'Select ID format...'}
            searchPlaceholder="Search ID formats..."
            disabled={disabled || loading}
          />
        </div>
      )}

      {/* National ID Input */}
      <div>
        {label && (
          <label className="block text-sm font-medium text-secondary mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <input
          type="text"
          value={value}
          onChange={(e) => handleNationalIdChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={selectedTemplate?.example || placeholder}
          required={required}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
            currentError 
              ? 'border-red-300 dark:border-red-500' 
              : 'border-gray-300 dark:border-gray-600'
          }`}
        />

        {/* Help Text */}
        {selectedTemplate && !currentError && (
          <p className="text-xs text-secondary mt-1">
            Expected format: {selectedTemplate.example}
            {selectedTemplate.description && ` - ${selectedTemplate.description}`}
          </p>
        )}

        {/* Error Message */}
        {currentError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{currentError}</p>
        )}
      </div>
      </div>
    </div>
  )
}