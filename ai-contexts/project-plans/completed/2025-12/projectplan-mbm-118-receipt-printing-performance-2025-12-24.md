# Project Plan: Receipt Printing Performance Testing & Optimization

> **Created:** 2025-12-24
> **Parent Ticket:** mbm-118 (WiFi Portal Integration)
> **Feature:** Receipt Printing Performance Analysis & Optimization
> **Type:** Performance Testing & Optimization

---

## 📋 Task Overview

Analyze and optimize receipt printing performance for the thermal printer system. Currently experiencing delays when printing WiFi token receipts through the Windows print spooler. This project will:

1. **Benchmark current implementation** to establish baseline metrics
2. **Test alternative printing approaches** to identify fastest method
3. **Measure performance differences** with concrete timing data
4. **Provide data-driven recommendation** on which approach to implement

**Current Implementation:**
- Path: Receipt Data → Temp File → PowerShell Script → Windows Spooler API (RAW) → Printer
- Estimated delay: 500ms - 2000ms per print job

**Proposed Optimizations to Test:**
1. Remove PowerShell overhead (use Node.js native Windows bindings)
2. In-memory processing (skip temp file creation)
3. Direct USB/COM port (bypass Windows spooler entirely)
4. Connection pooling (keep printer connection open)

**Goal:** Reduce printing time from ~1-2 seconds to <300ms

---

## 📂 Files Affected

### Existing Files to Analyze
- `src/lib/receipt-printer.ts` - Current receipt printing implementation
- `src/lib/wifi-portal/receipt-generator.ts` - WiFi token receipt generation
- `src/types/printing.ts` - Printing type definitions

### New Test Files to Create
- `scripts/test-printing-performance.js` - Master performance test suite
- `scripts/printing-methods/test-current-implementation.js` - Baseline test
- `scripts/printing-methods/test-native-bindings.js` - Node.js bindings test
- `scripts/printing-methods/test-direct-port.js` - Direct COM/USB test
- `scripts/printing-methods/test-connection-pooling.js` - Connection pooling test
- `scripts/printing-methods/test-in-memory.js` - In-memory processing test
- `scripts/utils/performance-logger.js` - Timing and logging utilities
- `scripts/utils/sample-receipt-data.js` - Sample receipt data generator

### Performance Reports to Generate
- `reports/printing-performance-baseline-{date}.md` - Baseline metrics
- `reports/printing-performance-comparison-{date}.md` - Final comparison report
- `reports/printing-performance-recommendations-{date}.md` - Decision recommendations

---

## 🔍 Impact Analysis

### Performance Impact
- **Current Bottlenecks:**
  - PowerShell script execution: ~200-500ms overhead
  - Temp file I/O: ~50-100ms overhead
  - Windows Spooler: ~200-500ms overhead (even with RAW datatype)
  - Total: ~500-2000ms per receipt

- **Target Performance:**
  - Direct USB/COM: ~100-300ms total
  - Native bindings: ~200-400ms total
  - In-memory: ~300-500ms total

### Risk Assessment
- **Low Risk:** All tests are read-only or isolated
- **No Changes to Production Code:** Tests run separately
- **Safe Printer Testing:** Use test mode flags where possible
- **Rollback:** N/A (no production changes until decision made)

### Integration Impact
- **WiFi Token Receipts:** Primary use case (immediate customer experience)
- **Restaurant POS Receipts:** Secondary benefit (faster checkout)
- **Grocery POS Receipts:** Secondary benefit (faster checkout)
- **Direct WiFi Sales:** Primary benefit (faster token sales)

---

## ✅ Implementation Checklist

### Phase 1: Test Infrastructure Setup ⏸️ PENDING
- [ ] **Task 1.1:** Create test directory structure
  - Create `scripts/printing-methods/` folder
  - Create `scripts/utils/` folder
  - Create `reports/` folder
