/**
 * useAlert Hook
 * Custom hook for showing non-intrusive alert messages using toast notifications
 * Uses existing toast component instead of browser alerts
 */

import { useToast } from '@/components/ui/use-toast'

interface AlertOptions {
  title?: string
  message: string
  variant?: 'default' | 'destructive'
  duration?: number
}

export function useAlert() {
  const { toast } = useToast()

  function showAlert(options: AlertOptions | string) {
    const config = typeof options === 'string'
      ? { message: options, title: 'Alert' }
      : options

    toast({
      title: config.title || 'Alert',
      description: config.message,
      variant: config.variant || 'default',
      duration: config.duration,
    })
  }

  function showSuccess(message: string, title: string = 'Success') {
    toast({
      title,
      description: message,
      variant: 'default',
    })
  }

  function showError(message: string, title: string = 'Error') {
    toast({
      title,
      description: message,
      variant: 'destructive',
    })
  }

  function showWarning(message: string, title: string = 'Warning') {
    toast({
      title,
      description: message,
      variant: 'default',
    })
  }

  function showInfo(message: string, title: string = 'Info') {
    toast({
      title,
      description: message,
      variant: 'default',
    })
  }

  return {
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}
