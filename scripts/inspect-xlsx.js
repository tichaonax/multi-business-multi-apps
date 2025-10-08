const ExcelJS = require('exceljs')
const fs = require('fs')
const path = require('path')

const file = process.argv[2]
if (!file) {
  console.error('Usage: node inspect-xlsx.js <path-to-xlsx>')
  process.exit(2)
}
;(async () => {
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(file)
    const sheet = workbook.worksheets[0]
    console.log('Sheet:', sheet.name)
    const headerRow = sheet.getRow(1 + 3) // account for title + period + blank row -> headers are row 4
    // if headers are elsewhere try to find first non-empty row
    const maybeHeader = sheet.getRow(4)
    const findHeader = (r) => {
      const vals = r.values ? r.values.slice(1) : []
      if (vals && vals.length && vals.some(v => v !== null && v !== '')) return vals
      return null
    }
    let headerVals = findHeader(maybeHeader) || findHeader(sheet.getRow(1)) || []
    console.log('Header row values:', headerVals)

    // print first data row (row 5)
    const firstData = sheet.getRow(5)
    const dataVals = firstData.values ? firstData.values.slice(1) : []
    console.log('First data row:', dataVals)

    // Print column widths and number of columns
    console.log('Column count (worksheet.columns.length):', sheet.columns.length)
    console.log('Column widths:', sheet.columns.map(c => c && c.width))
  } catch (e) {
    console.error('Error reading file', e)
  }
})()
