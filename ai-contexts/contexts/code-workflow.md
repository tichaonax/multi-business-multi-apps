# Code Workflow Context

This is your core operational playbook for end-to-end code tasks.

## Standard Workflow

### Phase 0: Requirements Context (If Using TASK START)

**If user provides requirements context file (from `wip/` folder):**
1. Read the requirements context file (e.g., `wip/TICKET-123-user-auth.md`)
2. Understand all requirements, success criteria, and constraints
3. Proceed to Phase 1 planning with this context

### Phase 1: Planning (MANDATORY - Before Any Code Changes)

1. When assigned a task, restate your understanding concisely.
2. Identify all relevant code files, dependencies, and interrelations before proposing modifications.
3. **🚨 REQUIRED: Create a task-specific plan document** using naming convention `projectplan-{ticket}-{feature}-{date}.md`
   - This is NOT optional - it's a critical deliverable for team collaboration
   - Must be created BEFORE writing any code OR using any tools that modify files
   - Must be presented to user for approval BEFORE execution begins
   - Serves as the contract between AI and team members
4. Perform comprehensive impact analysis and record ALL decisions in the plan document:
   - Files to be modified (with line numbers where possible)
   - New files to be created
   - Dependencies and interrelations
   - Risk assessment and mitigation strategies
   - Rollback plan if changes fail
5. Create a **detailed To-Do checklist** inside the plan document with checkboxes for each atomic task
6. **Present plan to user for review and iteration**
   - User may ask questions, request changes, or add requirements
   - Update plan based on feedback
   - Plan may go through multiple iterations

### Phase 1.5: Requirements-Plan Synchronization (MANDATORY Before Implementation)

**🚨 CRITICAL: After plan is finalized but BEFORE starting implementation, synchronize requirements with plan.**

**Why This Matters:**
- Project plan contains detailed analysis that may not be in initial requirements
- QA needs complete requirements that match the final design
- Prevents scope drift and ensures single source of truth

**Synchronization Workflow:**

**Option A: User manually runs SYNC REQUIREMENTS**
```
User: SYNC REQUIREMENTS

AI Actions:
1. Read finalized project plan
2. Extract ALL requirements, constraints, and implementation details from analysis
3. Update requirements context file in wip/
4. Show diff of what was added/updated
5. Confirm requirements now match project plan
```

**Option B: AI prompts before starting implementation**
```
User: START or PHASE 1 or APPROVE PLAN

AI Response:
🔄 Requirements-Plan Synchronization Check

📋 Project Plan: projectplan-TICKET-123-user-auth-2025-10-24.md (finalized)
📝 Requirements: wip/TICKET-123-user-auth.md

⚠️ Plan contains additional details from analysis that may not be in requirements.

Would you like to:
1. SYNC REQUIREMENTS (recommended for QA completeness)
2. PROCEED WITHOUT SYNC (skip this step)

Type: SYNC REQUIREMENTS or PROCEED
```

**What Gets Synced:**
- Technical constraints discovered during analysis (e.g., "JWT expires in 24 hours")
- Database schema details (e.g., "users table needs locked_until column")
- Security requirements (e.g., "bcrypt rounds=10")
- Rate limiting specifics (e.g., "5 failed attempts = 15min lockout")
- API contract details (e.g., "POST /auth/login returns 401 on invalid credentials")
- Testing requirements from testing plan
- Dependencies and third-party integrations

**Commands Available:**
- **SYNC REQUIREMENTS** - Update requirements to match current plan
- **REPLAN** - User updated requirements, regenerate plan
- **APPROVE PLAN** - Finalize and lock both requirements and plan for implementation
- **PLAN STATUS** - Check if requirements and plan are in sync

**Iterative Refinement Loop:**
```
1. User creates initial requirements → wip/TICKET-123.md
2. AI generates initial project plan → projectplan-TICKET-123.md
3. User reviews plan, asks questions, suggests changes
4. AI updates plan based on feedback
5. User: SYNC REQUIREMENTS (plan details → requirements)
6. User manually adds new requirement to wip/TICKET-123.md
7. User: REPLAN (requirements → updated plan)
8. AI updates project plan with new analysis
9. User: SYNC REQUIREMENTS (bring requirements up to date)
10. User: APPROVE PLAN (lock both, start implementation)
```

