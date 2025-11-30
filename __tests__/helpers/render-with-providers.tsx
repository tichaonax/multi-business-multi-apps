import React from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/toast'
import { ConfirmProvider } from '@/components/ui/confirm-modal'
import { ThemeProvider } from '@/contexts/theme-context'
import { SettingsProvider } from '@/contexts/settings-context'
// Provide a minimal mock for next/navigation hooks used by client components
// Jest's `jest.mock` will be overridden by tests that provide their own mocks.
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - jest is available in the test runner
  jest.mock('next/navigation', () => ({
    useRouter: () => ({
      push: () => Promise.resolve(undefined),
      replace: () => Promise.resolve(undefined),
      refresh: () => undefined,
      back: () => undefined,
      forward: () => undefined,
      prefetch: () => Promise.resolve(undefined),
    }),
    useParams: () => ({}),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  }))
} catch (e) {
  // not running under jest
}

// jsdom in the test environment does not implement matchMedia; provide a minimal polyfill
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  // Minimal mock for ThemeProvider usage in components
  // This will return 'matches: false' (light theme) and implement add/remove event handler stubs
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - augmenting window for tests only
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    // Legacy listeners for some implementations
    addListener: () => undefined,
    removeListener: () => undefined,
  })
}

// Provide a minimal global.fetch polyfill for tests that invoke fetch (e.g., SettingsProvider)
if (typeof (global as any).fetch !== 'function') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - provide test polyfill
  global.fetch = async (input: RequestInfo, init?: RequestInit) => {
    // If settings endpoint is requested, return default settings object similar to SettingsContext
    if (typeof input === 'string' && input.includes('/api/admin/settings')) {
      return {
        ok: true,
        json: async () => ({
          allowSelfRegistration: true,
          defaultRegistrationRole: 'employee',
          defaultRegistrationPermissions: {},
          requireAdminApproval: false,
          maxUsersPerBusiness: 50,
          globalDateFormat: 'dd/mm/yyyy',
          defaultCountryCode: 'ZW',
          defaultIdFormatTemplateId: 'zw-national-id',
          defaultMileageUnit: 'km'
        })
      }
    }

    // Generic ok response for other API endpoints in tests
    return {
      ok: true,
      json: async () => ({})
    }
  }
}

type Options = Omit<RenderOptions, 'wrapper'>

export function renderWithProviders(ui: React.ReactElement, options?: Options): RenderResult & { rerender: (ui: React.ReactElement) => void } {
  const mockRouter = {
    back: () => undefined,
    forward: () => undefined,
    push: (href: string) => Promise.resolve(undefined),
    replace: (href: string) => Promise.resolve(undefined),
    prefetch: (href: string) => Promise.resolve(undefined),
    refresh: () => undefined,
  }

  const Wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <SettingsProvider>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </SettingsProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

export * from '@testing-library/react'
