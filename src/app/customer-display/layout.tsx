/**
 * Customer Display Layout
 *
 * Minimal layout with NO navigation, NO menus, NO headers.
 * Pure content display for customer-facing screens.
 */

export default function CustomerDisplayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      {children}
    </div>
  )
}
