import { MainLayout } from '@/components/layout/main-layout'

export default function BarcodeManagementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
