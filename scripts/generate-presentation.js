/**
 * Generates docs/presentation.pptx
 * Run: node scripts/generate-presentation.js
 */
const PptxGenJS = require('pptxgenjs')
const path = require('path')

const pptx = new PptxGenJS()
pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 inches (16:9)
pptx.author  = 'Business Management System'
pptx.subject = 'Staff Training Presentation'
pptx.title   = 'Business Management System — Training'

// ── Palette ────────────────────────────────────────────────────────────
const C = {
  bg:      '0B1120',
  surface: '111827',
  border:  '1E2D45',
  text:    'F1F5F9',
  muted:   '94A3B8',
  accent:  '38BDF8',  // blue
  green:   '34D399',
  amber:   'FBBF24',
  rose:    'FB7185',
  purple:  'A78BFA',
  teal:    '2DD4BF',
  orange:  'FB923C',
  white:   'FFFFFF',
  dark:    '0F172A',
}

// ── Shared helpers ─────────────────────────────────────────────────────
function addBg(slide, color) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: color || C.bg },
    line: { color: color || C.bg },
  })
}

function accentBar(slide, color) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color },
    line: { color },
  })
}

function kicker(slide, text, color) {
  slide.addText(text.toUpperCase(), {
    x: 0.5, y: 0.25, w: 12.3, h: 0.32,
    fontSize: 9, bold: true, charSpacing: 3,
    color: color || C.accent,
    fontFace: 'Segoe UI',
  })
}

function heading(slide, text, opts = {}) {
  slide.addText(text, {
    x: opts.x ?? 0.5,
    y: opts.y ?? 0.65,
    w: opts.w ?? 12.3,
    h: opts.h ?? 1.0,
    fontSize: opts.size ?? 32,
    bold: true,
    color: opts.color ?? C.text,
    fontFace: 'Segoe UI',
    wrap: true,
  })
}

function body(slide, text, opts = {}) {
  slide.addText(text, {
    x: opts.x ?? 0.5,
    y: opts.y ?? 1.7,
    w: opts.w ?? 12.3,
    h: opts.h ?? 0.5,
    fontSize: opts.size ?? 14,
    color: opts.color ?? C.muted,
    fontFace: 'Segoe UI',
    wrap: true,
    lineSpacingMultiple: 1.3,
    bold: opts.bold ?? false,
  })
}

function card(slide, x, y, w, h, icon, title, desc, accentColor) {
  // Card background
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.12,
    fill: { color: C.surface },
    line: { color: C.border, pt: 1 },
  })
  // Accent top strip
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h: 0.05,
    fill: { color: accentColor },
    line: { color: accentColor },
  })
  // Icon
  slide.addText(icon, {
    x: x + 0.18, y: y + 0.18, w: 0.55, h: 0.45,
    fontSize: 20, fontFace: 'Segoe UI',
  })
  // Title
  slide.addText(title, {
    x: x + 0.18, y: y + 0.6, w: w - 0.3, h: 0.32,
    fontSize: 12, bold: true, color: accentColor,
    fontFace: 'Segoe UI', wrap: true,
  })
  // Description
  slide.addText(desc, {
    x: x + 0.18, y: y + 0.9, w: w - 0.3, h: h - 1.0,
    fontSize: 10, color: C.muted,
    fontFace: 'Segoe UI', wrap: true, lineSpacingMultiple: 1.25,
  })
}

function stepRow(slide, num, title, desc, x, y, w, accentColor) {
  const h = 0.62
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: C.surface },
    line: { color: C.border, pt: 1 },
  })
  // Number bubble
  slide.addShape(pptx.ShapeType.ellipse, {
    x: x + 0.14, y: y + 0.13, w: 0.36, h: 0.36,
    fill: { color: accentColor, transparency: 82 },
    line: { color: accentColor, pt: 1 },
  })
  slide.addText(String(num), {
    x: x + 0.14, y: y + 0.13, w: 0.36, h: 0.36,
    fontSize: 11, bold: true, color: accentColor,
    fontFace: 'Segoe UI', align: 'center', valign: 'middle',
  })
  // Title + desc
  slide.addText(title, {
    x: x + 0.62, y: y + 0.08, w: w - 0.76, h: 0.24,
    fontSize: 11, bold: true, color: C.text,
    fontFace: 'Segoe UI',
  })
  slide.addText(desc, {
    x: x + 0.62, y: y + 0.3, w: w - 0.76, h: 0.28,
    fontSize: 9.5, color: C.muted,
    fontFace: 'Segoe UI', wrap: true,
  })
}

function tableSlide(slide, headers, rows, x, y, w, colWidths, accentColor) {
  const colW = colWidths || headers.map(() => w / headers.length)
  const rowH = 0.38
  // Header row
  headers.forEach((h, i) => {
    const cx = x + colW.slice(0, i).reduce((a, b) => a + b, 0)
    slide.addShape(pptx.ShapeType.rect, {
      x: cx, y, w: colW[i], h: rowH,
      fill: { color: C.surface },
      line: { color: C.border, pt: 1 },
    })
    slide.addText(h, {
      x: cx + 0.08, y, w: colW[i] - 0.1, h: rowH,
      fontSize: 10, bold: true, color: accentColor,
      fontFace: 'Segoe UI', valign: 'middle',
    })
  })
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const cx = x + colW.slice(0, ci).reduce((a, b) => a + b, 0)
      const ry = y + rowH * (ri + 1)
      slide.addShape(pptx.ShapeType.rect, {
        x: cx, y: ry, w: colW[ci], h: rowH,
        fill: { color: ri % 2 === 0 ? C.bg : C.surface },
        line: { color: C.border, pt: 1 },
      })
      slide.addText(cell, {
        x: cx + 0.08, y: ry, w: colW[ci] - 0.1, h: rowH,
        fontSize: 9.5, color: C.muted,
        fontFace: 'Segoe UI', valign: 'middle', wrap: true,
      })
    })
  })
}

