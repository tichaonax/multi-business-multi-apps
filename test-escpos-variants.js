/**
 * Test Different ESC/POS Approaches
 *
 * Try different ways to send ESC/POS to the printer
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PRINTER_NAME = 'EPSON TM-T20III Receipt';

console.log('\n╔════════════════════════════════════════╗');
console.log('║  ESC/POS Variants Test                 ║');
console.log('╚════════════════════════════════════════╝\n');

/**
 * Test 1: Minimal ESC/POS (just initialize and text)
 */
function test1_Minimal() {
  console.log('TEST 1: Minimal ESC/POS\n');

  const ESC = '\x1B';
  const LF = '\x0A';

  let content = '';
  content += ESC + '@'; // Initialize printer
  content += 'MINIMAL TEST' + LF;
  content += 'Line 1' + LF;
  content += 'Line 2' + LF;
  content += LF + LF + LF + LF + LF;

  const tempFile = path.join(os.tmpdir(), 'test1.prn');
  fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

  console.log(`  Size: ${content.length} bytes`);
  console.log(`  File: ${tempFile}`);

  try {
    execSync(`print /D:"${PRINTER_NAME}" "${tempFile}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
      timeout: 10000,
    });
    console.log('  ✅ Sent\n');
    return tempFile;
  } catch (err) {
    console.log('  ❌ Failed:', err.message, '\n');
    return tempFile;
  }
}

/**
 * Test 2: With Cut Command
 */
function test2_WithCut() {
  console.log('TEST 2: With Paper Cut\n');

  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';

  let content = '';
  content += ESC + '@'; // Initialize
  content += 'CUT TEST' + LF;
  content += 'Testing paper cut' + LF;
  content += LF + LF + LF;
  content += GS + 'V' + '\x00'; // Full cut

  const tempFile = path.join(os.tmpdir(), 'test2.prn');
  fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

  console.log(`  Size: ${content.length} bytes`);
  console.log(`  File: ${tempFile}`);

  try {
    execSync(`print /D:"${PRINTER_NAME}" "${tempFile}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
      timeout: 10000,
    });
    console.log('  ✅ Sent\n');
    return tempFile;
  } catch (err) {
    console.log('  ❌ Failed:', err.message, '\n');
    return tempFile;
  }
}

/**
 * Test 3: EPSON Specific Initialization
 */
function test3_EPSONInit() {
  console.log('TEST 3: EPSON Specific Init\n');

  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';

  let content = '';
  // EPSON specific initialization sequence
  content += ESC + '@'; // Initialize
  content += ESC + 't' + '\x00'; // Character code table (PC437)
  content += ESC + 'M' + '\x00'; // Character font A
  content += 'EPSON INIT TEST' + LF;
  content += 'Line 1' + LF;
  content += 'Line 2' + LF;
  content += LF + LF + LF + LF;

  const tempFile = path.join(os.tmpdir(), 'test3.prn');
  fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

  console.log(`  Size: ${content.length} bytes`);
  console.log(`  File: ${tempFile}`);

  try {
    execSync(`print /D:"${PRINTER_NAME}" "${tempFile}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
      timeout: 10000,
    });
    console.log('  ✅ Sent\n');
    return tempFile;
  } catch (err) {
    console.log('  ❌ Failed:', err.message, '\n');
    return tempFile;
  }
}

/**
 * Test 4: Direct to USB with minimal data
 */
function test4_DirectUSBMinimal() {
  console.log('TEST 4: Direct USB (Minimal)\n');

  const ESC = '\x1B';
  const LF = '\x0A';

  let content = '';
  content += ESC + '@';
  content += 'USB DIRECT' + LF;
  content += LF + LF + LF + LF;

  const tempFile = path.join(os.tmpdir(), 'test4.prn');
  fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

  console.log(`  Size: ${content.length} bytes`);

  const psScript = `
    $port = "\\\\.\\TMUSB001"
    $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")
    try {
      $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
      $stream.Write($data, 0, $data.Length)
      $stream.Flush()
      $stream.Close()
      Write-Host "OK"
    } catch {
      Write-Host "ERROR: $_"
    }
  `.trim();

  try {
    const result = execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
      timeout: 10000,
    });
    console.log(`  Result: ${result.trim()}`);
    console.log('  ✅ Sent\n');
    return tempFile;
  } catch (err) {
    console.log('  ❌ Failed\n');
    return tempFile;
  }
}

// Run all tests
const tempFiles = [];

console.log('Running 4 different ESC/POS variants...\n');
console.log('========================================\n');

tempFiles.push(test1_Minimal());
setTimeout(() => {
  tempFiles.push(test2_WithCut());
  setTimeout(() => {
    tempFiles.push(test3_EPSONInit());
    setTimeout(() => {
      tempFiles.push(test4_DirectUSBMinimal());

      console.log('========================================');
      console.log('\n✅ All tests completed');
      console.log('\n** CHECK YOUR PRINTER **');
      console.log('Did any of these tests print?');
      console.log('If yes, note which test number worked!\n');

      // Cleanup
      setTimeout(() => {
        tempFiles.forEach(f => {
          try {
            if (fs.existsSync(f)) fs.unlinkSync(f);
          } catch (e) {}
        });
        console.log('Cleaned up temp files');
      }, 5000);

    }, 1000);
  }, 1000);
}, 1000);
