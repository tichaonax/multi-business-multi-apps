import { MainLayout } from '@/components/layout/main-layout'

export default function RestaurantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}