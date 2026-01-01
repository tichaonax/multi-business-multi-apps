/**
 * useAlert Hook
 * Custom hook for showing non-intrusive alert messages using toast notifications
 * Uses existing toast component instead of browser alerts
 */

import { useToastContext } from '@/components/ui/toast'

export function useAlert() {
  const { push } = useToastContext()

  function showSuccess(message: string, title: string = 'Success') {
    push(`${title}\n${message}`, { type: 'success', duration: 5000 })
  }

  function showError(message: string, title: string = 'Error') {
    push(`${title}\n${message}`, { type: 'error', duration: 8000 })
  }

  function showWarning(message: string, title: string = 'Warning') {
    push(`${title}\n${message}`, { type: 'warning', duration: 6000 })
  }

  function showInfo(message: string, title: string = 'Info') {
    push(`${title}\n${message}`, { type: 'info', duration: 5000 })
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}
