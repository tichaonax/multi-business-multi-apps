import { MainLayout } from '@/components/layout/main-layout'

export default function HardwareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}