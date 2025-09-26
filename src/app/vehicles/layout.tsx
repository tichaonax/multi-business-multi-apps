import { MainLayout } from '@/components/layout/main-layout'

export default function VehiclesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}