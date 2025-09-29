const fs = require('fs')
const path = require('path')

const mappingPath = path.join(__dirname, 'prisma-relation-renames-fuzzy-filtered.json')
if (!fs.existsSync(mappingPath)) {
  console.error('Mapping file not found:', mappingPath)
  process.exit(1)
}
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'))
const map = Object.fromEntries(mapping.map(m => [m.from, m.to]).filter(([k,v]) => k && v))

const SRC = path.join(__dirname, '..', 'src')

function walk(dir) {
  const res = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      res.push(...walk(full))
    } else if (/\.(js|ts|tsx|jsx|mjs|cjs)$/.test(name)) {
      res.push(full)
    }
  }
  return res
}

function escapeForRegex(s){
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const files = walk(SRC)
let totalMatches = 0
const proposals = []

files.forEach(file => {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)

  lines.forEach((line, idx) => {
    for (const from of Object.keys(map)) {
      const to = map[from]
      if (!to) continue

      // Patterns to detect: unquoted key (job_titles:), quoted key ('job_titles': or "job_titles":), bracket access ["job_titles"] or ['job_titles'], and dot access .job_titles
      const patterns = [
        new RegExp('(^|[\s,{\[])' + escapeForRegex(from) + '\s*:', 'g'),
        new RegExp('["\']' + escapeForRegex(from) + '["\']\s*:', 'g'),
        new RegExp('\[\s*["\']' + escapeForRegex(from) + '["\']\s*\]', 'g'),
        new RegExp('\.' + escapeForRegex(from) + '\b', 'g')
      ]

      for (const pat of patterns) {
        if (pat.test(line)) {
          totalMatches++
          const snippet = line.trim()
          const replacement = snippet.replace(new RegExp(escapeForRegex(from), 'g'), to)
          proposals.push({ file, line: idx + 1, from, to, snippet, replacement })
          break
        }
      }
    }
  })
})

if (proposals.length === 0) {
  console.log('Dry-run: no candidate replacements found in src/ for the filtered mapping.')
} else {
  console.log('Dry-run: Proposed replacements:')
  proposals.forEach(p => {
    console.log(`- ${p.file}:${p.line}`)
    console.log(`    from: ${p.from}  ->  to: ${p.to}`)
    console.log(`    orig: ${p.snippet}`)
    console.log(`    new : ${p.replacement}`)
  })
  console.log(`\nTotal candidate replacements: ${proposals.length}`)
}

console.log(`\nScanned files: ${files.length}. Total raw matches found: ${totalMatches}`)
