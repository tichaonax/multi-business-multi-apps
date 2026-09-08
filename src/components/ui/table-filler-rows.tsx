// Pads a table body out to a fixed row count with blank rows, so the
// pagination footer sitting right below it doesn't jump up the page when a
// page (typically the last one) has fewer real rows than the configured
// page size. Each filler row matches a real row's vertical padding so the
// table's overall height stays constant across every page.
export function TableFillerRows({ count, colSpan, cellClassName = 'p-3' }: { count: number; colSpan: number; cellClassName?: string }) {
  if (count <= 0) return null
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={`filler-row-${i}`} aria-hidden="true">
          <td colSpan={colSpan} className={cellClassName}>
            &nbsp;
          </td>
        </tr>
      ))}
    </>
  )
}
