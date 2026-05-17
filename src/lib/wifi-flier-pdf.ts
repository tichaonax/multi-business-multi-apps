import { jsPDF } from 'jspdf'

export interface WifiFlierData {
  businessName: string
  type: 'r710' | 'esp32'
  ssid: string | null       // null for ESP32 (user enters manually)
  tagline?: string          // optional custom tagline
  packages: Array<{
    name: string
    durationMinutes: number
    price: number
  }>
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440 || minutes % 60 !== 0) {
    const h = minutes / 60
    return h === 1 ? '1 hour' : `${h} hours`
  }
  // Prefer weeks only when it divides evenly; otherwise show days
  if (minutes % 10080 === 0) {
    const w = minutes / 10080
    return w === 1 ? '1 week' : `${w} weeks`
  }
  const d = minutes / 1440
  return d === 1 ? '1 day' : `${d} days`
}

export function generateWifiFlierPdf(data: WifiFlierData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 16
  const contentW = pageW - margin * 2
  let y = 14

  const BLACK = [0, 0, 0] as const
  const DARK  = [20, 20, 20] as const
  const MID   = [80, 80, 80] as const
  const LIGHT = [160, 160, 160] as const
  const BLUE  = [30, 100, 200] as const

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setDrawColor(...BLUE)
  doc.setLineWidth(1)
  doc.rect(margin, y, contentW, 32, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...DARK)
  doc.text(data.businessName, margin + 5, y + 10)

  doc.setFontSize(18)
  doc.setTextColor(...BLUE)
  doc.text('WiFi Available', margin + 5, y + 22)

  if (data.tagline) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...MID)
    doc.text(data.tagline, margin + 5, y + 29)
  }

  // WiFi symbol (text art, top-right)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text(')))', pageW - margin - 14, y + 20)

  y += 38

  // ── Network Name ─────────────────────────────────────────────────────────
  drawSection(doc, margin, y, contentW, BLACK, DARK, MID, LIGHT, 'NETWORK NAME', () => {
    const ssidDisplay = data.ssid || 'Ask staff for the network name'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...BLUE)
    doc.text(ssidDisplay, margin + 5, y + 18)
  }, 24)
  y += 28

  // ── How to Connect ───────────────────────────────────────────────────────
  const steps =
    data.type === 'esp32'
      ? [
          '1. Connect your device to the network above',
          '2. Purchase a token from the cashier',
          '3. Open your browser — a login page will appear',
          '4. Enter the TOKEN CODE printed on your token slip',
          '5. Click Connect and enjoy your session!',
        ]
      : [
          '1. Connect your device to the network above',
          '2. Purchase a token from the cashier',
          '3. Open your browser — a login page will appear',
          '4. Enter the USERNAME & PASSWORD printed on your token slip',
          '5. Click Connect and enjoy your session!',
        ]

  const stepBoxH = 10 + steps.length * 7 + 4
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.4)
  doc.rect(margin, y, contentW, stepBoxH, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  doc.text('HOW TO CONNECT', margin + 5, y + 7)
  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(0.2)
  doc.line(margin, y + 9, margin + contentW, y + 9)

  let stepY = y + 16
  steps.forEach(step => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(step, margin + 5, stepY)
    stepY += 7
  })
  y += stepBoxH + 4

  // ── Packages ─────────────────────────────────────────────────────────────
  if (data.packages.length > 0) {
    const colW = (contentW - 6) / 2
    const pkgRows = Math.ceil(data.packages.length / 2)
    const pkgBoxH = 10 + pkgRows * 9 + 4

    doc.setDrawColor(...BLACK)
    doc.setLineWidth(0.4)
    doc.rect(margin, y, contentW, pkgBoxH, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...DARK)
    doc.text('PACKAGES', margin + 5, y + 7)
    doc.setDrawColor(...LIGHT)
    doc.setLineWidth(0.2)
    doc.line(margin, y + 9, margin + contentW, y + 9)

    // Vertical divider between columns
    doc.setDrawColor(...LIGHT)
    doc.setLineWidth(0.2)
    doc.line(margin + colW + 3, y + 10, margin + colW + 3, y + pkgBoxH - 2)

    let pkgY = y + 17
    data.packages.forEach((pkg, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const px = col === 0 ? margin + 5 : margin + colW + 8
      const py = y + 17 + row * 9

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...DARK)
      doc.text(formatDuration(pkg.durationMinutes), px, py)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MID)
      doc.text(` — $${pkg.price.toFixed(2)}`, px + doc.getTextWidth(formatDuration(pkg.durationMinutes)), py)

      if (pkg.name) {
        doc.setFontSize(7)
        doc.setTextColor(...LIGHT)
        doc.text(pkg.name, px, py + 4)
      }
    })
    y += pkgBoxH + 4
  }

  // ── Terms & Conditions ────────────────────────────────────────────────────
  const terms = [
    'Tokens are single-use and non-transferable',
    'One active session per token',
    'No refunds on purchased tokens',
    'For help, speak to staff at the counter',
  ]
  const tBoxH = 10 + terms.length * 6 + 4

  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.4)
  doc.rect(margin, y, contentW, tBoxH, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  doc.text('TERMS & CONDITIONS', margin + 5, y + 7)
  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(0.2)
  doc.line(margin, y + 9, margin + contentW, y + 9)

  let tY = y + 15
  terms.forEach(term => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MID)
    doc.text(`•  ${term}`, margin + 5, tY)
    tY += 6
  })
  y += tBoxH + 6

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setDrawColor(...BLUE)
  doc.setLineWidth(0.6)
  doc.line(margin, y, pageW - margin, y)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...LIGHT)
  doc.text(data.businessName, pageW / 2, y + 5, { align: 'center' })

  doc.save(`wifi-flier-${data.businessName.replace(/\s+/g, '-')}.pdf`)
}

function drawSection(
  doc: jsPDF,
  margin: number,
  y: number,
  contentW: number,
  BLACK: readonly [number, number, number],
  DARK: readonly [number, number, number],
  _MID: readonly [number, number, number],
  LIGHT: readonly [number, number, number],
  title: string,
  inner: () => void,
  boxH: number
) {
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.4)
  doc.rect(margin, y, contentW, boxH, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  doc.text(title, margin + 5, y + 7)
  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(0.2)
  doc.line(margin, y + 9, margin + contentW, y + 9)

  inner()
}