**Plan Locking:**
- After APPROVE PLAN, both requirements and plan are locked
- During implementation, plan cannot be REPLAN'd
- To change scope mid-implementation: UNLOCK PLAN (resets progress)

7. **🚨 MANDATORY CHECKPOINT: Seek explicit confirmation from user before beginning ANY code execution**
   - Present the complete plan document
   - Check if requirements-plan sync is needed
   - If not synced, prompt user to SYNC REQUIREMENTS
   - Ask: "Do you approve this plan? Should I proceed with execution?"
   - Wait for explicit "yes", "approved", or "APPROVE PLAN" before proceeding
   - If user requests changes, update plan and seek approval again
   - NO CODE CHANGES until explicit approval is received

### Phase 2: Execution (Only After Plan Approval)

7. Execute tasks in order, checking off items in BOTH TodoWrite tool AND plan document
8. After each milestone, provide a short summary of work completed and request a review
9. Avoid breaking changes or hidden side effects by thinking system-wide, not locally
10. Never commit partial work; request confirmation before commits. When adding files to git stage use file name and not wildcard so we pick the files that actually are part of the work
11. Delete temporary files or exploratory test scripts after use
12. Optimize for simplicity—prefer small, atomic, self-contained changes

### Phase 3: Documentation (Completion)

13. Append a **Review Summary** section at the end of the plan document with key learnings and suggested improvements
14. Mark final checkboxes in plan document to ### :rotating_light: MANDATORY PHASE-BY-PHASE APPROVAL PROCESS
**CRITICAL:** You MUST execute ONE phase at a time and wait for approval after EACH phase.
**:x: NEVER do this:**
- Execute Phase 1, 2, 3 in sequence without approval
- Assume "approved plan" means "execute all phases"
- Continue to next phase based on momentum or efficiency
**:white_check_mark: ALWAYS do this:**
- Execute ONLY the phase commanded (e.g., PHASE 1, PHASE 2)
- Present detailed review after completing that ONE phase
- STOP and wait for explicit approval before next phase
- Wait for user to type: `PHASE 2`, `NEXT PHASE`, or `CONTINUE`
**AI Instructions:**
1. **Execute ONE phase only** - the specific phase commanded by user
2. **Update project plan checkboxes** for completed tasks in that phase
3. **Present comprehensive review** with design decisions and code overview
4. **Request explicit approval** before next phase
5. **:octagonal_sign: STOP** - Do not proceed without explicit phase command
**Process:**
1. **Mark checkboxes complete** in the project plan document for current phase only
2. **Present work summary** with:
   - What was accomplished in THIS phase
   - Design decisions made and rationale
   - Code changes overview (files created/modified)
   - Key code snippets
   - Any deviations from original plan
3. **Request explicit approval** with: "Phase X complete. Please review and type 'PHASE Y' to continue."
4. **:octagonal_sign: WAIT for explicit phase command** - Do not proceed without `PHASE 2`, `NEXT PHASE`, or similar command
5. **If changes requested** - Make changes and repeat approval process
**Format for phase reviews:**
```
## :mag: PHASE X REVIEW REQUEST
**Completed Tasks:**
- :white_check_mark: Task X.1: [description]
- :white_check_mark: Task X.2: [description]
**Files Created:**
- `path/to/file.js` (123 lines) - Brief purpose
**Files Modified:**
- `path/to/file.js` (+15 lines, -3 lines) - What changed
**Key Code Snippet:**
```javascript
// Show 5-10 lines of most important code
function criticalFunction() {
  // Implementation
}
```
**Design Decisions:**
- **Decision 1**: [What you decided] - **Rationale**: [Why you decided it]
- **Decision 2**: [What you decided] - **Rationale**: [Why you decided it]
**Issues Encountered:**
- [Any problems, workarounds, or deviations]
**Next Phase:** [Brief description of Phase X+1]
---
:question: **APPROVAL REQUIRED**
Please review Phase X work above.
**Type one of:**
- `PHASE X+1` to continue to next phase
- `NEXT PHASE` or `CONTINUE` to continue
- `REVISE [details]` to request changes
- `EXPLAIN [topic]` for clarification
:octagonal_sign: **I will not proceed without your explicit command.**
```

## Task Tracking and Status Updates

**CRITICAL:** The project plan document (projectplan-{ticket}-{feature}-{date}.md) is the **single source of truth** for task status.