- [ ] **Task 1.2:** Create performance logging utility
  - File: `scripts/utils/performance-logger.js`
  - Methods: `startTimer()`, `endTimer()`, `logMetrics()`, `generateReport()`
  - Export timing data to JSON and Markdown formats
- [ ] **Task 1.3:** Create sample receipt data generator
  - File: `scripts/utils/sample-receipt-data.js`
  - Generate realistic WiFi token receipt data
  - Include: token code, duration, bandwidth, business details
  - Support multiple test scenarios (short/long receipts)
- [ ] **Task 1.4:** Set up test configuration
  - Printer name (EPSON TM-T20III Receipt)
  - COM port detection (if available)
  - USB device path detection
  - Number of test iterations (recommended: 50 runs per method)

### Phase 2: Baseline Testing (Current Implementation) ⏸️ PENDING
- [ ] **Task 2.1:** Create baseline test script
  - File: `scripts/printing-methods/test-current-implementation.js`
  - Test current PowerShell + Temp File + Windows Spooler approach
  - Measure: Total time, PowerShell overhead, File I/O time, Spooler time
- [ ] **Task 2.2:** Run baseline performance tests
  - Execute 50 test prints
  - Log timing for each step:
    1. Receipt data generation time
    2. Temp file write time
    3. PowerShell script creation time
    4. PowerShell execution time
    5. Spooler processing time
    6. Total end-to-end time
- [ ] **Task 2.3:** Calculate baseline statistics
  - Average time per print
  - Median time
  - Min/Max times
  - Standard deviation
  - 95th percentile time
- [ ] **Task 2.4:** Generate baseline report
  - File: `reports/printing-performance-baseline-{date}.md`
  - Include: Metrics table, timing breakdown, bottleneck analysis

### Phase 3: Alternative Method 1 - Native Windows Bindings ⏸️ PENDING
- [ ] **Task 3.1:** Research Node.js Windows printing libraries
  - Evaluate: `node-printer`, `printer` npm packages
  - Check Windows API bindings availability
  - Verify RAW datatype support
- [ ] **Task 3.2:** Create native bindings test script
  - File: `scripts/printing-methods/test-native-bindings.js`
  - Implement: Direct Windows API calls via Node.js bindings
  - Remove: PowerShell script overhead
  - Keep: Windows Spooler (but with native calls)
- [ ] **Task 3.3:** Run native bindings performance tests
  - Execute 50 test prints
  - Measure: Receipt generation, Native API call time, Spooler time, Total time
- [ ] **Task 3.4:** Compare against baseline
  - Calculate time savings
  - Identify remaining bottlenecks
  - Document pros/cons

### Phase 4: Alternative Method 2 - Direct USB/COM Port ⏸️ PENDING
- [ ] **Task 4.1:** Detect printer COM port or USB path
  - Script: Auto-detect COM port for EPSON TM-T20III
  - Fallback: Manual configuration
  - Test: Port availability and write permissions
- [ ] **Task 4.2:** Create direct port test script
  - File: `scripts/printing-methods/test-direct-port.js`
  - Implement: Direct write to COM/USB device
  - Use: Node.js `fs.writeFile()` or `serialport` library
  - Bypass: Windows Spooler entirely
- [ ] **Task 4.3:** Run direct port performance tests
  - Execute 50 test prints
  - Measure: Receipt generation time, Port write time, Total time
  - Note: Port open/close overhead per print
- [ ] **Task 4.4:** Compare against baseline and native bindings
  - Calculate time savings vs both approaches
  - Document pros/cons (speed vs compatibility)

### Phase 5: Alternative Method 3 - In-Memory Processing ⏸️ PENDING
- [ ] **Task 5.1:** Create in-memory test script
  - File: `scripts/printing-methods/test-in-memory.js`
  - Implement: Receipt data kept in memory (no temp file)
  - Use: String buffer or stream to Windows API
  - Combine with native bindings approach
- [ ] **Task 5.2:** Run in-memory performance tests
  - Execute 50 test prints
  - Measure: Receipt generation time, API call time, Total time
  - Compare: File I/O time saved