function dividerSlide(num, sectionNum, title, subtitle, accentColor) {
  const slide = pptx.addSlide()
  addBg(slide, C.bg)
  accentBar(slide, accentColor)

  // Big faded section number
  slide.addText(String(sectionNum).padStart(2, '0'), {
    x: 0, y: 0.8, w: 13.33, h: 5,
    fontSize: 200, bold: true,
    color: C.bg,  // faded via same-as-bg to create subtle ghost effect
    fontFace: 'Segoe UI', align: 'center',
  })

  // Section kicker
  slide.addText(('Section ' + sectionNum).toUpperCase(), {
    x: 1, y: 1.6, w: 11.33, h: 0.4,
    fontSize: 10, bold: true, charSpacing: 4,
    color: accentColor, fontFace: 'Segoe UI', align: 'center',
  })
  // Title
  slide.addText(title, {
    x: 1, y: 2.15, w: 11.33, h: 1.1,
    fontSize: 42, bold: true,
    color: C.text, fontFace: 'Segoe UI', align: 'center', wrap: true,
  })
  // Subtitle
  slide.addText(subtitle, {
    x: 1.5, y: 3.45, w: 10.33, h: 0.7,
    fontSize: 16, color: C.muted,
    fontFace: 'Segoe UI', align: 'center', wrap: true,
  })
  return slide
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 1 — TITLE
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s, C.bg)
  // Gradient-ish radial glow (simulate with a large soft circle)
  s.addShape(pptx.ShapeType.ellipse, {
    x: 5, y: -1, w: 8, h: 6,
    fill: { color: '0D2040' }, line: { color: '0D2040' },
  })
  s.addText('STAFF TRAINING  ·  2026', {
    x: 1, y: 1.5, w: 11.33, h: 0.35,
    fontSize: 10, bold: true, charSpacing: 4,
    color: '818CF8', fontFace: 'Segoe UI', align: 'center',
  })
  s.addText('Business Management System', {
    x: 0.5, y: 2.0, w: 12.33, h: 1.6,
    fontSize: 46, bold: true,
    color: C.text, fontFace: 'Segoe UI', align: 'center', wrap: true,
  })
  s.addText('One platform for sales, payroll, inventory, HR, expenses, customers, and more — built for all business types.', {
    x: 1.5, y: 3.75, w: 10.33, h: 0.7,
    fontSize: 15, color: C.muted,
    fontFace: 'Segoe UI', align: 'center', wrap: true,
  })

  const tags = [
    ['POS & Sales', C.green],
    ['Cash Office & EOD', C.amber],
    ['Payroll', C.purple],
    ['HR & Employees', C.teal],
    ['Expense Accounts', C.orange],
    ['Customers & Loyalty', C.rose],
    ['Inventory & Barcodes', C.accent],
    ['WiFi Integration', C.purple],
  ]
  const tw = 1.42, th = 0.3, gap = 0.12
  const startX = (13.33 - (tags.length / 2) * (tw + gap) + gap / 2) / 2
  tags.forEach((t, i) => {
    const row = Math.floor(i / 4)
    const col = i % 4
    const x = startX + col * (tw + gap)
    const y = 4.6 + row * (th + 0.1)
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: tw, h: th, rectRadius: 0.15,
      fill: { color: t[1], transparency: 88 },
      line: { color: t[1], pt: 1 },
    })
    s.addText(t[0], {
      x, y, w: tw, h: th,
      fontSize: 9, bold: true, color: t[1],
      fontFace: 'Segoe UI', align: 'center', valign: 'middle',
    })
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 2 — AGENDA
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.accent)
  kicker(s, "Today's Session — 30 to 50 minutes", C.accent)
  heading(s, "What We Will Cover")

  const items = [
    ['🖥️', 'Getting Started',          'Login, dashboard, notifications, business switcher',          C.green,  0.5,  1.55],
    ['🛒', 'Sales & POS',               'Making sales, customers, loyalty cards, WiFi tokens',         C.green,  3.55, 1.55],
    ['💰', 'Cash Office & EOD',         'End of day close, cash allocation, batch catch-up',           C.amber,  6.6,  1.55],
    ['📊', 'Manager — Payroll',         'Payment requests, payroll workflow, performance targets',     C.purple, 9.65, 1.55],
    ['👥', 'HR & Employees',            'Contracts, clock-in, absences, per diem, termination',        C.teal,   0.5,  4.2],
    ['🧾', 'Finance',                   'Expense accounts, petty cash, rent account, loans',           C.orange, 3.55, 4.2],
    ['🎁', 'Customers & Campaigns',     'Loyalty cards, activity reports, campaigns & rewards',        C.rose,   6.6,  4.2],
    ['📦', 'Inventory & Barcodes',      'Adding products, scanning, bale system, label templates',     C.accent, 9.65, 4.2],
  ]
  items.forEach(([icon, title, desc, color, x, y]) => {
    card(s, x, y, 2.85, 2.4, icon, title, desc, color)
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 3 — WHO USES THE SYSTEM
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.accent)
  kicker(s, 'Section 1 — Getting Started', C.accent)
  heading(s, 'Who Uses the System?')

  const roles = [
    ['🛒', 'Cashier / Sales',       'POS, loyalty card scanning, WiFi token sales, daily clock-in',           C.green,  0.5,  1.55],
    ['💰', 'Cash Office',           'EOD close, cash counting, allocation, managing deposits',                 C.amber,  4.6,  1.55],
    ['📋', 'Manager',               'Approvals, payroll processing, reports, performance targets',             C.purple, 8.7,  1.55],
    ['👥', 'HR',                    'Employee records, contracts, absence tracking, onboarding',               C.teal,   0.5,  4.0],
    ['🧾', 'Accountant / Finance',  'Expense accounts, loans, rent account, payroll export for ZIMRA',         C.orange, 4.6,  4.0],
    ['👔', 'Owner / Director',      'Final payroll approval, loan sign-off, cross-business overview reports',  C.rose,   8.7,  4.0],
  ]
  roles.forEach(([icon, title, desc, color, x, y]) => {
    card(s, x, y, 3.9, 2.25, icon, title, desc, color)
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 4 — DASHBOARD & NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.accent)
  kicker(s, 'Getting Started', C.accent)
  heading(s, 'Dashboard & Notifications')

  // Left column — dashboard items
  s.addText('What the Dashboard shows', {
    x: 0.5, y: 1.55, w: 5.8, h: 0.3,
    fontSize: 12, bold: true, color: C.accent, fontFace: 'Segoe UI',
  })
  const dItems = [
    "Today's sales, deposits & transactions",
    "Pending tasks — approvals, payments waiting",
    "Recent activity log",
    "Alerts — low stock, overdue laybys, low balances",
    "Daily performance bar vs target",
  ]
  dItems.forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 1.95 + i * 0.55, w: 5.8, h: 0.48,
      rectRadius: 0.07, fill: { color: C.surface }, line: { color: C.border, pt: 1 },
    })
    s.addText('›  ' + t, {
      x: 0.65, y: 1.95 + i * 0.55, w: 5.5, h: 0.48,
      fontSize: 10.5, color: C.muted, fontFace: 'Segoe UI', valign: 'middle',
    })
  })

  // Bell highlight box
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 4.85, w: 5.8, h: 0.85,
    rectRadius: 0.1, fill: { color: C.amber, transparency: 91 }, line: { color: C.amber, pt: 1 },
  })
  s.addText('🔔  Bell icon = action required. A red number means something is waiting for you. Always clear the bell before end of day.', {
    x: 0.65, y: 4.85, w: 5.5, h: 0.85,
    fontSize: 10.5, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })

  // Right column — notification table
  s.addText('Notification types', {
    x: 6.8, y: 1.55, w: 5.9, h: 0.3,
    fontSize: 12, bold: true, color: C.accent, fontFace: 'Segoe UI',
  })
  tableSlide(s,
    ['Bell turns red when…', 'Who acts'],
    [
      ['Payment request submitted', 'Manager'],
      ['Payroll ready for approval', 'Owner'],
      ['Leave request submitted',   'HR / Manager'],
      ['Rent transfer due',         'Cash Office'],
      ['Loan lock requested',       'Manager'],
      ['New chat message',          'All staff'],
    ],
    6.8, 1.9, 5.9, [3.8, 2.1], C.accent
  )
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 5 — SECTION DIVIDER: SALES
// ══════════════════════════════════════════════════════════════════════
dividerSlide(2, 2, 'Sales & POS', 'Making sales, attaching customers, loyalty cards, WiFi token combos, and completing the order.', C.green)

