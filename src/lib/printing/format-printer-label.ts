/**
 * MBM-283 follow-up: shared display format for a printer option, used
 * everywhere a printer picker exists (receipt preview, printer
 * preferences, per-workstation/per-terminal admin defaults). Workstation-
 * primary for an AGENT-relayed printer — picking a workstation is the
 * actual decision being made when a business has several — with the
 * printer name still shown alongside, since two workstations can have
 * genuinely different printer hardware and that's worth seeing at a
 * glance, not hidden behind the workstation identity alone. DIRECT
 * printers (no workstation at all) keep the plain bare printer name.
 *
 * Deliberately excludes the online/offline suffix — callers already differ
 * on that convention ("(Online)"/"(Offline)" vs "(offline)"-only-when-off)
 * and this only standardizes the workstation-identity part, not that.
 */

interface PrinterLike {
  printerName: string
  workstationLabel?: string | null
  workstationHostname?: string | null
}

export function formatPrinterName(printer: PrinterLike): string {
  if (!printer.workstationLabel) return printer.printerName
  const workstation = printer.workstationHostname
    ? `${printer.workstationLabel} (${printer.workstationHostname})`
    : printer.workstationLabel
  return `${workstation} — ${printer.printerName}`
}
