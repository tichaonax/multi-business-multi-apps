const fs = require('fs');
const path = require('path');

const bakPath = path.resolve(__dirname, '../prisma/schema.prisma.bak');
const curPath = path.resolve(__dirname, '../prisma/schema.prisma');
const outPath = path.resolve(__dirname, 'prisma-relation-renames-fixed.json');

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.error('Failed to read', file, e.message);
    process.exit(2);
  }
}

const bak = read(bakPath);
const cur = read(curPath);

const relRegex = /^\s*([A-Za-z0-9_]+)\s+[A-Za-z0-9_\?\[\]]+\s+@relation/mg;

function extractIds(text) {
  const ids = new Set();
  let m;
  while ((m = relRegex.exec(text)) !== null) {
    ids.add(m[1]);
  }
  return Array.from(ids);
}

function snakeToCamel(s) {
  return s.split('_').map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

const bakIds = extractIds(bak).filter(id => id.includes('_'));
const curIds = new Set(extractIds(cur));

const results = [];

for (const from of bakIds.sort()) {
  const candidate = snakeToCamel(from);
  const found = curIds.has(candidate) ? candidate : null;
  results.push({ from, to: found });
}

fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log('Wrote', outPath, 'with', results.length, 'entries');

// Print summary of filled vs null
const filled = results.filter(r => r.to).length;
console.log('Mapped:', filled, 'of', results.length);
const nulls = results.filter(r => !r.to).map(r => r.from);
if (nulls.length) {
  console.log('Unmapped examples (first 20):', nulls.slice(0,20));
}
