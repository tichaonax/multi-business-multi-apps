/**
 * usePrinterPermissions Hook
 * Custom hook for checking printer-related permissions
 */

import { useSession } from 'next-auth/react'

export function usePrinterPermissions() {
  const { data: session } = useSession()
  const user = session?.user

  // Check if user can manage network printers (admin only)
  const canManageNetworkPrinters = Boolean(
    user?.userLevelPermissions?.canManageNetworkPrinters ||
    user?.role === 'SYSTEM_ADMIN'
  )

  // Check if user can use label printers
  const canUseLabelPrinters = Boolean(
    user?.userLevelPermissions?.canUseLabelPrinters ||
    canManageNetworkPrinters
  )

  // Check if user can print receipts
  const canPrintReceipts = Boolean(
    user?.userLevelPermissions?.canPrintReceipts ||
    canManageNetworkPrinters
  )

  // Check if user can print inventory labels
  const canPrintInventoryLabels = Boolean(
    user?.userLevelPermissions?.canPrintInventoryLabels ||
    canManageNetworkPrinters
  )

  // Check if user can view print queue (admin only)
  const canViewPrintQueue = Boolean(
    user?.userLevelPermissions?.canViewPrintQueue ||
    canManageNetworkPrinters
  )

  // Check if user can print anything
  const canPrint = Boolean(
    canPrintReceipts ||
    canPrintInventoryLabels ||
    canUseLabelPrinters ||
    canManageNetworkPrinters
  )

  return {
    canManageNetworkPrinters,
    canUseLabelPrinters,
    canPrintReceipts,
    canPrintInventoryLabels,
    canViewPrintQueue,
    canPrint,
    user,
    isLoading: !session,
  }
}
