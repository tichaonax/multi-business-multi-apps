// scripts/check-scripts-available.js
// Lists developer scripts in the repository and reports whether they exist.
// Usage: node scripts/check-scripts-available.js

const fs = require('fs')
const path = require('path')

const scriptDir = path.join(process.cwd(), 'scripts')

// Known dev scripts - extend this list as needed.
const knownScripts = [
  'seed-hardware-demo.js',
  'seed-grocery-demo.js',
  'seed-contractors-demo.js',
  'seed-test-maintenance.js',
  'seed-dev-data.js',
  'seed-migration-data.js',
  'seed-reference-data.js',
  'restore-from-backup',
  'restore-from-backup.js',
  'backup-data.js',
  'pre_migration_backup.sql'
]

function previewFile(fp, max = 300) {
  try {
    const fd = fs.openSync(fp, 'r')
    const buf = Buffer.allocUnsafe(max)
    const read = fs.readSync(fd, buf, 0, max, 0)
    fs.closeSync(fd)
    return buf.slice(0, read).toString('utf8').replace(/\r\n/g, '\n')
  } catch (err) {
    return ''
  }
}

function statScript(name) {
  const abs = path.join(scriptDir, name)
  try {
    const s = fs.statSync(abs)
    if (s.isFile() || s.isDirectory()) {
      const isFile = s.isFile()
      return {
        name,
        exists: true,
        path: abs,
        isFile,
        size: isFile ? s.size : null,
        preview: isFile ? previewFile(abs, 300) : null
      }
    }
  } catch (err) {
    return { name, exists: false }
  }
}

function listAllScripts() {
  const results = knownScripts.map(statScript)
  // Also include any other files present in scripts/ that look interesting
  let extra = []
  try {
    const all = fs.readdirSync(scriptDir)
    extra = all.filter(n => !knownScripts.includes(n)).map(statScript)
  } catch (err) {
    // scripts dir might not exist
  }
  return results.concat(extra)
}

function main() {
  const list = listAllScripts()
  console.log('Dev scripts diagnostic')
  console.log('======================')
  console.log('Script directory:', scriptDir)
  console.log('Found entries:', list.length)
  console.log('')
  list.forEach(r => {
    if (!r.exists) {
      console.log(`- ${r.name}: MISSING`)
    } else if (r.isFile) {
      console.log(`- ${r.name}: present (file, ${r.size} bytes)`)
      const lines = (r.preview || '').split('\n').slice(0, 8).join('\n')
      if (lines) console.log('  preview:\n' + lines.split('\n').map(l => '    ' + l).join('\n'))
    } else {
      console.log(`- ${r.name}: present (directory)`)
    }
    console.log('')
  })
  // summary
  const present = list.filter(x => x.exists)
  console.log('Summary:')
  console.log(`  total known checked: ${knownScripts.length}`)
  console.log(`  present: ${present.length}`)
}

main()
