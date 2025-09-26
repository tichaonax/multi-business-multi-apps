import { MainLayout } from '@/components/layout/main-layout'

export default function GroceryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}