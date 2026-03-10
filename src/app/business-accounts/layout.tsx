import { MainLayout } from '@/components/layout/main-layout'

export default function BusinessAccountsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
