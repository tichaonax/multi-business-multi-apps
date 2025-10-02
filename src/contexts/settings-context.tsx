'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'

interface SystemSettings {
  allowSelfRegistration: boolean
  defaultRegistrationRole: string
  defaultRegistrationPermissions: any
  requireAdminApproval: boolean
  maxUsersPerBusiness: number
  globalDateFormat: string
  defaultCountryCode: string
  defaultIdFormatTemplateId: string
  defaultMileageUnit: string
}

const DEFAULT_SETTINGS: SystemSettings = {
  allowSelfRegistration: true,
  defaultRegistrationRole: 'employee',
  defaultRegistrationPermissions: {},
  requireAdminApproval: false,
  maxUsersPerBusiness: 50,
  globalDateFormat: 'dd/mm/yyyy',
  defaultCountryCode: 'ZW',
  // Use seeded stable ID for the default template
  defaultIdFormatTemplateId: 'zw-national-id',
  defaultMileageUnit: 'km',
}

interface SettingsContextType {
  settings: SystemSettings
  loading: boolean
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const refreshSettings = async () => {
    try {
      // Abort existing request if any and create a new controller for this fetch
      if (controllerRef.current) controllerRef.current.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const signal = controller.signal

      const response = await fetch('/api/admin/settings', { signal })
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        // If we can't fetch settings (e.g., not authorized), use defaults
        setSettings(DEFAULT_SETTINGS)
      }
    } catch (error) {
      const name = (error as any)?.name
      if (name === 'AbortError') return
      console.error('Error fetching settings:', error)
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    refreshSettings()

    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// Helper hook to get just the date format
export function useDateFormat() {
  const { settings } = useSettings()
  return {
    format: settings.globalDateFormat,
    defaultCountry: settings.defaultCountryCode
  }
}

// Helper hook to get the default mileage unit
export function useDefaultMileageUnit() {
  const { settings } = useSettings()
  return settings.defaultMileageUnit
}