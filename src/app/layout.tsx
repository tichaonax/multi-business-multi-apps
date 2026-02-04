import type { Metadata, Viewport } from 'next'
import './globals.css'

// Force dynamic rendering for all pages (app uses sessions throughout)
export const dynamic = 'force-dynamic'
import { CustomSessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/contexts/theme-context'
import { SettingsProvider } from '@/contexts/settings-context'
import { BusinessPermissionsProvider } from '@/contexts/business-permissions-context'
import ToastProvider from '@/components/ui/toast'
import PromptProvider from '@/components/ui/input-modal'
import { NavigationProvider } from '@/contexts/navigation-context'
import { ConditionalGlobalHeader } from '@/components/layout/conditional-global-header'
import { ConditionalHealthIndicator } from '@/components/layout/conditional-health-indicator'
import { GlobalBarcodeModalManager } from '@/components/global/global-barcode-modal-manager'
import { GlobalBarcodeProvider } from '@/contexts/global-barcode-context'
import ConfirmProvider from '@/components/ui/confirm-modal'
import { GlobalLoadingSpinner } from '@/components/ui/global-loading-spinner'
import { CartProvider } from '@/contexts/global-cart-context'

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
      <head>
        {/* Apply theme immediately before React hydrates to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'system';
                  var resolvedTheme = theme;

                  if (theme === 'system') {
                    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }

                  document.documentElement.classList.add(resolvedTheme);
                  document.documentElement.style.colorScheme = resolvedTheme;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="page-background">
        <CustomSessionProvider>
          <SettingsProvider>
            <ThemeProvider>
              <ToastProvider>
                <PromptProvider>
                  <BusinessPermissionsProvider>
                    <CartProvider>
                      <NavigationProvider>
                        <GlobalBarcodeProvider>
                          <div className="min-h-screen">
                            <ConditionalGlobalHeader />
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
                    </CartProvider>
                  </BusinessPermissionsProvider>
                </PromptProvider>
              </ToastProvider>
            </ThemeProvider>
          </SettingsProvider>
        </CustomSessionProvider>

        {/* Global Health Status Indicator - Conditionally hidden on customer display */}
        <ConditionalHealthIndicator />
      </body>
    </html>
  )
}