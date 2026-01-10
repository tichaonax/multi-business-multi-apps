const fs = require('fs');
const path = require('path');

const posFiles = [
  'src/app/grocery/pos/page.tsx',
  'src/app/hardware/pos/page.tsx',
  'src/app/clothing/pos/page.tsx'
];

posFiles.forEach(filePath => {
  console.log(`Fixing ${filePath}...`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace the dependency array
  content = content.replace(
    /}, \[currentBusinessId, currentBusiness\?\.businessName, sessionUser\?\.name\]\)/g,
    '  // IMPORTANT: Only depend on currentBusinessId (string) to avoid infinite loops\n  // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [currentBusinessId])'
  );

  // Remove verbose console.logs to simplify
  content = content.replace(/console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Starting customer display initialization\.\.\.'\)\n\s+/g, '');
  content = content.replace(/console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Customer display window opened'\)\n\s+/g, '');
  content = content.replace(/console\.warn\('\[(?:Grocery|Hardware|Clothing) POS\] Could not open display window.*?\n.*?console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Continuing with initialization.*?\n\s+/gs, '');
  content = content.replace(/console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Fetching business details for:', currentBusinessId\)\n\s+/g, '');
  content = content.replace(/console\.error\('\[(?:Grocery|Hardware|Clothing) POS\] Failed to fetch business details, status:', response\.status\)\n\s+/g, '');
  content = content.replace(/console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Business data fetched:', \{[^}]+\}\)\n\s+/g, '');
  content = content.replace(/console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Waiting for BroadcastChannel to be ready\.\.\.'\)\n\s+/g, '');
  content = content.replace(/console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Sending greeting message\.\.\.'\)\n\s+/g, '');
  content = content.replace(/console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Greeting sent:', greetingData\)\n\s+/g, '');
  content = content.replace(/console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Page context set to POS'\)\n\s+/g, '');
  content = content.replace(/console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Cleanup: Setting context back to marketing'\)\n\s+/g, '');
  content = content.replace(/console\.log\('\[(?:Grocery|Hardware|Clothing) POS\] Waiting for business context\.\.\.', \{ currentBusinessId, hasBusiness: !!currentBusiness \}\)\n\s+/g, '');

  // Remove the check for currentBusiness in the if statement
  content = content.replace(
    /if \(!currentBusinessId \|\| !currentBusiness\) \{\n.*?return\n\s+\}/gs,
    'if (!currentBusinessId) {\n      return\n    }'
  );

  // Simplify try-catch blocks
  content = content.replace(
    /\/\/ Try to open display \(may fail if already open or popup blocked - that's OK\)\n\s+try \{\n\s+await openDisplay\(\)\n.*?\} catch \(displayError\) \{\n.*?\}/gs,
    '// Try to open display (may fail if already open or popup blocked - that\'s OK)\n        try {\n          await openDisplay()\n        } catch (displayError) {\n          // Display may already be open from home page\n        }'
  );

  fs.writeFileSync(filePath, content);
  console.log(`✓ Fixed ${filePath}`);
});

console.log('\nAll POS files fixed!');
