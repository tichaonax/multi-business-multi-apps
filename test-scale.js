/**
 * Scale diagnostic — tries multiple configs at 38400 baud.
 * Run: node test-scale.js
 *
 * TEST ORDER:
 *   1. 38400, 8N1, rtscts:false  (bypass HW flow control, assert RTS manually)
 *   2. 38400, 8N1, rtscts:true   (full hardware handshake)
 *   3. 9600,  8N1, rtscts:false  (fall-back baud)
 *   4. 19200, 8N1, rtscts:false
 *   5. 4800,  8N1, rtscts:false
 *   6. 1200,  8N1, rtscts:false
 */

const { SerialPort } = require('./electron/node_modules/serialport')

const COM_PORT = 'COM5'
const LISTEN_MS = 4000   // ms to listen per test

const CONFIGS = [
  { label: '38400 8N1 rtscts:false (manual RTS)', baudRate: 38400, rtscts: false, assertRts: true },
  { label: '38400 8N1 rtscts:true  (HW handshake)', baudRate: 38400, rtscts: true,  assertRts: false },
  { label: '9600  8N1 rtscts:false',               baudRate: 9600,  rtscts: false, assertRts: true },
  { label: '19200 8N1 rtscts:false',               baudRate: 19200, rtscts: false, assertRts: true },
  { label: '4800  8N1 rtscts:false',               baudRate: 4800,  rtscts: false, assertRts: true },
  { label: '1200  8N1 rtscts:false',               baudRate: 1200,  rtscts: false, assertRts: true },
]

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

function readableAscii(buf) {
  return buf.toString('latin1').replace(/[\x00-\x1f\x7f-\xff]/g, c => {
    const code = c.charCodeAt(0)
    if (code === 13) return '<CR>'
    if (code === 10) return '<LF>'
    return `[${code.toString(16).padStart(2,'0')}]`
  })
}

async function runConfig(cfg) {
  console.log(`\n${'═'.repeat(64)}`)
  console.log(`Config: ${cfg.label}`)
  console.log('═'.repeat(64))

  const port = new SerialPort({
    path: COM_PORT,
    baudRate: cfg.baudRate,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    rtscts: cfg.rtscts,
    autoOpen: false,
  })

  return new Promise((resolve) => {
    let totalBytes = 0
    let readableBytes = 0
    let shown = 0
    let lines = []

    port.open(async (err) => {
      if (err) {
        console.log(`  OPEN ERROR: ${err.message}`)
        return resolve()
      }
      console.log(`  Port open. ${cfg.assertRts ? 'Asserting RTS+DTR...' : 'Using rtscts auto.'}`)

      if (cfg.assertRts) {
        port.set({ rts: true, dtr: true }, () => {})
        await delay(200)
      }

      console.log(`  Listening ${LISTEN_MS / 1000}s...\n`)

      port.on('data', (chunk) => {
        totalBytes += chunk.length
        for (const b of chunk) {
          if (b >= 0x20 && b <= 0x7e) readableBytes++
        }
        if (shown < 8) {
          shown++
          const hex = Buffer.from(chunk).toString('hex').match(/.{1,2}/g).join(' ')
          const asc = readableAscii(chunk)
          console.log(`  ← hex: ${hex.slice(0, 60)}   asc: ${asc.slice(0, 40)}`)
          // Capture full lines for ASCII display
          lines.push(chunk.toString('latin1'))
        }
      })

      port.on('error', () => {})

      await delay(LISTEN_MS)

      const pct = totalBytes > 0 ? Math.round(100 * readableBytes / totalBytes) : 0
      const rate = Math.round(totalBytes / (LISTEN_MS / 1000))
      console.log(`\n  ── Summary ──────────────────────────────────`)
      console.log(`  Bytes received : ${totalBytes}  (${rate} bytes/sec)`)
      console.log(`  Readable ASCII : ${readableBytes} (${pct}%)`)
      if (pct >= 40) {
        console.log(`  ✅  READABLE DATA — this config works!`)
        if (lines.length) {
          const joined = lines.join('').replace(/[\r\n]+/g, '\n').trim()
          console.log(`\n  Full text received:\n  ${joined.split('\n').slice(0, 5).join('\n  ')}`)
        }
      } else if (totalBytes > 0 && pct === 0) {
        console.log(`  ⚠️   All zeros — RX line floating/shorted, or baud mismatch`)
      } else if (totalBytes > 0) {
        console.log(`  ⚠️   Some data but mostly unreadable — close but wrong framing/baud`)
      } else {
        console.log(`  ✗   No data received`)
      }

      port.close(() => resolve())
    })
  })
}

async function main() {
  console.log('Star MG-S8200 Multi-Config Diagnostic')
  console.log(`Port: ${COM_PORT}  |  Keep weight on scale throughout\n`)

  for (const cfg of CONFIGS) {
    await runConfig(cfg)
    await delay(600)
  }

  console.log('\n\nAll tests done.')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