// ══════════════════════════════════════════════════════════════════════
// SLIDE 6 — POS 6 STEPS
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.green)
  kicker(s, 'POS — Making a Sale', C.green)
  heading(s, 'The 6 Steps of Every Sale', { color: C.text, size: 30 })

  const steps = [
    ['Open the POS',             'Navigate to your business → POS. The till opens ready to take items.'],
    ['Add items',                'Scan a barcode, type the product name, or tap a category then the item.'],
    ['Attach a customer',        'Search by name/phone, scan loyalty card, or create inline. Walk-in is fine — customer is optional.'],
    ['Apply discounts/campaigns','Eligible campaign rewards appear automatically. Tap to apply. Manual discounts if authorised.'],
    ['Select payment method',    'Cash, card, mobile transfer, layby, or split payment.'],
    ['Complete — print receipt', 'Receipt prints with items, change due, and WiFi credentials if WiFi was in the order.'],
  ]
  steps.forEach(([title, desc], i) => {
    const col = i < 3 ? 0 : 1
    const row = i % 3
    stepRow(s, i + 1, title, desc, col === 0 ? 0.5 : 6.9, 1.55 + row * 0.75, 6.0, C.green)
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 7 — BARCODE SCAN PRIORITY
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.green)
  kicker(s, 'POS — Barcode Scanner', C.green)
  heading(s, 'What Does Scanning Actually Do?', { size: 28 })
  body(s, 'The scanner is always active. One scan can do four different things depending on what the code belongs to.', { size: 13, y: 1.6 })

  tableSlide(s,
    ['Priority', 'If the barcode is…', 'Result'],
    [
      ['1 — Highest', 'An employee card',     'Clocks that employee in or out immediately'],
      ['2',           'A customer card',       'Attaches that customer to the open sale'],
      ['3',           'A product barcode',     'Adds that product to the cart at its price'],
      ['4 — Fallback','Unknown barcode',       'Offers to search other businesses or create a new product'],
    ],
    0.5, 2.15, 12.3, [1.6, 3.8, 6.9], C.green
  )

  // Highlight box
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 5.1, w: 12.3, h: 0.75,
    rectRadius: 0.1, fill: { color: C.green, transparency: 92 }, line: { color: C.green, pt: 1 },
  })
  s.addText('📌  Priority is fixed: Employee → Customer → Product → Unknown. The scanner stops at the first match. No configuration needed — it is fully automatic.', {
    x: 0.7, y: 5.1, w: 11.9, h: 0.75,
    fontSize: 11, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 8 — WIFI AT POS
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.green)
  kicker(s, 'POS — WiFi Token Sales', C.green)
  heading(s, 'Selling WiFi at the Till', { size: 28 })

  tableSlide(s,
    ['System', 'How it works'],
    [
      ['ESP32',      'Captive portal — sells a token code. Customer enters code on WiFi login page.'],
      ['R710 (Ruckus)', 'Pre-generated username + password pairs sold directly at POS. Pool restocked when < 5 tokens remain.'],
    ],
    0.5, 1.7, 6.0, [1.4, 4.6], C.green
  )

  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 3.3, w: 6.0, h: 0.75,
    rectRadius: 0.1, fill: { color: C.green, transparency: 92 }, line: { color: C.green, pt: 1 },
  })
  s.addText('R710 tokens are pre-generated and stored in a pool — never created on the fly. "Request 5 More" appears when stock runs low.', {
    x: 0.7, y: 3.3, w: 5.6, h: 0.75,
    fontSize: 10.5, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })

  // Receipt preview box
  s.addText('WiFi in a Combo — receipt sample', {
    x: 7.2, y: 1.55, w: 5.6, h: 0.3,
    fontSize: 12, bold: true, color: C.green, fontFace: 'Segoe UI',
  })
  s.addShape(pptx.ShapeType.roundRect, {
    x: 7.2, y: 1.95, w: 5.6, h: 2.5,
    rectRadius: 0.1, fill: { color: '0D1A0D' }, line: { color: C.green, pt: 1 },
  })
  s.addText(
    'Chicken Combo       $4.50\n' +
    '─────────────────────────\n' +
    '🌐 WiFi Access\n' +
    'Username:  guest_5021\n' +
    'Password:  Rp8vN3tK\n' +
    'Valid for: 24 hours\n' +
    '─────────────────────────\n' +
    'TOTAL               $4.50',
    {
      x: 7.4, y: 2.05, w: 5.2, h: 2.3,
      fontSize: 10.5, color: '86EFAC',
      fontFace: 'Courier New', wrap: false, lineSpacingMultiple: 1.4,
    }
  )
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 9 — SECTION DIVIDER: CASH OFFICE
// ══════════════════════════════════════════════════════════════════════
dividerSlide(3, 3, 'Cash Office & End of Day', 'Closing the day, counting the float, locking records, and allocating deposits.', C.amber)

