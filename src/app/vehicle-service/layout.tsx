import { MainLayout } from '@/components/layout/main-layout'

export default function VehicleServiceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
