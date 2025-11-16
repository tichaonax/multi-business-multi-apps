import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CustomSessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/contexts/theme-context'
import { SettingsProvider } from '@/contexts/settings-context'
import { BusinessPermissionsProvider } from '@/contexts/business-permissions-context'
import ToastProvider from '@/components/ui/toast'
import PromptProvider from '@/components/ui/input-modal'
import { NavigationProvider } from '@/contexts/navigation-context'
import { GlobalHeader } from '@/components/layout/global-header'
import { GlobalBarcodeModalManager } from '@/components/global/global-barcode-modal-manager'
import { GlobalBarcodeProvider } from '@/contexts/global-barcode-context'
import ConfirmProvider from '@/components/ui/confirm-modal'
import HealthIndicator from '@/components/ui/health-indicator'
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
                <PromptProvider>
                  <BusinessPermissionsProvider>
                    <NavigationProvider>
                      <GlobalBarcodeProvider>
                        <div className="min-h-screen">
                          <GlobalHeader />
                          <ConfirmProvider>
                            <main>
                              {children}
                            </main>
                          </ConfirmProvider>
                          <GlobalLoadingSpinner />
                        </div>
                        <GlobalBarcodeModalManager />
                      </GlobalBarcodeProvider>
                    </NavigationProvider>
                  </BusinessPermissionsProvider>
                </PromptProvider>
              </ToastProvider>
            </ThemeProvider>
          </SettingsProvider>
        </CustomSessionProvider>

        {/* Global Health Status Indicator - Appears on ALL pages */}
        <HealthIndicator 
          position="bottom-right" 
          showFullOnDesktop={true}
          enableClickToExpand={true}
        />
      </body>
    </html>
  )
}