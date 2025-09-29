const fs = require('fs');
const path = require('path');

const bakPath = path.resolve(__dirname, '../prisma/schema.prisma.bak');
const curPath = path.resolve(__dirname, '../prisma/schema.prisma');
const mapPath = path.resolve(__dirname, 'prisma-relation-renames-fixed.json');
const outPath = path.resolve(__dirname, 'prisma-relation-renames-fuzzy.json');

function read(p) { return fs.readFileSync(p, 'utf8'); }
if (!fs.existsSync(bakPath) || !fs.existsSync(curPath)) {
  console.error('schema files missing'); process.exit(2);
}
const bak = read(bakPath);
const cur = read(curPath);
const existingMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const relRegex = /^\s*([A-Za-z0-9_]+)\s+[A-Za-z0-9_\?\[\]]+\s+@relation/mg;
function extractIds(text) { const ids = []; let m; while ((m = relRegex.exec(text)) !== null) ids.push(m[1]); return ids; }
const bakIds = Array.from(new Set(extractIds(bak)));
const curIds = Array.from(new Set(extractIds(cur)));
const curSet = new Set(curIds);

function snakeToCamel(s){ return s.split('_').map((p,i)=> i? p.charAt(0).toUpperCase()+p.slice(1):p).join(''); }

function splitToTokensIdentifier(id){
  // split snake and camel into tokens
  const withUnders = id.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ');
  return withUnders.split(/\s+/).map(t=>t.toLowerCase()).filter(Boolean);
}

// Build baseline mapping from existing map where to != null
const mapped = {};
for (const e of existingMap) if (e.to) mapped[e.from]=e.to;

const results = [];
for (const from of bakIds.filter(id=>id.includes('_'))) {
  if (mapped[from]) { results.push({from, to: mapped[from], method: 'existing', score: 1}); continue; }
  const camel = snakeToCamel(from);
  if (curSet.has(camel)) { results.push({from, to: camel, method: 'camelExact', score:1}); continue; }
  // fuzzy token overlap
  const fromTokens = splitToTokensIdentifier(from);
  let best = null;
  for (const candidate of curIds) {
    const candTokens = splitToTokensIdentifier(candidate);
    const common = fromTokens.filter(t=>candTokens.includes(t));
    const score = common.length / Math.max(fromTokens.length, 1);
    if (!best || score>best.score) best = {candidate, score, common};
  }
  if (best && best.score >= 0.75) {
    results.push({from, to: best.candidate, method: 'fuzzy', score: best.score, common: best.common});
  } else {
    results.push({from, to: null, method: 'unmapped', score: best?best.score:0, candidate: best?best.candidate:null});
  }
}

fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log('Wrote', outPath);
const mappedCount = results.filter(r=>r.to).length;
console.log('Mapped', mappedCount, 'of', results.length);
const unresolved = results.filter(r=>!r.to).map(r=>r.from);
if (unresolved.length) console.log('Unresolved examples (first 20):', unresolved.slice(0,20));
