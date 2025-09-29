const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const mapFile = path.resolve(__dirname, 'prisma-relation-renames-fixed.json');
if (!fs.existsSync(mapFile)) {
  console.error('Mapping file not found:', mapFile);
  process.exit(2);
}

const mappings = JSON.parse(fs.readFileSync(mapFile, 'utf8')).filter(m => m.to);
if (!mappings.length) {
  console.log('No mapped entries to apply');
  process.exit(0);
}

const exts = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']);
const skipDirs = new Set(['node_modules', '.git', 'backups', 'backups_old', 'dist', 'out', '.next', 'prisma']);

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const name of list) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (skipDirs.has(name)) continue;
      results.push(...walk(full));
    } else if (stat.isFile()) {
      if (exts.has(path.extname(name))) results.push(full);
    }
  }
  return results;
}

function makeRegexes(from) {
  // dot access: .businessProducts
  const dot = new RegExp('\\.' + from + '\\b', 'g');
  // unquoted object key: businessProducts:  (capture preceding char if not identifier char)
  const unquoted = new RegExp('([^A-Za-z0-9_])' + from + '(?=\s*:\s*)', 'g');
  // quoted key: 'businessProducts': or "businessProducts":
  const quoted = new RegExp('(["\'])' + from + '(["\'])(?=\s*:\s*)', 'g');
  // bracket quoted: ['businessProducts']
  const bracketQuoted = new RegExp('\\[\\s*(["\'])' + from + '(["\'])\\s*\\]', 'g');
  // bracket access: ['businessProducts'] or ["businessProducts"]
  const bracketAccess = new RegExp('\\[\\s*(["\'])' + from + '(["\'])\\s*\\]', 'g');
  // property access with bracket & quotes we handle with bracketAccess
  return { dot, unquoted, quoted, bracketAccess };
}

const files = walk(repoRoot);
let changedFiles = 0;
let totalReplacements = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  let fileReplacements = 0;
  for (const {from, to} of mappings) {
    const {dot, unquoted, quoted, bracketAccess} = makeRegexes(from);
    // dot
    newContent = newContent.replace(dot, (m) => {
      fileReplacements++;
      return '.' + to;
    });
    // quoted key or bracket access
    newContent = newContent.replace(quoted, (m, q1, q2) => {
      fileReplacements++;
      return q1 + to + q2;
    });
    // bracketAccess (['foo']) -> ['fooBar']
    newContent = newContent.replace(bracketAccess, (m, q1, q2) => {
      fileReplacements++;
      return '[' + q1 + to + q2 + ']';
    });
    // unquoted key: preserve prefix char
    newContent = newContent.replace(unquoted, (m, p1) => {
      fileReplacements++;
      return p1 + to;
    });
  }
  if (fileReplacements > 0 && newContent !== content) {
    // write backup and replace
    const bakPath = file + '.prisma-rename-bak';
    if (!fs.existsSync(bakPath)) fs.writeFileSync(bakPath, content, 'utf8');
    fs.writeFileSync(file, newContent, 'utf8');
    changedFiles++;
    totalReplacements += fileReplacements;
    console.log('Patched', file, 'replacements:', fileReplacements);
  }
}

console.log('Done. Files changed:', changedFiles, 'Total replacements:', totalReplacements);

if (changedFiles === 0) process.exit(0);
process.exit(0);
