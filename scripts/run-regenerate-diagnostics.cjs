require('ts-node/register/transpile-only')
const path = require('path')
;(async ()=>{
  try {
    const mod = await require(path.resolve('src/app/api/payroll/exports/regenerate/route.ts'))
    const body = { payrollPeriodId: 'PP-KhQ1m6QGECSU', includeDiagnostics: true }
    const fakeReq = { json: async () => body }
    const resp = await mod.POST(fakeReq)
    // The route returns a NextResponse - try to read JSON by calling .json() if present
    if (resp && typeof resp.json === 'function') {
      const obj = await resp.json()
      console.log(JSON.stringify(obj, null, 2))
    } else if (resp && resp.body) {
      console.log('Response body available:', resp.body)
    } else {
      console.log('Response:', resp)
    }
  } catch (e) { console.error('Error invoking route:', e) }
})()
