# Code Workflow Context

## In this article
- [Code Workflow Context](#code-workflow-context)
  - [In this article](#in-this-article)
  - [Standard Workflow](#standard-workflow)
    - [Phase 1: Planning (MANDATORY - Before Any Code Changes)](#phase-1-planning-mandatory---before-any-code-changes)
    - [Phase 2: Execution (Only After Plan Approval)](#phase-2-execution-only-after-plan-approval)
    - [Phase 3: Documentation (Completion)](#phase-3-documentation-completion)
  - [Task Tracking and Status Updates](#task-tracking-and-status-updates)
  - [Project Plan Naming Convention](#project-plan-naming-convention)
    - [🚨 MANDATORY REQUIREMENT: Task-Specific Plan Documents](#-mandatory-requirement-task-specific-plan-documents)
    - [Why This Is Critical (Especially for Team Projects)](#why-this-is-critical-especially-for-team-projects)
    - [Plan Document Structure (Required Sections)](#plan-document-structure-required-sections)
    - [Legacy Note](#legacy-note)

***
This is your core operational playbook for end-to-end code tasks.

## Standard Workflow

### Phase 1: Planning (MANDATORY - Before Any Code Changes)
1. When assigned a task, restate your understanding concisely.
2. Identify all relevant code files, dependencies, and interrelations before proposing modifications.
3. **🚨 REQUIRED: Create a task-specific plan document** using naming convention `projectplan-{feature}-{date}.md`
   - This is NOT optional - it's a critical deliverable for team collaboration
   - Must be created BEFORE writing any code
   - Serves as the contract between AI and team members
   - In multi-developer environments, this enables seamless handoff and parallel work
4. Perform comprehensive impact analysis and record ALL decisions in the plan document:
   - Files to be modified (with line numbers where possible)
   - New files to be created
   - Dependencies and interrelations
   - Risk assessment and mitigation strategies
   - Rollback plan if changes fail
5. Create a **detailed To-Do checklist** inside the plan document with checkboxes for each atomic task
6. **Seek explicit confirmation** from user before beginning execution

### Phase 2: Execution (Only After Plan Approval)
7. Execute tasks in order, checking off items in BOTH TodoWrite tool AND plan document
8. After each milestone, provide a short summary of work completed and request a review
9. Avoid breaking changes or hidden side effects by thinking system-wide, not locally
10. Never commit partial work; request confirmation before commits. When adding files to git stage use file name and not wildcard so we pick the files that actually are part of the work
11. Delete temporary files or exploratory test scripts after use
12. Optimize for simplicity—prefer small, atomic, self-contained changes

### Phase 3: Documentation (Completion)
13. Append a **Review Summary** section at the end of the plan document with key learnings and suggested improvements
14. Mark final checkboxes in plan document to show 100% completion

## Task Tracking and Status Updates

**CRITICAL:** The project plan document (projectplan-{feature}-{date}.md) is the **single source of truth** for task status.

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

**Format:** `projectplan-{feature-name}-{YYYY-MM-DD}.md`

**Examples:**
- `projectplan-health-monitoring-2025-10-17.md` - For health status indicator feature
- `projectplan-user-auth-fix-2025-10-16.md` - For authentication bug fix
- `projectplan-vehicle-reports-2025-10-15.md` - For vehicle reporting feature

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

***