import { MainLayout } from '@/components/layout/main-layout'

export default function EmployeesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}