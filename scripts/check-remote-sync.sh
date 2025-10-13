#!/bin/bash

# Quick Remote Server Sync Check
# Run this on the REMOTE SERVER to verify code is updated

echo "========================================"
echo "🔍 REMOTE SERVER SYNC CHECK"
echo "========================================"
echo ""

echo "1. Current Git Commit:"
git log -1 --pretty=format:"%h - %s (%cd)" --date=short
echo ""
echo ""

echo "2. Expected Commit: e528f6a - fix: Windows service now spawns Next.js directly without npm layer"
echo ""

echo "3. File Checksum (service-wrapper-hybrid.js):"
md5sum windows-service/service-wrapper-hybrid.js 2>/dev/null || md5 windows-service/service-wrapper-hybrid.js 2>/dev/null || certutil -hashfile windows-service/service-wrapper-hybrid.js MD5 | findstr -v ":" | findstr -v "CertUtil"
echo ""

echo "4. File Size (should be ~46KB):"
ls -lh windows-service/service-wrapper-hybrid.js | awk '{print $5, $9}'
echo ""

echo "5. Looking for fix signatures in file:"
echo -n "   - startApplication method: "
grep -c "async startApplication()" windows-service/service-wrapper-hybrid.js
echo -n "   - Direct node spawn: "
grep -c "spawn('node', \[nextPath, 'start'\]" windows-service/service-wrapper-hybrid.js
echo -n "   - Port verification: "
grep -c "verifyNextJsStarted" windows-service/service-wrapper-hybrid.js
echo -n "   - OLD CODE (should be 0): "
grep -c "spawn(npmCmd, \['run', 'start'\]" windows-service/service-wrapper-hybrid.js
echo ""

echo "6. Git Status:"
git status --short windows-service/service-wrapper-hybrid.js
echo ""

echo "========================================"
echo "📊 INTERPRETATION"
echo "========================================"
echo ""
echo "✅ Code is synced if:"
echo "   - Commit hash is e528f6a or later"
echo "   - File size is around 46KB"
echo "   - All signature counts > 0 (except OLD CODE = 0)"
echo "   - Git status shows no modifications"
echo ""
echo "❌ Code is NOT synced if:"
echo "   - Commit hash is older than e528f6a"
echo "   - File size is around 39KB (old version)"
echo "   - OLD CODE count > 0"
echo "   - Git status shows 'M' (modified)"
echo ""
