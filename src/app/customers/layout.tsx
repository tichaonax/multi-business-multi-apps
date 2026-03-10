import { MainLayout } from '@/components/layout/main-layout'

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
