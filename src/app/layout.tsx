import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { MainLayout } from '@/components/layout/main-layout'

export const metadata: Metadata = {
  title: 'Multi-Business Management Platform',
  description: 'Unified platform for managing multiple business operations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
      </body>
    </html>
  )
}