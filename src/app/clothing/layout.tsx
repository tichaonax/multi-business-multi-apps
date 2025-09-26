import { MainLayout } from '@/components/layout/main-layout'

export default function ClothingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}