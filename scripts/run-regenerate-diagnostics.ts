import path from 'path'
;(async ()=>{
  const mod = await import(path.resolve('src/app/api/payroll/exports/regenerate/route.ts'))
  const body = { payrollPeriodId: 'PP-KhQ1m6QGECSU', includeDiagnostics: true }
  // Simulate NextRequest.json
  const fakeReq: any = { json: async () => body }
  try {
    const resp = await mod.POST(fakeReq as any)
    // NextResponse.json returns a Response-like object; try to print its body if accessible
    if (resp && resp.body) {
      console.log('Response body:', resp.body)
    } else {
      console.log('Received response:', resp)
    }
  } catch (e) {
    console.error('Error calling route POST:', e)
  }
})()