// ══════════════════════════════════════════════════════════════════════
// SLIDE 10 — EOD 6 STEPS
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.amber)
  kicker(s, 'Cash Office — End of Day Close', C.amber)
  heading(s, '6 Steps to Close the Day', { color: C.text, size: 30 })

  const steps = [
    ['Open End of Day page',         "Go to Cash Office → End of Day for today's date."],
    ['Rent transfer',                "System calculates daily rent portion. Confirm or skip. Moves funds to the rent account."],
    ['Auto-deposits run',            "Recurring deposits (savings, sinking funds) process automatically. Skipped if balance is zero."],
    ['Manager sign-off',             "Manager types their name and enters total physical cash counted in the till."],
    ['Save & Lock',                  "Day's transactions are permanently locked — no more edits to sales figures."],
    ['Cash allocation',              "Cashier reviews each deposit line, ticks it off, then locks the allocation report."],
  ]
  steps.forEach(([title, desc], i) => {
    const col = i < 3 ? 0 : 1
    const row = i % 3
    stepRow(s, i + 1, title, desc, col === 0 ? 0.5 : 6.9, 1.55 + row * 0.75, 6.0, C.amber)
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 11 — BATCH CATCH-UP
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.amber)
  kicker(s, 'Cash Office — Catch-Up', C.amber)
  heading(s, 'Closing Multiple Days at Once', { size: 28 })
  body(s, 'If 2–60 days were missed, the manager runs a Grouped EOD Catch-Up instead of closing one day at a time.', { size: 13, y: 1.6 })

  tableSlide(s,
    ['Role', 'What they do'],
    [
      ['Manager', 'Selects the unclosed days, previews combined sales totals, enters name + total cash for the whole period, clicks Run Catch-Up'],
      ['Cashier',  'Reviews the cash allocation report (all days combined), ticks each deposit line, locks the allocation'],
    ],
    0.5, 2.2, 12.3, [2.0, 10.3], C.amber
  )

  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 4.35, w: 12.3, h: 0.75,
    rectRadius: 0.1, fill: { color: C.amber, transparency: 91 }, line: { color: C.amber, pt: 1 },
  })
  s.addText('⚠️  In a catch-up, the cashier reconciles cash for multiple days at once. The total entered by the manager is the combined physical cash for all selected days.', {
    x: 0.7, y: 4.35, w: 11.9, h: 0.75,
    fontSize: 11, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 12 — SECTION DIVIDER: MANAGER
// ══════════════════════════════════════════════════════════════════════
dividerSlide(4, 4, 'Manager — Payroll & Approvals', 'Payment requests, the full payroll workflow, and setting performance targets.', C.purple)

// ══════════════════════════════════════════════════════════════════════
// SLIDE 13 — PAYMENT REQUEST WORKFLOW
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.purple)
  kicker(s, 'Manager — Payment Requests', C.purple)
  heading(s, 'Payment Request Workflow', { size: 28 })

  const steps = [
    ['Submitted',          'Staff submits a payment request — payee, amount, purpose, account. Manager\'s bell 🔔 turns red.'],
    ['Reviewed & Approved','Manager opens the request, checks details, clicks Approve. Submitter receives a notification.'],
    ['Payment Made',       'Cashier / Finance pays the supplier and clicks Mark as Paid with the payment reference.'],
    ['Closed',             'Request is closed. Expense account balance is reduced. Submitter receives a final notification.'],
  ]
  steps.forEach(([title, desc], i) => {
    stepRow(s, i + 1, title, desc, 0.5, 1.6 + i * 0.75, 9.5, C.purple)
  })

  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 4.8, w: 9.5, h: 0.6,
    rectRadius: 0.1, fill: { color: C.purple, transparency: 91 }, line: { color: C.purple, pt: 1 },
  })
  s.addText('💡  You can also decline a request at step 2 with a reason. The submitter is notified and can revise and resubmit.', {
    x: 0.7, y: 4.8, w: 9.1, h: 0.6,
    fontSize: 11, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 14 — PAYROLL WORKFLOW
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.purple)
  kicker(s, 'Manager — Payroll', C.purple)
  heading(s, 'Payroll — 5 Stages to Export', { size: 28 })

  // Status flow (left column)
  s.addText('Status flow', { x: 0.5, y: 1.55, w: 5.5, h: 0.3, fontSize: 12, bold: true, color: C.purple, fontFace: 'Segoe UI' })
  const statuses = [
    ['Draft',       '1E293B', '334155', '94A3B8', 'Manager adds entries'],
    ['In Progress', '1E3A5F', '2563EB', '93C5FD', 'Sync All, review figures'],
    ['Review',      '2E1B5E', '7C3AED', 'C4B5FD', 'Manager checks, funds cashier'],
    ['Approved',    '14532D', '16A34A', '86EFAC', 'Owner approves (required)'],
    ['Exported',    '1C3558', '0EA5E9', '7DD3FC', 'Spreadsheet downloaded'],
    ['Closed',      '292524', '57534E', 'A8A29E', 'Disbursed, payslips done'],
  ]
  statuses.forEach(([label, bg, border, textCol, note], i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 1.95 + i * 0.54, w: 2.0, h: 0.42,
      rectRadius: 0.06, fill: { color: bg }, line: { color: border, pt: 1 },
    })
    s.addText(label, { x: 0.5, y: 1.95 + i * 0.54, w: 2.0, h: 0.42, fontSize: 10, bold: true, color: textCol, fontFace: 'Segoe UI', align: 'center', valign: 'middle' })
    s.addText('→  ' + note, { x: 2.65, y: 1.95 + i * 0.54, w: 3.4, h: 0.42, fontSize: 10, color: C.muted, fontFace: 'Segoe UI', valign: 'middle' })
  })

  // Right column — roles table
  s.addText('Who does what', { x: 6.7, y: 1.55, w: 5.9, h: 0.3, fontSize: 12, bold: true, color: C.purple, fontFace: 'Segoe UI' })
  tableSlide(s,
    ['Role', 'Task'],
    [
      ['Manager', 'Opens period, adds entries, runs Sync All, reviews, funds cashier'],
      ['Cashier',  'Receives funded amount, counts out individual salaries'],
      ['Owner',    'Approves the payroll — nothing exports without this'],
    ],
    6.7, 1.9, 5.9, [1.8, 4.1], C.purple
  )

  s.addShape(pptx.ShapeType.roundRect, {
    x: 6.7, y: 4.05, w: 5.9, h: 0.75,
    rectRadius: 0.1, fill: { color: C.purple, transparency: 91 }, line: { color: C.purple, pt: 1 },
  })
  s.addText('📤  After export: Print payslips → File ZIMRA P2/P6/P14 returns → Disburse salaries → Close the period.', {
    x: 6.9, y: 4.05, w: 5.5, h: 0.75,
    fontSize: 10.5, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 15 — SECTION DIVIDER: HR
// ══════════════════════════════════════════════════════════════════════
dividerSlide(5, 5, 'HR & Employee Management', 'Contracts, clock-in cards, absences, per diem, and the full employee lifecycle.', C.teal)

// ══════════════════════════════════════════════════════════════════════
// SLIDE 16 — EMPLOYEE LIFECYCLE
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.teal)
  kicker(s, 'HR — Employee Lifecycle', C.teal)
  heading(s, 'From Hire to Exit', { size: 28 })

  const items = [
    ['📝', '1. Onboarding',        'Create employee record → capture details, ID, bank account, job title. Create contract with duties, salary, and employment type. Print, upload signed copy, approve.',    C.teal,   0.5,  1.7],
    ['🖨️', '2. Clock-In Card',     'Print barcode ID card (name + photo front, barcode back). Fold in half, laminate, give to employee. They scan it to clock in/out from any screen.',                    C.teal,   6.9,  1.7],
    ['💻', '3. System Access',     'Create a system user account. Assign permissions from the role-based list (POS, HR, Payroll, Finance). One account can cover multiple roles.',                           C.teal,   0.5,  4.1],
    ['🔴', '4. Termination',       'Final payroll → print payslip + P45 → revoke system access → mark terminated → close expense items → collect property.',                                                C.rose,   6.9,  4.1],
  ]
  items.forEach(([icon, title, desc, color, x, y]) => {
    card(s, x, y, 6.0, 2.1, icon, title, desc, color)
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 17 — CLOCK-IN & ABSENCES
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.teal)
  kicker(s, 'HR — Attendance & Absences', C.teal)
  heading(s, 'Clock-In & Absence Tracking', { size: 28 })

  s.addText('How clock-in works', { x: 0.5, y: 1.55, w: 5.8, h: 0.3, fontSize: 12, bold: true, color: C.teal, fontFace: 'Segoe UI' })
  const ci = [
    'Employee scans barcode card → clock-in recorded instantly',
    'Photo captured with each clock-in',
    'Second scan = clock-out',
    'Manager can add or edit entries manually (back-dated)',
    '⚠ = missing clock-out  ✏ = manually edited entry',
  ]
  ci.forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.95 + i * 0.52, w: 5.8, h: 0.44, rectRadius: 0.07, fill: { color: C.surface }, line: { color: C.border, pt: 1 } })
    s.addText('›  ' + t, { x: 0.65, y: 1.95 + i * 0.52, w: 5.5, h: 0.44, fontSize: 10, color: C.muted, fontFace: 'Segoe UI', valign: 'middle' })
  })

  s.addText('Absence types & payroll impact', { x: 7.0, y: 1.55, w: 5.8, h: 0.3, fontSize: 12, bold: true, color: C.teal, fontFace: 'Segoe UI' })
  tableSlide(s,
    ['Type', 'Payroll impact'],
    [
      ['Annual Leave',    'Paid from leave balance'],
      ['Sick Leave',      'Paid if balance allows'],
      ['Unpaid Leave',    'Deducted pro-rata'],
      ['AWOL',            'Deducted + disciplinary'],
      ['Public Holiday',  'Paid, no balance used'],
    ],
    7.0, 1.9, 5.8, [2.9, 2.9], C.teal
  )
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 18 — PER DIEM
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.teal)
  kicker(s, 'HR — Per Diem', C.teal)
  heading(s, 'Per Diem — From Form to Payslip', { size: 28 })

  const steps = [
    ['Employee requests a blank form',    'Form is printed from the HR section.'],
    ['Employee fills and signs the form', 'Dates, purpose (Travel / Accommodation / Subsistence / Medical / Other), amount per day, days claimed, total, supervisor signature.'],
    ['Manager enters it into the system', 'HR → Per Diem → Add Entry. Select employee, enter dates and amounts. Save.'],
    ['Auto-included in payroll',          'At month end, all per diem entries for that employee appear automatically as a line in the payroll export. No separate action needed.'],
  ]
  steps.forEach(([title, desc], i) => {
    stepRow(s, i + 1, title, desc, 0.5, 1.6 + i * 0.8, 12.3, C.teal)
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 19 — SECTION DIVIDER: FINANCE
// ══════════════════════════════════════════════════════════════════════
dividerSlide('7 & 8', '7 & 8', 'Finance — Expenses, Rent & Loans', 'Expense accounts, petty cash, rent account setup, and the two loan systems.', C.orange)

// ══════════════════════════════════════════════════════════════════════
// SLIDE 20 — EXPENSE ACCOUNTS
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.orange)
  kicker(s, 'Finance — Expense Accounts', C.orange)
  heading(s, 'Two Types of Expense Accounts', { size: 28 })

  card(s, 0.5, 1.6, 5.9, 3.0, '🏢', 'Business Expense Account',
    'Shared account for a specific business purpose. Funded by deposits from the business account. Payments go through the Payment Request workflow. Manager can see all transactions.\n\nExamples: Grocery Procurement, Utilities, Maintenance, Vehicle Fuel',
    C.orange, )

  card(s, 6.9, 1.6, 5.9, 3.0, '🔒', 'Personal Expense Account',
    'Private to the account holder. Used by an individual to track their own spending and submit reimbursement claims. Manager cannot see the transactions unless the holder shares them.\n\nExample: Staff member tracks meals & transport, then claims back.',
    C.purple)

  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 4.8, w: 12.3, h: 0.7,
    rectRadius: 0.1, fill: { color: C.orange, transparency: 92 }, line: { color: C.orange, pt: 1 },
  })
  s.addText('💡  Petty Cash uses an expense account as its fund. Requests follow the same approval chain: Submit → Approve → Pay → Close. Unspent cash must be returned and recorded.', {
    x: 0.7, y: 4.8, w: 11.9, h: 0.7,
    fontSize: 11, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 21 — RENT & LOANS
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.orange)
  kicker(s, 'Finance — Rent & Loans', C.orange)
  heading(s, 'Rent Account & Loan Systems', { size: 28 })

  s.addText('Rent Account', { x: 0.5, y: 1.55, w: 5.8, h: 0.3, fontSize: 12, bold: true, color: C.orange, fontFace: 'Segoe UI' })
  const ri = [
    'Set up once: monthly rent, operating days, landlord, due date',
    'System calculates daily transfer amount automatically',
    'Each EOD close prompts a rent transfer to the rent account',
    'At month end — one payment from rent account to landlord',
    '🟢 100% funded  🟠 75% good  🔴 below target',
  ]
  ri.forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.95 + i * 0.52, w: 5.8, h: 0.44, rectRadius: 0.07, fill: { color: C.surface }, line: { color: C.border, pt: 1 } })
    s.addText('›  ' + t, { x: 0.65, y: 1.95 + i * 0.52, w: 5.5, h: 0.44, fontSize: 10, color: C.muted, fontFace: 'Segoe UI', valign: 'middle' })
  })

  s.addText('Two loan systems', { x: 7.0, y: 1.55, w: 5.8, h: 0.3, fontSize: 12, bold: true, color: C.orange, fontFace: 'Segoe UI' })
  tableSlide(s,
    ['Type', 'Direction', 'Example'],
    [
      ['Business Loan',  'Lender → Business',  'Bank loan, investor advance'],
      ['Employee Loan',  'Business → Employee','Salary advance, personal loan'],
    ],
    7.0, 1.9, 5.8, [2.0, 2.0, 1.8], C.orange
  )
  s.addShape(pptx.ShapeType.roundRect, { x: 7.0, y: 3.25, w: 5.8, h: 0.6, rectRadius: 0.1, fill: { color: C.orange, transparency: 91 }, line: { color: C.orange, pt: 1 } })
  s.addText('Employee loans can auto-deduct via Payroll Deduction — no manual repayment tracking needed.', {
    x: 7.2, y: 3.25, w: 5.4, h: 0.6, fontSize: 10.5, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 22 — SECTION DIVIDER: CUSTOMERS
// ══════════════════════════════════════════════════════════════════════
dividerSlide(9, 9, 'Customers, Loyalty & Campaigns', 'Customer numbers, loyalty cards, activity reports, campaigns and rewards.', C.rose)

// ══════════════════════════════════════════════════════════════════════
// SLIDE 23 — LOYALTY CARDS & CAMPAIGNS
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.rose)
  kicker(s, 'Customers', C.rose)
  heading(s, 'Loyalty Cards & Campaigns', { size: 28 })

  s.addText('Loyalty Card', { x: 0.5, y: 1.55, w: 5.9, h: 0.3, fontSize: 12, bold: true, color: C.rose, fontFace: 'Segoe UI' })
  const lc = [
    'Every customer gets a unique number: RES-CUST-000001',
    'Printed as a barcode on a fold-in-half laminated card',
    'Cashier scans the card → customer attached in 1 second',
    'Card number never changes even if name/phone is updated',
    'Activity report: total spend, visits, rewards earned',
  ]
  lc.forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.95 + i * 0.52, w: 5.9, h: 0.44, rectRadius: 0.07, fill: { color: C.surface }, line: { color: C.border, pt: 1 } })
    s.addText('›  ' + t, { x: 0.65, y: 1.95 + i * 0.52, w: 5.6, h: 0.44, fontSize: 10, color: C.muted, fontFace: 'Segoe UI', valign: 'middle' })
  })

  s.addText('Campaigns & Rewards', { x: 7.0, y: 1.55, w: 5.9, h: 0.3, fontSize: 12, bold: true, color: C.rose, fontFace: 'Segoe UI' })
  const cp = [
    'Manager creates campaign with spend threshold (e.g. spend $50 → get reward)',
    'Month end: click Generate Monthly Rewards → system finds qualifying customers and issues vouchers',
    'At POS: eligible reward appears automatically when customer is scanned',
    'Cashier taps to apply the reward to the current sale',
    'Reward statuses: Issued → Redeemed / Expired',
  ]
  cp.forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 7.0, y: 1.95 + i * 0.52, w: 5.9, h: 0.44, rectRadius: 0.07, fill: { color: C.surface }, line: { color: C.border, pt: 1 } })
    s.addText('›  ' + t, { x: 7.15, y: 1.95 + i * 0.52, w: 5.6, h: 0.44, fontSize: 10, color: C.muted, fontFace: 'Segoe UI', valign: 'middle' })
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 24 — SECTION DIVIDER: INVENTORY
// ══════════════════════════════════════════════════════════════════════
dividerSlide(14, 14, 'Inventory & Barcode Labels', 'Creating new products, restocking existing ones, barcode assignment, and printing labels.', C.accent)

