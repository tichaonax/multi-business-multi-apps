import { MainLayout } from '@/components/layout/main-layout'

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}