const fs = require('fs');
const path = require('path');

const mapFile = path.resolve(__dirname, 'prisma-relation-renames-fuzzy-filtered.json');
const repoRoot = path.resolve(__dirname, '..');
if (!fs.existsSync(mapFile)) { console.error('mapping missing', mapFile); process.exit(2); }
const mappings = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const exts = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']);
const skipDirs = new Set(['node_modules', '.git', 'backups', 'backups_old', 'dist', 'out', '.next', 'prisma']);

function walk(dir) {
  const res = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (skipDirs.has(name)) continue;
      res.push(...walk(full));
    } else if (st.isFile()) {
      if (exts.has(path.extname(name))) res.push(full);
    }
  }
  return res;
}

function makeRegexes(from) {
  const dot = new RegExp('\\.' + from + '\\b', 'g');
  const quoted = new RegExp('(["\'])' + from + '(["\'])(?=\s*:\s*)', 'g');
  const bracketAccess = new RegExp('\\[\\s*(["\'])' + from + '(["\'])\\s*\\]', 'g');
  const unquoted = new RegExp('([^A-Za-z0-9_])' + from + '(?=\s*:\s*)', 'g');
  return { dot, quoted, bracketAccess, unquoted };
}

const files = walk(repoRoot);
let changed = 0;
let replacements = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let out = content;
  let fileRepl = 0;
  for (const {from, to} of mappings) {
    const {dot, quoted, bracketAccess, unquoted} = makeRegexes(from);
    out = out.replace(dot, '.' + to);
    out = out.replace(quoted, (m,q1,q2)=> q1+to+q2);
    out = out.replace(bracketAccess, (m,q1,q2)=> '['+q1+to+q2+']');
    out = out.replace(unquoted, (m,p1)=> p1+to);
  }
  if (out !== content) {
    const bak = file + '.prisma-rename-bak2';
    if (!fs.existsSync(bak)) fs.writeFileSync(bak, content, 'utf8');
    fs.writeFileSync(file, out, 'utf8');
    changed++;
    // crude count: compare lengths
    replacements += Math.abs(out.length - content.length) || 1;
    console.log('Patched', file);
  }
}
console.log('Done. Files changed:', changed, 'approx replacements (by length diff):', replacements);
