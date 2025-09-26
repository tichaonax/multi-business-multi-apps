import { MainLayout } from '@/components/layout/main-layout'

export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}