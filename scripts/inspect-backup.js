const fs = require('fs');
const zlib = require('zlib');

const file = 'C:/Users/ticha/Downloads/Good-MultiBusinessSyncService-backup_full_2026-03-03T01-27-28.json.gz';
const compressed = fs.readFileSync(file);
const data = JSON.parse(zlib.gunzipSync(compressed).toString('utf8'));

// Check employees for profilePhotoUrl
const emps = data.businessData.employees || [];
console.log('=== EMPLOYEES & PHOTOS ===');
emps.forEach(function(e) {
  console.log('  ' + (e.fullName || e.firstName) + ': profilePhotoUrl=' + (e.profilePhotoUrl || 'null'));
});

// Check images table
const images = data.businessData.images;
console.log('\n=== IMAGES TABLE ===');
if (images && images.length > 0) {
  console.log('images count:', images.length);
  const s = images[0];
  console.log('Sample keys:', Object.keys(s));
  console.log('Has data field:', 'data' in s);
} else {
  console.log('No images table in backup (undefined or empty)');
}

// Search for /api/images/ references in employees JSON
const empStr = JSON.stringify(emps);
const matches = empStr.match(/\/api\/images\/[a-f0-9-]+/g);
console.log('\n=== IMAGE URL REFS IN EMPLOYEES ===');
console.log(matches ? matches : 'None found');

// Check what the metadata says about images
console.log('\n=== METADATA ===');
console.log(JSON.stringify(data.metadata, null, 2));