// ══════════════════════════════════════════════════════════════════════
// SLIDE 25 — CREATE VS RESTOCK
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.accent)
  kicker(s, 'Inventory — Two Workflows', C.accent)
  heading(s, 'Create New vs Receive Existing Stock', { size: 26 })

  tableSlide(s,
    ['Workflow', 'When to use', 'What it does'],
    [
      ['Create New Product', 'Product has never been in the system before',   'Creates a new product record, assigns a barcode, sets initial stock quantity'],
      ['Receive Stock',       'Product exists — you just received more units', 'Adds quantity to the existing product. Does NOT create a duplicate.'],
    ],
    0.5, 1.7, 12.3, [2.5, 4.0, 5.8], C.accent
  )

  s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 3.0, w: 12.3, h: 0.65, rectRadius: 0.1, fill: { color: C.rose, transparency: 92 }, line: { color: C.rose, pt: 1 } })
  s.addText('⚠️  Always search for the product first. Creating a duplicate causes split stock — the same item exists twice, making reports wrong.', {
    x: 0.7, y: 3.0, w: 11.9, h: 0.65, fontSize: 11, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })

  card(s, 0.5, 3.85, 5.9, 2.25, '🏷️', '3 ways to assign a barcode',
    '1. Type or scan directly on the product form\n2. Assign after saving via the barcode modal\n3. Bulk auto-generate with a prefix (clothing stores)', C.accent)
  card(s, 6.9, 3.85, 5.9, 2.25, '🖨️', 'After assigning — print labels',
    'Barcode Management → Templates → New Template → From Existing Product → set label size → Print Job → print quantity', C.accent)
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 26 — CROSS-BUSINESS BARCODE LOOKUP
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.accent)
  kicker(s, 'Inventory — Scanning Unknown Barcodes', C.accent)
  heading(s, 'What Happens When You Scan an Unknown Item?', { size: 24 })

  const steps = [
    ['Check this business',              'Barcode found → product added to cart. Done.'],
    ['Check barcode templates',          'Template found → pre-filled product form opens. One click to create.'],
    ['Search all other businesses',      'Barcode found in another store → shows the match, offers to stock it here.'],
    ['Completely unknown — Quick Stock Add', 'Form opens with barcode pre-filled. Enter name, price, quantity. Product created immediately.'],
  ]
  steps.forEach(([title, desc], i) => {
    stepRow(s, i + 1, title, desc, 0.5, 1.6 + i * 0.75, 12.3, C.accent)
  })

  s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 4.75, w: 12.3, h: 0.65, rectRadius: 0.1, fill: { color: C.accent, transparency: 92 }, line: { color: C.accent, pt: 1 } })
  s.addText('📌  The same barcode can be a different product in different businesses — that is fine. Each business owns its own barcode→product mapping. There is no conflict.', {
    x: 0.7, y: 4.75, w: 11.9, h: 0.65, fontSize: 11, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 27 — BALES & TEMPLATES
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.accent)
  kicker(s, 'Inventory — Clothing & Templates', C.accent)
  heading(s, 'Bales & Barcode Templates', { size: 28 })

  s.addText('Used Clothing Bales', { x: 0.5, y: 1.55, w: 5.9, h: 0.3, fontSize: 12, bold: true, color: C.accent, fontFace: 'Segoe UI' })
  const ba = [
    'A bale = bulk lot of second-hand items (e.g. 200 pieces at $0.80 each)',
    'Record the bale: item count, cost price, unit selling price',
    'Print a barcode label per bale (e.g. BALE-HXI-042)',
    'Scan bale barcode at POS → one item sold, count decrements',
    'BOGO promotions can be set per bale',
  ]
  ba.forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.95 + i * 0.52, w: 5.9, h: 0.44, rectRadius: 0.07, fill: { color: C.surface }, line: { color: C.border, pt: 1 } })
    s.addText('›  ' + t, { x: 0.65, y: 1.95 + i * 0.52, w: 5.6, h: 0.44, fontSize: 10, color: C.muted, fontFace: 'Segoe UI', valign: 'middle' })
  })

  s.addText('Barcode Templates', { x: 7.0, y: 1.55, w: 5.9, h: 0.3, fontSize: 12, bold: true, color: C.accent, fontFace: 'Segoe UI' })
  const bt = [
    'A template saves a barcode + default product data (name, price, size, colour, SKU)',
    'Created once per product line in Barcode Management → Templates',
    'When new batch arrives, scan barcode → template found → one click creates the product',
    'Configure label size, font, symbology (CODE128, EAN13, etc.)',
    'Paper formats: A4, label_2x1, CR80, receipt',
  ]
  bt.forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 7.0, y: 1.95 + i * 0.52, w: 5.9, h: 0.44, rectRadius: 0.07, fill: { color: C.surface }, line: { color: C.border, pt: 1 } })
    s.addText('›  ' + t, { x: 7.15, y: 1.95 + i * 0.52, w: 5.6, h: 0.44, fontSize: 10, color: C.muted, fontFace: 'Segoe UI', valign: 'middle' })
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 28 — TEAM CHAT
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.purple)
  kicker(s, 'Section 20 — Team Chat', C.purple)
  heading(s, 'Built-In Team Chat', { size: 28 })

  card(s, 0.5, 1.6, 5.9, 2.0, '💬', 'How to open it',
    'Click the 💬 Chat button in the sidebar from any screen. A floating panel opens — draggable, stays on top. All staff share one General room. Messages delivered in real time.',
    C.purple)
  card(s, 7.0, 1.6, 5.9, 2.0, '📢', 'What to use it for',
    'Shift handover notes, quick questions, closing reminders, coordination between tills.',
    C.purple)

  s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 3.8, w: 5.9, h: 0.7, rectRadius: 0.1, fill: { color: C.purple, transparency: 91 }, line: { color: C.purple, pt: 1 } })
  s.addText('🔴 Unread badge appears when a message arrives while the panel is closed. A 🔔 bell notification is also sent.', {
    x: 0.7, y: 3.8, w: 5.5, h: 0.7, fontSize: 10.5, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })

  s.addShape(pptx.ShapeType.roundRect, { x: 7.0, y: 3.8, w: 5.9, h: 0.7, rectRadius: 0.1, fill: { color: C.rose, transparency: 91 }, line: { color: C.rose, pt: 1 } })
  s.addText('⚠️ Messages auto-delete after 7 days. Do not record financial data in chat — use payroll notes, expense records, or contracts instead.', {
    x: 7.2, y: 3.8, w: 5.5, h: 0.7, fontSize: 10.5, color: C.text, fontFace: 'Segoe UI', wrap: true, valign: 'middle',
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 29 — KEY TAKEAWAYS
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s)
  accentBar(s, C.green)
  kicker(s, 'Summary', C.green)
  heading(s, 'Key Takeaways', { size: 30 })

  const items = [
    ['📟', 'One scanner, many actions',  'Employee card → clock in. Customer card → attach to sale. Product barcode → add to cart. Unknown → create product.',  C.green,  0.5,  1.6],
    ['🔔', 'Bell = action needed',       'Never ignore a red bell. Every pending approval, payment, or payroll sits in the notification panel waiting for you.',    C.amber,  4.6,  1.6],
    ['🔒', 'EOD locks are permanent',    'Once a day is locked it cannot be changed. Count carefully before locking. Batch catch-up is available for missed days.',  C.rose,   8.7,  1.6],
    ['👔', 'Owner must approve payroll', 'No payroll spreadsheet can be exported without owner approval. The status chain is strictly one-way.',                    C.purple, 0.5,  4.1],
    ['📦', 'Create vs Restock',          'Create a new product only if it has never been in the system. For existing products use Receive Stock to add quantity.',   C.accent, 4.6,  4.1],
    ['📖', 'Full user guide available',  'Every workflow described today is documented in full in docs/user-guide.md. Refer to it whenever you are unsure.',         C.teal,   8.7,  4.1],
  ]
  items.forEach(([icon, title, desc, color, x, y]) => {
    card(s, x, y, 3.9, 2.1, icon, title, desc, color)
  })
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 30 — Q&A
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide()
  addBg(s, C.bg)
  s.addShape(pptx.ShapeType.ellipse, { x: 4, y: -2, w: 10, h: 8, fill: { color: '0D2040' }, line: { color: '0D2040' } })

  s.addText('END OF PRESENTATION', {
    x: 1, y: 1.3, w: 11.33, h: 0.35,
    fontSize: 10, bold: true, charSpacing: 4,
    color: C.green, fontFace: 'Segoe UI', align: 'center',
  })
  s.addText('Questions?', {
    x: 1, y: 1.85, w: 11.33, h: 2.0,
    fontSize: 72, bold: true,
    color: C.text, fontFace: 'Segoe UI', align: 'center',
  })
  s.addText('For step-by-step instructions on any workflow, refer to the full user guide at  docs/user-guide.md', {
    x: 1.5, y: 4.15, w: 10.33, h: 0.7,
    fontSize: 15, color: C.muted,
    fontFace: 'Segoe UI', align: 'center', wrap: true,
  })
}

// ── Write file ─────────────────────────────────────────────────────────
const outPath = path.join(__dirname, '..', 'docs', 'presentation.pptx')
pptx.writeFile({ fileName: outPath }).then(() => {
  console.log('✅  Saved: ' + outPath)
}).catch(err => {
  console.error('❌  Error:', err)
  process.exit(1)
})
