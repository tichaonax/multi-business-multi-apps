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
    <>
      <style>{`html, body { overflow: hidden !important; height: 100%; margin: 0; padding: 0; }`}</style>
      <div className="h-screen w-screen overflow-hidden">
        {children}
      </div>
    </>
  )
}
