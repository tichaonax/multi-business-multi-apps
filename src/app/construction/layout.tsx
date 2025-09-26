import { MainLayout } from '@/components/layout/main-layout'

export default function ConstructionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}