- [ ] **Task 5.3:** Compare against baseline
  - Calculate file I/O savings
  - Document pros/cons

### Phase 6: Alternative Method 4 - Connection Pooling ⏸️ PENDING
- [ ] **Task 6.1:** Create connection pooling test script
  - File: `scripts/printing-methods/test-connection-pooling.js`
  - Implement: Keep printer connection open between jobs
  - Test: With direct port approach
  - Measure: Connection reuse benefits
- [ ] **Task 6.2:** Run connection pooling performance tests
  - Execute 50 test prints (sequential, connection kept open)
  - Measure: First print time, Subsequent print times, Average time
  - Compare: Connection overhead per print
- [ ] **Task 6.3:** Test connection stability
  - Test: Long-running connections (100+ prints)
  - Test: Connection recovery after errors
  - Test: Concurrent print requests
- [ ] **Task 6.4:** Compare against direct port without pooling
  - Calculate connection overhead savings
  - Document pros/cons (speed vs complexity)

### Phase 7: Comprehensive Performance Comparison ⏸️ PENDING
- [ ] **Task 7.1:** Aggregate all test results
  - Compile metrics from all 5 approaches:
    1. Current (Baseline)
    2. Native Bindings
    3. Direct Port
    4. In-Memory
    5. Connection Pooling
- [ ] **Task 7.2:** Create comparison tables
  - Metrics to compare:
    - Average time per print
    - Median time
    - 95th percentile time
    - Time savings vs baseline (%)
    - Reliability (success rate)
    - Error handling capabilities
    - Implementation complexity
- [ ] **Task 7.3:** Generate visual comparison charts
  - Bar chart: Average time per method
  - Line chart: Time distribution (min, median, max)
  - Pie chart: Time breakdown by component
- [ ] **Task 7.4:** Create comparison report
  - File: `reports/printing-performance-comparison-{date}.md`
  - Include: All metrics, charts, timing breakdowns

### Phase 8: Decision Recommendations & Implementation Plan ⏸️ PENDING
- [ ] **Task 8.1:** Analyze trade-offs for each approach
  - **Speed:** Fastest to slowest
  - **Reliability:** Most reliable to least reliable
  - **Complexity:** Simplest to most complex
  - **Compatibility:** Windows/Linux/Mac support
  - **Maintenance:** Easiest to maintain
- [ ] **Task 8.2:** Create decision matrix
  - Weighted scoring: Speed (40%), Reliability (30%), Complexity (20%), Compatibility (10%)
  - Rank approaches by total score
  - Identify recommended approach
- [ ] **Task 8.3:** Generate recommendations report
  - File: `reports/printing-performance-recommendations-{date}.md`
  - Include:
    - **Recommended Approach:** With justification
    - **Alternative Approaches:** Ranked by score
    - **Implementation Plan:** Step-by-step migration plan
    - **Rollback Plan:** How to revert if issues arise
    - **Testing Plan:** QA checklist before production deployment
- [ ] **Task 8.4:** Present findings to user
  - Summary of all test results
  - Clear recommendation with data
  - Migration plan if user approves
  - Await user decision before proceeding

---

## 🧪 Testing Plan

### Test Environment
- **Printer:** EPSON TM-T20III Receipt (thermal printer)
- **Operating System:** Windows 10/11
- **Node.js Version:** Current project version
- **Test Iterations:** 50 prints per method (for statistical significance)
- **Test Data:** Standardized WiFi token receipt (realistic size)

### Test Scenarios

#### Scenario 1: Short Receipt (WiFi Token Only)
- **Content:** Token code, duration, bandwidth, basic instructions
- **Estimated Size:** ~200-300 bytes ESC/POS commands
- **Purpose:** Baseline minimal receipt

#### Scenario 2: Medium Receipt (WiFi Token + Order Items)
- **Content:** 3-5 menu items + WiFi token + totals
- **Estimated Size:** ~500-800 bytes ESC/POS commands
- **Purpose:** Restaurant POS use case

