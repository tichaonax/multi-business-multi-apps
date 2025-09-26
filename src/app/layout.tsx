import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CustomSessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/contexts/theme-context'
import { SettingsProvider } from '@/contexts/settings-context'
import { BusinessPermissionsProvider } from '@/contexts/business-permissions-context'
import ToastProvider from '@/components/ui/toast'
import { NavigationProvider } from '@/contexts/navigation-context'
import { GlobalHeader } from '@/components/layout/global-header'
import { GlobalLoadingSpinner } from '@/components/ui/global-loading-spinner'

export const metadata: Metadata = {
  title: 'Multi-Business Management Platform',
  description: 'Unified platform for managing multiple business operations',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="page-background">
        <CustomSessionProvider>
          <SettingsProvider>
            <ThemeProvider>
              <ToastProvider>
                <BusinessPermissionsProvider>
                  <NavigationProvider>
                  <div className="min-h-screen">
                    <GlobalHeader />
                    <main>
                      {children}
                    </main>
                    <GlobalLoadingSpinner />
                  </div>
                </NavigationProvider>
                </BusinessPermissionsProvider>
              </ToastProvider>
            </ThemeProvider>
          </SettingsProvider>
        </CustomSessionProvider>
      </body>
    </html>
  )
}