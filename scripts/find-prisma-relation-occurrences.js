const fs = require('fs');
const path = require('path');
const mapFile = path.resolve(__dirname, 'prisma-relation-renames-fuzzy-filtered.json');
if (!fs.existsSync(mapFile)) { console.error('mapping missing'); process.exit(2); }
const mappings = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const froms = mappings.map(m=>m.from).sort((a,b)=>b.length-a.length);

const repo = path.resolve(__dirname, '..');
const exts = new Set(['.js','.ts','.jsx','.tsx','.mjs','.cjs']);
const skip = new Set(['node_modules','.git','.next','prisma','backups','dist','out']);

function walk(dir){
  const res = [];
  for (const name of fs.readdirSync(dir)){
    if (skip.has(name)) continue;
    const full = path.join(dir,name);
    const st = fs.statSync(full);
    if (st.isDirectory()) res.push(...walk(full));
    else if (st.isFile() && exts.has(path.extname(name))) res.push(full);
  }
  return res;
}

const files = walk(repo);
let totalMatches = 0;
for (const file of files){
  const txt = fs.readFileSync(file,'utf8');
  const lines = txt.split(/\r?\n/);
  let found = [];
  for (let i=0;i<lines.length;i++){
    const line = lines[i];
    for (const f of froms){
      if (line.includes(f)) found.push({lineNumber:i+1, line:line.trim(), match:f});
    }
  }
  if (found.length){
    console.log('\n== FILE:', file);
    for (const h of found){
      console.log(h.lineNumber+':', h.match, '->', h.line);
      totalMatches++;
    }
  }
}
console.log('\nTotal matches:', totalMatches);
