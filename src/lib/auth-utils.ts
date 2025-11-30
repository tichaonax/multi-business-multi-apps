// Minimal utilities for auth used by components and tests
// This file is intentionally small and used both in runtime and test environments.
export const usePermissions = () => ({
  canCreateExpenseAccount: true,
  canCreateSiblingAccounts: true,
  canMergeSiblingAccounts: true,
  canViewPrintQueue: true,
  canPrintInventoryLabels: true,
  // Backwards compatibility property used in some components/tests
  isAdmin: true,
  isSystemAdmin: true,
})

export default usePermissions
