const puppeteer = require('puppeteer-core')
const fs = require('fs')

// Try common Chrome/Edge paths on Windows
const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
]

function findBrowser() {
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p
    } catch (e) {}
  }
  return null
}

;(async () => {
  const executablePath = findBrowser()
  if (!executablePath) {
    console.error('No local Chrome/Edge found. Please run this test on a machine with Chrome or Edge installed.')
    process.exit(2)
  }

  const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()))

  try {
    // Navigate to the payroll period page (example periodId assumed 'test-period')
    const periodId = 'test-period'
    await page.goto(`http://localhost:8080/payroll/${periodId}`, { waitUntil: 'networkidle2', timeout: 60000 })

    // Wait for a payroll entry row to appear and click the first entry "Details" button.
    // This script is best-effort - it will query for common selectors.
    await page.waitForSelector('[data-test="payroll-entry-row"]', { timeout: 15000 })
    const rows = await page.$$('[data-test="payroll-entry-row"]')
    if (!rows || rows.length === 0) {
      console.error('No payroll entry rows found on period page')
      await browser.close()
      process.exit(3)
    }

    // Click the first details button inside the row
    const firstRow = rows[0]
    const detailsBtn = await firstRow.$('[data-test="entry-details-btn"]')
    if (!detailsBtn) {
      console.error('Entry details button not found')
      await browser.close()
      process.exit(4)
    }
    await detailsBtn.click()

    // Wait for the modal
    await page.waitForSelector('[data-test="payroll-entry-modal"]', { timeout: 10000 })

    // Click Add Benefit
    await page.click('[data-test="add-benefit-toggle"]')

    // Type a unique benefit name into the search input
    const uniqueName = 'AutoTest Benefit ' + Date.now()
    await page.type('[data-test="benefit-search-input"]', uniqueName)

    // Set amount
    await page.type('[data-test="benefit-amount-input"]', '100')

    // Click Create & Add
    await page.click('[data-test="benefit-create-add-btn"]')

    // Wait a bit for network activity
    await page.waitForTimeout(1500)

    // Grab instrumentation logs from the page if present
    const logs = await page.evaluate(() => {
      return (window.__instrumentLogs || [])
    })

    console.log('INSTRUMENT_LOGS:', JSON.stringify(logs, null, 2))

    // Also snapshot the Manual Benefits list
    const manual = await page.$$eval('[data-test="manual-benefit-item"]', (els) => els.map(e => e.textContent))
    console.log('MANUAL_BENEFITS:', manual)

    await browser.close()
    process.exit(0)
  } catch (err) {
    console.error('Test failed:', err)
    await browser.close()
    process.exit(5)
  }
})()
