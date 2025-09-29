const fs = require('fs');
const path = require('path');

const bakPath = path.resolve(__dirname, '../prisma/schema.prisma.bak');
const curPath = path.resolve(__dirname, '../prisma/schema.prisma');

const bak = fs.readFileSync(bakPath, 'utf8');
const cur = fs.readFileSync(curPath, 'utf8');

function extractRelationFields(text) {
  const lines = text.split(/\r?\n/);
  const fields = [];
  const re = /^\s*([a-z0-9_]+)\s+([A-Z][A-Za-z0-9_\[\]]+)/;
  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      const name = m[1];
      const type = m[2];
      // skip scalar-like fields (ending with ? or basic types)
      if (!/^(String|Int|DateTime|Decimal|Boolean|Json|BigInt)$/.test(type.replace(/[\[\]\?]/g, ''))) {
        fields.push({ name, type, line: line.trim() });
      }
    }
  }
  return fields;
}

function toCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

const bakFields = extractRelationFields(bak).map(f => f.name).filter(n => n.includes('_'));
const curFields = extractRelationFields(cur).map(f => f.name);

const mapping = [];
for (const snake of bakFields) {
  const camel = toCamel(snake);
  if (curFields.includes(camel)) {
    mapping.push({ from: snake, to: camel });
  } else {
    // also check PascalCase or other variants
    const alt = snake.split('_').map((p, i) => i===0 ? p : p[0].toUpperCase()+p.slice(1)).join('');
    if (curFields.includes(alt)) {
      mapping.push({ from: snake, to: alt });
    } else {
      mapping.push({ from: snake, to: null });
    }
  }
}

console.log('Renamed relation fields (from -> to). Null = not found in current schema:');
console.log(JSON.stringify(mapping, null, 2));

// also write to disk for copy/paste
fs.writeFileSync(path.resolve(__dirname, 'prisma-relation-renames.json'), JSON.stringify(mapping, null, 2));
console.log('Wrote scripts/prisma-relation-renames.json');
