// @ts-nocheck

import React from 'react'
import { renderWithProviders as render, screen } from '../helpers/render-with-providers'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mutable mock implementations to allow per-test configuration without resetting modules
const sessionMock: any = { data: null, status: 'unauthenticated' }
jest.mock('next-auth/react', () => ({
  useSession: () => sessionMock
}))

const permissionsMock: any = {
  hasPermission: (perm: string) => false,
  currentBusinessId: 'b1',
  currentBusiness: null,
  hasPermissionInBusiness: () => false,
  businesses: [],
  activeBusinesses: [],
  switchBusiness: async () => {},
  refreshBusinesses: async () => {},
  isSystemAdmin: false,
  isBusinessOwner: false,
  isAuthenticated: true,
  loading: false,
  error: null,
}
jest.mock('@/contexts/business-permissions-context', () => ({
  useBusinessPermissionsContext: () => permissionsMock,
}))

import { GlobalHeader } from '@/components/layout/global-header'

describe('GlobalHeader UserDropdown', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows Data Management link for admin user', async () => {
    // Configure session & permissions for admin
    sessionMock.data = { user: { id: 'admin', name: 'Admin User', email: 'admin@example.com', role: 'admin' } }
    sessionMock.status = 'authenticated'
    permissionsMock.isSystemAdmin = true
    permissionsMock.hasPermission = () => true

    render(<GlobalHeader />)

    // Open the user menu by clicking the avatar button
    const userButton = screen.getByRole('button', { name: /AU|Admin User/i }) || screen.getAllByRole('button')[0]
    await userEvent.click(userButton)

    const dataLink = await screen.findByRole('link', { name: /Data Management/ })
    expect(dataLink).toBeInTheDocument()
    expect(dataLink).toHaveAttribute('href', '/admin/data-management')
    // Business Management should also be visible for admin
    const businessLink = await screen.findByRole('link', { name: /Business Management/ })
    expect(businessLink).toBeInTheDocument()
    expect(businessLink).toHaveAttribute('href', '/business/manage')

    // Expense Accounts link should be visible for admin
    const expenseLink = await screen.findByRole('link', { name: /Expense Accounts/ })
    expect(expenseLink).toBeInTheDocument()
    expect(expenseLink).toHaveAttribute('href', '/expense-accounts')
  })

  it('shows Data Management link for user with permission', async () => {
    // Configure session & permissions for a user with explicit permission
    sessionMock.data = { user: { id: 'user1', name: 'Perm User', email: 'perms@example.com', role: 'user' } }
    sessionMock.status = 'authenticated'
    permissionsMock.isSystemAdmin = false
    permissionsMock.hasPermission = (perm: string) => perm === 'canExportBusinessData'

    render(<GlobalHeader />)

    const userButton = screen.getByRole('button', { name: /PU|Perm User/i }) || screen.getAllByRole('button')[0]
    await userEvent.click(userButton)

    const dataLink = await screen.findByRole('link', { name: /Data Management/ })
    expect(dataLink).toBeInTheDocument()
    expect(dataLink).toHaveAttribute('href', '/admin/data-management')
  })

  it('shows Business Management link for user with permission', async () => {
    // Configure session & permissions for a user with explicit permission to manage business settings
    sessionMock.data = { user: { id: 'bmuser', name: 'BM User', email: 'bm@example.com', role: 'user' } }
    sessionMock.status = 'authenticated'
    permissionsMock.isSystemAdmin = false
    permissionsMock.hasPermission = (perm: string) => perm === 'canManageBusinessSettings'

    render(<GlobalHeader />)

    const userButton = screen.getByRole('button', { name: /BM|BM User/i }) || screen.getAllByRole('button')[0]
    await userEvent.click(userButton)

    const businessLink = await screen.findByRole('link', { name: /Business Management/ })
    expect(businessLink).toBeInTheDocument()
    expect(businessLink).toHaveAttribute('href', '/business/manage')
    
    // Expense Accounts link should not be visible unless they have canAccessExpenseAccount
    const expenseLinks = screen.queryAllByRole('link', { name: /Expense Accounts/ })
    expect(expenseLinks.length).toBe(0)
  })

  it('does not show Data Management link for user without permission', async () => {
    // Configure session & permissions for a user without permission
    sessionMock.data = { user: { id: 'user2', name: 'NoPerm User', email: 'noperms@example.com', role: 'user' } }
    sessionMock.status = 'authenticated'
    permissionsMock.isSystemAdmin = false
    permissionsMock.hasPermission = () => false

    render(<GlobalHeader />)

    const userButton = screen.getByRole('button', { name: /NU|NoPerm User/i }) || screen.getAllByRole('button')[0]
    await userEvent.click(userButton)

    const links = screen.queryAllByRole('link', { name: /Data Management/ })
    expect(links.length).toBe(0)
    // Business Management should not be visible
    const businessLinks = screen.queryAllByRole('link', { name: /Business Management/ })
    expect(businessLinks.length).toBe(0)

    // Expense Accounts link should not be present
    const expenseLinks = screen.queryAllByRole('link', { name: /Expense Accounts/ })
    expect(expenseLinks.length).toBe(0)
  })

  it('shows Expense Accounts link for user with canAccessExpenseAccount permission', async () => {
    sessionMock.data = { user: { id: 'u3', name: 'EA User', email: 'ea@example.com', role: 'user' } }
    sessionMock.status = 'authenticated'
    permissionsMock.isSystemAdmin = false
    permissionsMock.hasPermission = (perm: string) => perm === 'canAccessExpenseAccount'

    render(<GlobalHeader />)

    const userButton = screen.getByRole('button', { name: /EU|EA User/i }) || screen.getAllByRole('button')[0]
    await userEvent.click(userButton)

    const expenseLink = await screen.findByRole('link', { name: /Expense Accounts/ })
    expect(expenseLink).toBeInTheDocument()
    expect(expenseLink).toHaveAttribute('href', '/expense-accounts')
  })
})
