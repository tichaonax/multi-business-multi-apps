// Force dynamic rendering for all driver pages (they use session)
export const dynamic = 'force-dynamic'

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
