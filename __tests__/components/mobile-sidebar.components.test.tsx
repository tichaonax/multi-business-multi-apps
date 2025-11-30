// @ts-nocheck

import React from 'react'
import { renderWithProviders as render, screen } from '../helpers/render-with-providers'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mutable session & permission mocks
const sessionMock: any = { data: null, status: 'unauthenticated' }
jest.mock('next-auth/react', () => ({
  useSession: () => sessionMock
}))

const permissionMock: any = {
  hasPermission: (_perm: string) => false,
  hasUserPermission: (_perm: string) => false,
  canAccessModule: (_module: string) => true,
  isSystemAdmin: false
}
jest.mock('@/lib/permission-utils', () => ({
  isSystemAdmin: (_user: any) => permissionMock.isSystemAdmin,
  hasPermission: (_user: any, perm: string) => permissionMock.hasPermission(perm),
  hasUserPermission: (_user: any, perm: string) => permissionMock.hasUserPermission(perm),
  canAccessModule: (_user: any, module: string) => permissionMock.canAccessModule(module),
}))

import { MobileSidebar } from '@/components/layout/mobile-sidebar'

describe('MobileSidebar Expense Accounts link', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows link for admin', async () => {
    sessionMock.data = { user: { id: 'a', name: 'Admin User', email: 'admin@example.com' } }
    sessionMock.status = 'authenticated'
    permissionMock.isSystemAdmin = true

    render(<MobileSidebar />)

    const openBtn = screen.getByRole('button', { name: /open menu/i }) || screen.getAllByRole('button')[0]
    await userEvent.click(openBtn)

    const links = await screen.findAllByRole('link', { name: /Expense Accounts/ })
    expect(links.length).toBeGreaterThan(0)
    expect(links.every((l: any) => l.getAttribute('href') === '/expense-accounts')).toBeTruthy()
  })

  it('shows link for user with permission', async () => {
    sessionMock.data = { user: { id: 'u', name: 'Perm User', email: 'perms@example.com' } }
    sessionMock.status = 'authenticated'
    permissionMock.isSystemAdmin = false
    permissionMock.hasUserPermission = (perm: string) => perm === 'canAccessExpenseAccount'

    render(<MobileSidebar />)

    const openBtn = screen.getByRole('button', { name: /open menu/i }) || screen.getAllByRole('button')[0]
    await userEvent.click(openBtn)

    const links = await screen.findAllByRole('link', { name: /Expense Accounts/ })
    expect(links.length).toBeGreaterThan(0)
    expect(links.every((l: any) => l.getAttribute('href') === '/expense-accounts')).toBeTruthy()
  })

  it('does not show link for user without permission', async () => {
    sessionMock.data = { user: { id: 'u2', name: 'NoPerm User', email: 'nops@example.com' } }
    sessionMock.status = 'authenticated'
    permissionMock.isSystemAdmin = false
    permissionMock.hasUserPermission = () => false

    render(<MobileSidebar />)

    const openBtn = screen.getByRole('button', { name: /open menu/i }) || screen.getAllByRole('button')[0]
    await userEvent.click(openBtn)

    const links = screen.queryAllByRole('link', { name: /Expense Accounts/ })
    expect(links.length).toBe(0)
  })
})
