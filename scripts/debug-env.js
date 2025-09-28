const path = require('path');
const { exec } = require('child_process');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

console.log('Parent process DATABASE_URL ->', !!process.env.DATABASE_URL);
console.log('Parent DATABASE_URL (redacted) ->', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^@]+@/, ':<redacted>@') : 'NONE');

exec('node -e "console.log(\'Child process DATABASE_URL ->\', !!process.env.DATABASE_URL); console.log(\'Child DATABASE_URL (redacted) ->\', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^@]+@/,\':<redacted>@\') : \'NONE\')"', { env: { ...process.env } }, (err, stdout, stderr) => {
  if (err) {
    console.error('Child process error:', err);
    console.error('STDERR:', stderr);
    return;
  }
  console.log('--- child output ---');
  console.log(stdout);
});
