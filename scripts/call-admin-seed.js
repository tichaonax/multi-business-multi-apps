// Simple helper to POST to the running dev server admin seed endpoint
(async () => {
  try {
    const url = process.env.ADMIN_SEED_URL || 'http://localhost:8080/api/admin/seed-clothing'
    const body = { confirm: true, confirmText: 'SEED-CLOTHING-TEST', _forceAdmin: true }
    console.log('Posting to', url)
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('Seed endpoint returned error:', res.status, json)
      process.exitCode = 2
    } else {
      console.log('Seed endpoint success:', json)
    }
  } catch (err) {
    console.error('Error calling seed endpoint:', err)
    process.exitCode = 1
  }
})()
