const fs = require('fs');
const path = require('path');

const files = [
  'src/app/payroll/account/page.tsx',
  'src/app/payroll/account/deposits/page.tsx',
  'src/app/payroll/account/payments/page.tsx',
  'src/app/payroll/account/payments/advance/page.tsx',
  'src/app/payroll/account/payments/history/page.tsx',
  'src/components/payroll/deposit-form.tsx',
  'src/components/payroll/account-balance-card.tsx',
  'src/components/payroll/employee-payment-row.tsx',
];

const replacements = [
  // Backgrounds
  [/className="([^"]*?)bg-white([^"]*?)"/g, 'className="$1bg-white dark:bg-gray-800$2"'],
  [/className="([^"]*?)bg-gray-50([^"]*?)"/g, 'className="$1bg-gray-50 dark:bg-gray-700$2"'],
  [/className="([^"]*?)bg-blue-50([^"]*?)"/g, 'className="$1bg-blue-50 dark:bg-blue-900/20$2"'],
  [/className="([^"]*?)bg-green-50([^"]*?)"/g, 'className="$1bg-green-50 dark:bg-green-900/20$2"'],
  [/className="([^"]*?)bg-red-50([^"]*?)"/g, 'className="$1bg-red-50 dark:bg-red-900/20$2"'],
  [/className="([^"]*?)bg-yellow-50([^"]*?)"/g, 'className="$1bg-yellow-50 dark:bg-yellow-900/20$2"'],
  [/className="([^"]*?)bg-purple-50([^"]*?)"/g, 'className="$1bg-purple-50 dark:bg-purple-900/20$2"'],
  [/className="([^"]*?)bg-orange-50([^"]*?)"/g, 'className="$1bg-orange-50 dark:bg-orange-900/20$2"'],
  [/className="([^"]*?)bg-gray-100([^"]*?)"/g, 'className="$1bg-gray-100 dark:bg-gray-600$2"'],
  [/className="([^"]*?)bg-gray-200([^"]*?)"/g, 'className="$1bg-gray-200 dark:bg-gray-600$2"'],

  // Text colors
  [/className="([^"]*?)text-gray-900([^"]*?)"/g, 'className="$1text-gray-900 dark:text-gray-100$2"'],
  [/className="([^"]*?)text-gray-800([^"]*?)"/g, 'className="$1text-gray-800 dark:text-gray-200$2"'],
  [/className="([^"]*?)text-gray-700([^"]*?)"/g, 'className="$1text-gray-700 dark:text-gray-300$2"'],
  [/className="([^"]*?)text-gray-600([^"]*?)"/g, 'className="$1text-gray-600 dark:text-gray-400$2"'],
  [/className="([^"]*?)text-gray-500([^"]*?)"/g, 'className="$1text-gray-500 dark:text-gray-400$2"'],

  // Borders
  [/className="([^"]*?)border-gray-300([^"]*?)"/g, 'className="$1border-gray-300 dark:border-gray-600$2"'],
  [/className="([^"]*?)border-gray-200([^"]*?)"/g, 'className="$1border-gray-200 dark:border-gray-700$2"'],
  [/className="([^"]*?)border-blue-200([^"]*?)"/g, 'className="$1border-blue-200 dark:border-blue-800$2"'],
  [/className="([^"]*?)border-green-200([^"]*?)"/g, 'className="$1border-green-200 dark:border-green-800$2"'],
  [/className="([^"]*?)border-red-200([^"]*?)"/g, 'className="$1border-red-200 dark:border-red-800$2"'],
  [/className="([^"]*?)border-purple-200([^"]*?)"/g, 'className="$1border-purple-200 dark:border-purple-800$2"'],

  // Divides
  [/className="([^"]*?)divide-gray-200([^"]*?)"/g, 'className="$1divide-gray-200 dark:divide-gray-700$2"'],

  // Hovers
  [/className="([^"]*?)hover:bg-gray-50([^"]*?)"/g, 'className="$1hover:bg-gray-50 dark:hover:bg-gray-700$2"'],
  [/className="([^"]*?)hover:bg-blue-50([^"]*?)"/g, 'className="$1hover:bg-blue-50 dark:hover:bg-blue-900/30$2"'],
  [/className="([^"]*?)hover:bg-green-50([^"]*?)"/g, 'className="$1hover:bg-green-50 dark:hover:bg-green-900/30$2"'],
  [/className="([^"]*?)hover:bg-purple-50([^"]*?)"/g, 'className="$1hover:bg-purple-50 dark:hover:bg-purple-900/30$2"'],
  [/className="([^"]*?)hover:bg-gray-200([^"]*?)"/g, 'className="$1hover:bg-gray-200 dark:hover:bg-gray-600$2"'],
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  replacements.forEach(([pattern, replacement]) => {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) {
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
  } else {
    console.log(`➖ No changes: ${file}`);
  }
});

console.log('\n✨ Dark mode styling added to all payroll account pages!');