#### Scenario 3: Long Receipt (Full Order + WiFi Token)
- **Content:** 10+ items + WiFi token + tax + discounts + business details
- **Estimated Size:** ~1000-1500 bytes ESC/POS commands
- **Purpose:** Worst-case scenario

### Metrics to Measure

#### Primary Metrics
1. **Total Time (End-to-End):** From function call to print completion
2. **Receipt Generation Time:** Data formatting to ESC/POS commands
3. **Transmission Time:** Sending data to printer
4. **Print Success Rate:** Successful prints / Total attempts

#### Secondary Metrics
5. **PowerShell Overhead:** Time spent in PowerShell execution (baseline only)
6. **File I/O Time:** Temp file write/read time (baseline only)
7. **Spooler Time:** Windows spooler processing time (baseline + native bindings)
8. **Port Open/Close Time:** Connection overhead (direct port approaches)
9. **Memory Usage:** Peak memory during print operation
10. **CPU Usage:** Peak CPU during print operation

#### Statistical Analysis
- **Mean:** Average time across all test runs
- **Median:** Middle value (less affected by outliers)
- **Standard Deviation:** Consistency of performance
- **Min/Max:** Best and worst case times
- **95th Percentile:** Time threshold for 95% of prints
- **Coefficient of Variation:** Relative variability (SD / Mean)

### Success Criteria

#### Performance Targets
- **Minimum Improvement:** 30% faster than baseline
- **Target Improvement:** 50% faster than baseline
- **Stretch Goal:** 70% faster than baseline (sub-500ms total time)

#### Reliability Targets
- **Print Success Rate:** ≥99% (max 1 failure per 100 prints)
- **Error Recovery:** Graceful handling of printer errors
- **Consistency:** Standard deviation <20% of mean

#### Implementation Feasibility
- **Code Complexity:** Maintainable by team
- **Dependencies:** Minimal external dependencies
- **Cross-Platform:** Works on Windows (primary), Linux/Mac (nice-to-have)

---

## ⚠️ Risk Assessment

### High Risks
1. **Printer Hardware Compatibility**
   - **Risk:** Direct COM/USB approach may not work with all EPSON models
   - **Mitigation:** Test multiple methods, fallback to spooler if direct fails
   - **Validation:** Test on actual hardware before recommendation

2. **Windows Spooler Dependency**
   - **Risk:** Removing spooler may lose features (print queue, retry logic)
   - **Mitigation:** Implement custom queue and retry in application code
   - **Validation:** Test error scenarios (printer offline, paper jam, etc.)

### Medium Risks
3. **Performance Variability**
   - **Risk:** Test results may vary due to Windows background processes
   - **Mitigation:** Run tests multiple times, use statistical analysis
   - **Validation:** 50+ iterations per method for reliable averages

4. **COM Port Detection**
   - **Risk:** Auto-detection may fail or identify wrong port
   - **Mitigation:** Manual configuration option, test mode before production
   - **Validation:** Verify COM port in Device Manager before testing

### Low Risks
5. **Test Data Realism**
   - **Risk:** Sample receipts may not reflect production data
   - **Mitigation:** Use actual WiFi token receipt format from production
   - **Validation:** Generate test data from real receipt templates

---

## 🔄 Rollback Plan

**Note:** This is a testing phase only. No production changes will be made until user approves recommendation.

### If Testing Fails
1. **Printer Issues:** Stop tests, verify printer functionality manually
2. **Script Errors:** Debug and fix test scripts
3. **Invalid Results:** Re-run tests with corrected configuration
4. **Hardware Damage:** (Unlikely) Stop all tests, assess printer status

### After User Decision
- **If Approved:** Create separate implementation project plan
- **If Rejected:** Archive test results, keep current implementation
- **If Partial Approval:** Implement only approved optimizations

---

## 📊 Success Criteria

