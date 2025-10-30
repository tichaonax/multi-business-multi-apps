const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const backupPath = schemaPath + '.bak';

console.log('Reading', schemaPath);
let src = fs.readFileSync(schemaPath, 'utf8');

// Backup
fs.writeFileSync(backupPath, src, 'utf8');
console.log('Backup written to', backupPath);

// Regex: match any primary key field line that defines a String and @id but does NOT already contain @default
// Examples: "id String @id" or "eventId String @id"
// Replace with: original @id plus @default(uuid()) on the same line.
const updated = src.replace(/^(\s*\w+\s+String\s+@id)(?!.*@default)(.*)$/gim, (m, p1, p2) => {
  return `${p1} @default(uuid())${p2}`;
});

if (updated === src) {
  console.log('No changes required - no id lines without @default found.');
  process.exit(0);
}

fs.writeFileSync(schemaPath, updated, 'utf8');
console.log('Prisma schema updated: added @default(uuid()) to id fields without defaults.');
console.log('Please run `npx prisma generate` to regenerate the client.');
