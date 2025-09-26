'use client'

import { useState, useEffect } from 'react'

interface DriverLicenseTemplate {
  id: string
  name: string
  description?: string
  pattern: string
  example: string
  countryCode?: string
}

interface DriverLicenseInputProps {
  value: string
  templateId?: string
  onChange: (driverLicense: string, templateId?: string) => void
  onTemplateChange?: (templateId: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
  disabled?: boolean
  showTemplateSelector?: boolean
  autoValidate?: boolean
}

// Exported helper so other components can format driver license values for display
export function formatDriverLicenseValue(inputValue: string, template?: DriverLicenseTemplate) {
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
      // Add literal character (like space)
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

export function DriverLicenseInput({
  value,
  templateId,
  onChange,
  onTemplateChange,
  label = 'Driver License',
  placeholder = 'Enter driver license',
  required = false,
  className = '',
  error,
  disabled = false,
  showTemplateSelector = true,
  autoValidate = true
}: DriverLicenseInputProps) {
  const [licenseTemplates, setLicenseTemplates] = useState<DriverLicenseTemplate[]>([])
  const [validationError, setValidationError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch license templates on mount
  useEffect(() => {
    fetchLicenseTemplates()
  }, [])

  const fetchLicenseTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/driver-license-templates?isActive=true')
      if (response.ok) {
        const templates = await response.json()
        setLicenseTemplates(templates)
      }
    } catch (error) {
      console.error('Failed to fetch driver license templates:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get selected template
  const selectedTemplate = licenseTemplates.find(t => t.id === templateId)

  // Validate driver license against template
  const validateDriverLicense = (licenseValue: string, template?: DriverLicenseTemplate) => {
    if (!autoValidate || !template || !licenseValue) {
      setValidationError('')
      return true
    }

    try {
      const regex = new RegExp(template.pattern)
      if (!regex.test(licenseValue)) {
        setValidationError(`Invalid format. Expected: ${template.example}`)
        return false
      }
    } catch (e) {
      setValidationError('Invalid template pattern')
      return false
    }

    setValidationError('')
    return true
  }

  // Handle template change
  const handleTemplateChange = (newTemplateId: string) => {
    if (onTemplateChange) {
      onTemplateChange(newTemplateId)
    }
    // Clear the driver license when template changes
    onChange('', newTemplateId)
    setValidationError('')
  }

  // Handle driver license input change
  const handleDriverLicenseChange = (inputValue: string) => {
    let formattedValue = inputValue

    // Format the value if template is selected
    if (selectedTemplate) {
      formattedValue = formatDriverLicenseValue(inputValue, selectedTemplate)
    }

    onChange(formattedValue, templateId)
    
    // Validate on change if auto-validate is enabled
    if (autoValidate) {
      setTimeout(() => validateDriverLicense(formattedValue, selectedTemplate), 100)
    }
  }

  // Handle blur validation
  const handleBlur = () => {
    if (autoValidate) {
      validateDriverLicense(value, selectedTemplate)
    }
  }

  const currentError = error || validationError

  return (
    <div className={className}>
      {/* Template Selector */}
      {showTemplateSelector && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary mb-2">
            Driver License Format Template
          </label>
          <select
            value={templateId || ''}
            onChange={(e) => handleTemplateChange(e.target.value)}
            disabled={disabled || loading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select driver license format...</option>
            {licenseTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.countryCode}) - Example: {template.example}
              </option>
            ))}
          </select>
          {loading && (
            <p className="text-xs text-secondary mt-1">Loading driver license formats...</p>
          )}
        </div>
      )}

      {/* Driver License Input */}
      <div>
        {label && (
          <label className="block text-sm font-medium text-secondary mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <input
          type="text"
          value={value}
          onChange={(e) => handleDriverLicenseChange(e.target.value)}
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
  )
}