### Phase 1-6: Testing Complete
- [ ] All 5 printing methods tested with 50 iterations each
- [ ] Performance metrics collected for all methods
- [ ] No printer hardware damage during testing
- [ ] Test scripts run reliably and consistently

### Phase 7: Comparison Complete
- [ ] Comprehensive comparison report generated
- [ ] Visual charts created showing timing differences
- [ ] Clear performance rankings established

### Phase 8: Recommendations Complete
- [ ] Decision matrix created with weighted scoring
- [ ] Recommended approach identified with justification
- [ ] Implementation plan drafted (if optimization approved)
- [ ] User presented with findings and recommendations

### Overall Success
- [ ] User has data-driven insights to make informed decision
- [ ] Performance improvements quantified (e.g., "60% faster")
- [ ] Trade-offs clearly documented (speed vs complexity vs reliability)
- [ ] Clear path forward (implement optimization or keep current)

---

## 📝 Notes

### Current Implementation Details (from context)
- **Printer:** EPSON TM-T20III Receipt
- **Connection:** USB + RAW datatype via Windows Spooler
- **Receipt System:** Universal receipt template (`receipt-template.tsx`)
- **WiFi Token Receipts:** Include token code, duration, bandwidth, instructions
- **Receipt Printer Lib:** `src/lib/receipt-printer.ts`

### Known Performance Issues
- PowerShell script execution adds 200-500ms overhead
- Temp file I/O adds 50-100ms overhead
- Windows Spooler adds 200-500ms overhead (even with RAW datatype)
- Total: 500-2000ms per receipt (too slow for customer-facing operations)

### ESC/POS Printer Commands
- **Command Set:** EPSON ESC/POS (thermal printer standard)
- **Character Encoding:** ASCII + extended character sets
- **Cut Command:** `ESC d 5` (partial cut)
- **Print Speed:** Printer hardware limit ~150mm/sec
- **Actual Print Time:** ~100-200ms (hardware only)

### Key Decisions to Make
1. **Primary Method:** Which approach to implement?
2. **Fallback Strategy:** What to do if primary method fails?
3. **Migration Plan:** How to transition from current to new method?
4. **Testing Strategy:** How to QA in production before full rollout?

### Database Conventions (from CLAUDE.md)
- Models: PascalCase
- Columns: camelCase
- Tables: snake_case

### UI/UX Requirements
- Use `useConfirm()` hook instead of browser confirm()
- Use `useAlert()` hook instead of browser alert()
- Toast notifications for success messages

---

## 🎯 Test Execution Timeline

### Estimated Time per Phase
- **Phase 1 (Setup):** 1-2 hours
- **Phase 2 (Baseline):** 1 hour (30 min script + 30 min run tests)
- **Phase 3 (Native Bindings):** 2 hours (research + implement + test)
- **Phase 4 (Direct Port):** 2 hours (port detection + implement + test)
- **Phase 5 (In-Memory):** 1 hour (simple modification + test)
- **Phase 6 (Connection Pooling):** 2 hours (implement + test + stability)
- **Phase 7 (Comparison):** 1 hour (analysis + charts + report)
- **Phase 8 (Recommendations):** 1 hour (decision matrix + implementation plan)

**Total Estimated Time:** 10-12 hours of work

### Dependencies
- **EPSON TM-T20III printer** must be connected and functional
- **Windows environment** (current production environment)
- **Node.js** with printer access permissions
- **Sample WiFi token data** from existing system

---

## 🔍 Review Summary
*To be completed after testing*

### What Went Well
-

### Challenges Encountered
-

### Test Results Summary
- **Fastest Method:**
- **Most Reliable Method:**
- **Recommended Method:**
- **Performance Improvement:**

### Lessons Learned
-

### Next Steps
-

---

**Plan Status:** 🟡 Awaiting User Approval
**Last Updated:** 2025-12-24
**Parent Project:** mbm-118 (WiFi Portal Integration)
**Related Context:** `ai-contexts/wip/mbm-118-integrate-internet-portal-system.md`
