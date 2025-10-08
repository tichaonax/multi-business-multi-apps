const ExcelJS = require('exceljs')
const fs = require('fs')
const path = require('path')

const file = process.argv[2]
if (!file) {
  console.error('Usage: node inspect-xlsx-verbose.js <path-to-xlsx>')
  process.exit(2)
}
;(async () => {
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(file)
    const sheet = workbook.worksheets[0]
    console.log('Sheet:', sheet.name)
    const maxRow = Math.min(sheet.rowCount, 20)
    for (let r = 1; r <= maxRow; r++) {
      const row = sheet.getRow(r)
      const vals = row.values ? row.values.slice(1).map(v => (v === undefined ? null : v)) : []
      console.log(`Row ${r}:`, vals)
    }
    console.log('Total rows:', sheet.rowCount)
    console.log('Column count (worksheet.columns.length):', sheet.columns.length)
    console.log('Column widths:', sheet.columns.map(c => c && c.width))
  } catch (e) {
    console.error('Error reading file', e)
  }
})()