**You MUST update checkboxes in the plan document as you complete each task:**

- ✅ Use the Edit tool to check off `- [ ]` → `- [x]` in the plan document IMMEDIATELY after completing each task
- ✅ Both the TodoWrite tool (for session tracking) AND the plan document checkboxes must be updated
- ✅ The plan document serves as permanent documentation for team handoff and future reference
- ✅ Anyone opening the plan document should see current progress without needing to read chat history

**Why this matters:**

- Team members can take over mid-task by reading the plan document
- The plan document can be committed to git for collaboration
- Status is preserved across AI sessions
- No need to ask "what's been done so far?" - just read the plan

**Workflow:**

1. Complete a task in code
2. Update TodoWrite tool (for current session tracking)
3. **IMMEDIATELY** update the plan document checkbox using Edit tool
4. Provide brief summary to user

**Example:**
After completing backend API changes:

```markdown
- [x] **Task 1.1:** Add server start time tracking to `/api/health`
- [x] **Task 1.2:** Create uptime formatting function
- [x] **Task 1.3:** Update API response structure
- [ ] **Task 1.4:** Test API manually
```

## Project Plan Naming Convention

### 🚨 MANDATORY REQUIREMENT: Task-Specific Plan Documents

**Every task MUST have its own dedicated plan document before any code is written.**

**Format:** `projectplan-{ticket}-{feature-name}-{YYYY-MM-DD}.md`

**Examples:**

- `projectplan-HPP-1234-health-monitoring-2025-10-17.md` - For health status indicator feature with ticket HPP-1234
- `projectplan-HPP-5678-user-auth-fix-2025-10-16.md` - For authentication bug fix with ticket HPP-5678
- `projectplan-HPP-9012-vehicle-reports-2025-10-15.md` - For vehicle reporting feature with ticket HPP-9012
- `projectplan-HPP-3456-tile-spacing-fix-2025-10-18.md` - For tile spacing bug fix with ticket HPP-3456

**Ticket Format Guidelines:**
- Use the full ticket ID (e.g., `HPP-1234`, `HPP-5678`, `HPP-9012`)
- If no ticket exists, use `NOTKT` as placeholder: `projectplan-NOTKT-feature-name-2025-10-18.md`
- For hotfixes or urgent tasks without tickets, use `HOTFIX`: `projectplan-HOTFIX-critical-bug-2025-10-18.md`

### Why This Is Critical (Especially for Team Projects)

**For Multi-Developer Teams:**

- ✅ **Seamless Handoff:** Developer A can start a feature, create the plan document, and Developer B can continue exactly where they left off
- ✅ **No Context Loss:** Anyone can read the plan document and immediately understand what's done, what's pending, and why decisions were made
- ✅ **Parallel Work:** Multiple developers/AI agents can work on different features without stepping on each other's toes
- ✅ **Code Review Preparation:** Reviewers can read the plan to understand intent before looking at code changes
- ✅ **Git History:** Plan documents can be committed alongside code for permanent project memory

**For Solo Developers:**

- ✅ **Session Continuity:** Resume work after days/weeks away without re-analyzing the entire codebase
- ✅ **Decision Tracking:** Remember why you chose approach X over approach Y
- ✅ **Scope Management:** Keep features bounded and prevent scope creep

**For AI Collaboration:**

- ✅ **AI Handoff:** New AI session can read plan document and continue work without full conversation history
- ✅ **Quality Control:** Forces structured thinking before code changes (prevents "code first, think later")
- ✅ **Accountability:** Clear record of what AI agent committed to do vs what was actually done

### Plan Document Structure (Required Sections)

Every plan document MUST include:

1. **Task Overview** - One-sentence description
2. **Files Affected** - Complete list with line numbers where possible
3. **Impact Analysis** - What breaks if this fails? Dependencies?
4. **To-Do Checklist** - Checkbox items for EVERY atomic task
5. **Risk Assessment** - What could go wrong? Mitigation strategies?
6. **Testing Plan** - How will you verify this works?
7. **Rollback Plan** - How to undo if deployment fails?
8. **Review Summary** (Added at end) - What was learned? What would you do differently?

### Legacy Note

- `projectplan.md` (without suffix) may contain historical work from before this convention
- **All new tasks from today forward MUST create task-specific plan documents**
- After task completion, plan documents serve as permanent implementation documentation

---
