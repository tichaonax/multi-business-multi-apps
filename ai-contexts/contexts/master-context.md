# Master Context Overview

This is the umbrella context describing how to interact with the AI across all workflows.

## Purpose

This context guides the AI in structured collaboration when working on software engineering tasks of any type.

**GRIP Principle:** Get a GRIP on AI
- **G**ive AI the right context
- **R**ight context through structured documents
- **I**mplement the right process with approval gates
- **P**rocess enforcement for consistent results

> *Give AI the right context, enforce the right process, get the right results.*

## General Operating Principles

1. Always confirm understanding by rephrasing the task before execution.
2. Think through the problem space and propose a concise **action plan** before coding or explaining.
3. Follow modular and minimal-impact principles — avoid large-scale changes unless approved.
4. Prioritize clarity, safety, and maintainability over speed.
5. Communicate reasoning briefly at each stage.
6. Periodically checkpoint progress; never assume autonomy beyond the planned milestones.
7. Always document reasoning, risks, and trade-offs.

## Example Adherence Requirements

When provided with specific examples in context documents:

1. **Follow examples EXACTLY** - do not deviate without explicit approval
2. If you identify a need to deviate from the example:
   - Stop immediately
   - Explain why deviation is needed
   - Propose the alternative approach
   - Seek explicit approval before proceeding
3. Examples are not suggestions - they are mandatory patterns to follow

## CRITICAL: MANDATORY WORKFLOW FOR ALL TASKS

🚨 **BEFORE ANY CODE CHANGES:**
1. Create projectplan-{ticket}-{feature}-{date}.md **WITH BUILT-IN APPROVAL CHECKPOINTS**
2. Get explicit user approval 
3. NO EXCEPTIONS - This is not optional

Any AI session that skips this workflow is NON-COMPLIANT.

# 🚨 MANDATORY FIRST STEP 🚨
**STOP - Do not proceed with any analysis or code changes until you:**
1. Create the mandatory project plan document (see code-workflow.md)
2. **INCLUDE APPROVAL CHECKPOINTS IN THE PLAN STRUCTURE**
3. Get explicit user approval for the overall plan
4. **FOLLOW MILESTONE APPROVALS** - present examples and designs before implementing

This is a hard requirement - no exceptions.

**PROJECT PLANS MUST HAVE APPROVAL CHECKPOINTS BUILT-IN FROM THE START**

**CRITICAL:** The AI must read code-workflow.md FIRST and follow Phase 1 planning requirements before any other actions.

---

## 📚 Custom Team Contexts (Auto-Load)

**IMPORTANT:** After loading core framework contexts, automatically check for and load team-specific custom contexts.

### Auto-Loading Custom Contexts

1. **Check for custom folder:** Look for `ai-contexts/custom/` directory
2. **List custom contexts:** Find all `.md` files in `custom/` (excluding `README.md`)
3. **Auto-load if exists:** Read each custom context file automatically
4. **Report loaded contexts:** Tell user which custom contexts were loaded

### Custom Context Purpose

Custom contexts contain **team-specific or company-specific** standards that extend the base framework:
- Team coding standards and conventions
- API design patterns specific to the company
- Database naming conventions
- Security requirements and policies
- Deployment processes
- Technology-specific patterns not in framework

### Loading Order

```
1. ai-contexts/contexts/master-context.md (this file)
2. ai-contexts/contexts/code-workflow.md
3. ai-contexts/custom/*.md (all team custom contexts)
4. Other framework contexts as needed (backend-api-context.md, etc.)
```

### Example Auto-Load Output

```
📚 Loading Contexts...

Framework Contexts:
✅ master-context.md - Workflow commands and principles
✅ code-workflow.md - Development process and approval gates

Custom Team Contexts:
✅ custom/team-coding-standards.md - Company coding conventions
✅ custom/api-design-patterns.md - Team API standards
✅ custom/security-requirements.md - Company security policies

All contexts loaded! Ready to work with team standards.
```

### Custom Context Priority

- Custom contexts **extend** framework contexts (additive)
- If custom context conflicts with framework, **custom takes precedence**
- Custom contexts should clearly state when overriding framework defaults

### No Custom Contexts

If `custom/` folder is empty or doesn't exist:
```
📚 Loading Contexts...

Framework Contexts:
✅ master-context.md
✅ code-workflow.md

ℹ️ No custom team contexts found in ai-contexts/custom/
Using framework defaults only.
```

---

## 🎯 Standardized AI Workflow Commands

The following commands trigger standardized AI behaviors for common workflow operations:

## Core Commands

### `TASK START {ticket} {description}`
**AI Actions:**
1. **Template Selection**: Show available templates and ask user to choose:
   - 🆕 **feature-development** - New features, screens, components
   - 🐛 **debugging** - Bug analysis and resolution  
   - ♻️ **refactor-optimization** - Code improvements and optimization
   - 🗄️ **database-schema** - Database changes and migrations
   - 🔌 **api-endpoint** - API development and updates
   - 🎨 **design-review** - UI/UX review and implementation
   - 📝 **documentation** - Technical documentation
   - 🔒 **security-review** - Security audits and fixes
   - 🔍 **init-session** - General purpose, exploration
2. **Template Preparation**: 
   - Check if context file exists: `ai-contexts/wip/{ticket}-{description}.md`
   - If missing: Create new context file by copying chosen template
   - If exists: Show existing context file for review/editing
3. **Wait for User Input**: **STOP HERE** - Do not create project plan yet
4. **Instruct User**: Tell user to fill in requirements and type "START" when ready

**Example Response:**
```
🎯 TASK START: PROJECT-123 user-authentication

📋 Available Templates:
1. 🆕 feature-development (recommended for user-authentication)
2. 🐛 debugging  
3. ♻️ refactor-optimization
4. 🗄️ database-schema
5. 🔌 api-endpoint
6. 🎨 design-review
7. 📝 documentation
8. 🔒 security-review
9. 🔍 init-session

Which template would you like to use? (Enter number or name)
```

### `START` (after template selection and requirements filled)

**⚠️ CRITICAL WARNING: This command ONLY creates the project plan**
**⚠️ It does NOT execute any implementation phases**
**⚠️ After this completes, you must use PHASE commands to execute**

**AI Actions:**
1. **Read Requirements**: Read completed context file: `ai-contexts/wip/{ticket}-{description}.md`
2. **Create Project Plan**: Generate comprehensive plan: `ai-contexts/project-plans/active/projectplan-{ticket}-{description}-{YYYY-MM-DD}.md`
3. **Structure Validation**: Include all 8 required sections (overview, files, impact, checklist, risk, testing, rollback, review)
4. **Present Plan**: Show project plan summary
5. **Request Approval**: Ask "Approve this plan to begin Phase 1?"
6. **🛑 FULL STOP**: No code execution happens here. Wait for user to review plan.

**What Happens Next:**
- User reviews the project plan
- User types: `PHASE 1` or `EXECUTE PHASE 1` to start implementation
- AI executes ONLY Phase 1 tasks
- AI presents Phase 1 work for review
- AI STOPS and waits for approval
- User types: `PHASE 2` or `NEXT PHASE` to continue
- Pattern repeats for each phase

**Example Response:**
```
✅ Project Plan Created: projectplan-PROJECT-123-user-authentication-2025-10-23.md

📋 Plan Summary:
- 5 phases identified
- 23 tasks total
- Estimated time: 6-8 hours
- Files to create: 8
- Files to modify: 3

❓ Do you approve this plan?

Type `PHASE 1` to begin implementation of Phase 1, or request changes.

🛑 I will not execute any code until you command a specific phase.
```

### `RESUME`
**Purpose:** Restore AI session after interruption, computer shutdown, or team handoff
**When to Use:**
- Starting new day after previous session
- After computer shutdown/restart
- Team member taking over project from another developer
- Returning to project after days/weeks/months

**AI Actions:**
1. **Load Core Contexts**: Read `master-context.md` and `code-workflow.md` to relearn commands
2. **Find Active Project**:
   - If `RESUME {ticket}` provided: Find project plan matching ticket
   - If `RESUME` alone: Search `ai-contexts/project-plans/active/` for active plans
   - If multiple found: Show list and ask user to choose
3. **Read Requirements**: Load `ai-contexts/wip/{ticket}-{description}.md`
4. **Analyze Progress**:
   - Count completed tasks ([x]) vs pending tasks ([ ])
   - Identify current phase (first phase with unchecked tasks)
   - Find next task (first unchecked [ ] task)
5. **Review Git History**:
   - Run `git log --oneline -10` on files mentioned in plan
   - Run `git diff HEAD~5..HEAD` to understand recent changes
   - Note last commit message and author
6. **Auto-Detect Contexts**: Based on project type, load relevant contexts:
   - API work → load `backend-api-context.md`
   - React/components → load `component-context.md`
   - Database → load `database-schema-context.md`
7. **Check Sync Status**: Verify requirements-plan sync status
8. **Present Comprehensive Status**: Show complete restoration summary
9. **Ask How to Proceed**: Offer options (CONTINUE, REVIEW, REPLAN, TEST)

**Example Response (Single Active Project):**
```
🔄 Resuming AI Development Session...

📚 Contexts Loaded:
✅ master-context.md - Workflow commands relearned
✅ code-workflow.md - Development process loaded
✅ backend-api-context.md - Auto-detected from project type

📋 Active Project Plan:
📁 projectplan-TICKET-123-user-auth-2025-10-24.md
🎯 Feature: User authentication with JWT tokens
📅 Started: 2025-10-24 09:00 AM
📅 Last updated: 2025-10-24 16:45 PM

📝 Requirements Context:
📁 wip/TICKET-123-user-auth.md
🔄 Sync Status: IN SYNC (last synced: 2025-10-24 10:25 AM)

📊 Progress Summary:
✅ Phase 1: Database Schema (COMPLETE - 5/5 tasks)
✅ Phase 2: Authentication Endpoints (COMPLETE - 6/6 tasks)
🔄 Phase 3: JWT Token Management (IN PROGRESS - 2/4 tasks)
   ✅ Task 3.1: Implement JWT token generation
   ✅ Task 3.2: Add token expiration logic
   ⏳ Task 3.3: Create token refresh endpoint (NEXT)
   ⏸️ Task 3.4: Add token validation middleware
⏸️ Phase 4: Testing (NOT STARTED - 0/3 tasks)

📂 Files Modified (from git):
- src/models/User.ts (created)
- src/routes/auth.ts (created)
- src/middleware/auth.ts (modified)
- src/utils/jwt.ts (created)

💻 Last Commit:
e716ac8 - "feat: Implement JWT token generation and expiration"
Author: Developer A
Date: 2025-10-24 16:45 PM

🎯 Current Status:
Phase 3 is 50% complete (2/4 tasks done)
Next task: Task 3.3 - Create token refresh endpoint

🔍 Code Context:
I can see you've implemented:
- User model with password hashing (bcrypt rounds=10)
- Login/register endpoints with validation
- JWT token generation with 24-hour expiration
- Rate limiting: 5 failed attempts = lockout

Ready to continue with Task 3.3 (token refresh endpoint).

---

✅ Session restored! I'm up to date with your progress.

How would you like to proceed?
1. CONTINUE - Resume implementation of Task 3.3
2. REVIEW - Review completed work in detail
3. REPLAN - Make changes to the plan
4. TEST - Run tests on completed work

Type: CONTINUE, REVIEW, REPLAN, or TEST
```

**Example Response (Multiple Active Projects):**
```
🔄 Multiple active projects found:

1. 📋 projectplan-TICKET-123-user-auth-2025-10-24.md
   📊 Progress: 60% (12/20 tasks)
   📅 Last updated: 2025-10-24 16:45 PM
   🎯 Next: Phase 3, Task 3.3 - Token refresh endpoint

2. 📋 projectplan-TICKET-456-payment-gateway-2025-10-23.md
   📊 Progress: 25% (5/20 tasks)
   📅 Last updated: 2025-10-23 17:30 PM
   🎯 Next: Phase 2, Task 2.1 - Stripe SDK setup

Which project would you like to resume?
Type: 1, 2, or RESUME TICKET-123
```

**Team Handoff Example:**
```
🔄 Resuming AI Development Session...

👤 Previous Developer: Developer A (last commit: 2025-10-24 16:45)
👤 Current Developer: Developer B (taking over)

📋 Active Project: TICKET-123 User Authentication
📊 Progress: 60% (12/20 tasks)
🎯 Current Phase: Phase 3 - JWT Implementation
⏳ Next Task: Task 3.3 - Create token refresh endpoint

🎯 Handoff Notes:
Developer A left off at Task 3.3 (token refresh endpoint).
All tests passing for completed phases (Phases 1-2).
No blockers noted in plan.

✅ Session restored! Ready for you to continue where Developer A left off.

How would you like to proceed?
1. CONTINUE - Resume implementation
2. REVIEW - Review what Developer A implemented
3. TEST - Run tests on completed work
```

**Optional Parameters:**
- `RESUME` - Resume most recent active project
- `RESUME {ticket}` - Resume specific project by ticket (e.g., `RESUME TICKET-123`)
- `RESUME {filename}` - Resume by exact project plan filename

### `PHASE 1` or `EXECUTE PHASE 1`
**AI Actions:**
1. **Execute Phase 1 Tasks ONLY** from the approved project plan
2. **Mark Checkboxes**: Update project plan document with [x] for completed tasks
3. **Present Phase 1 Review** with detailed summary (see format below)
4. **Request Approval**: "Phase 1 complete. Review above. Type 'PHASE 2' to continue."
5. **🛑 STOP HERE**: Do not proceed to Phase 2 without explicit command

**Review Format:**
```
## 🔍 PHASE 1 REVIEW REQUEST

**Completed Tasks:**
- ✅ Task 1.1: Description
- ✅ Task 1.2: Description

**Files Created:**
- `src/utils/helper.js` (156 lines) - Utility functions for data processing

**Files Modified:**
- `src/store/index.js` (+12 lines) - Added new action

**Key Code Snippet:**
```javascript
// Show 5-10 lines of the most important/interesting code
function criticalFunction() {
  // Implementation
}
```

**Design Decisions:**
- **Decision 1**: [What you decided] - **Rationale**: [Why you decided it]
- **Decision 2**: [What you decided] - **Rationale**: [Why you decided it]

**Issues Encountered:**
- [Any problems, workarounds, or deviations from plan]

**Next Phase:** Phase 2 - UI Components Creation

---

❓ **APPROVAL REQUIRED**

Please review the Phase 1 work above.

Type:
- `PHASE 2` or `NEXT PHASE` to continue to Phase 2
- `REVISE [details]` to request changes
- `EXPLAIN [topic]` for clarification on any aspect

🛑 I will not proceed without your explicit command.
```

### `PHASE 2` (or `PHASE 3`, `PHASE 4`, etc.)
**Pattern:** Same as Phase 1
- Execute ONLY the specified phase
- Present review with same detailed format
- Request approval before proceeding
- 🛑 STOP and wait

### `NEXT PHASE` or `CONTINUE`
**AI Actions:**
1. Determine which phase was just completed
2. Execute the next sequential phase (e.g., if Phase 2 done, execute Phase 3)
3. Follow same review and approval pattern
4. 🛑 STOP after presenting review

**Example:**
```
Executing Phase 3 (Components Integration)...
[work happens]
## 🔍 PHASE 3 REVIEW REQUEST
[detailed review]
🛑 Awaiting your command to proceed to Phase 4
```

### `TASK UPDATE`
**AI Actions:**
1. Review current project plan in `ai-contexts/project-plans/active/`
2. Update checkboxes [x] for completed tasks
3. Add notes on challenges or decisions made
4. Show progress summary with percentage
5. Identify next tasks to work on

**Example Response:**
```
✅ Updated project plan:
Phase 1: Setup [3/3] ✅ Complete
Phase 2: Components [2/5] 🔄 In Progress
📊 Overall Progress: 62% complete
🎯 Next: Convert Card component
```

### `TASK COMPLETE`
**AI Actions:**
1. Verify all checkboxes are marked [x] in current project plan
2. Add review summary section with lessons learned
3. Create folder: `ai-contexts/project-plans/completed/{YYYY-MM}/`
4. Move project plan from `active/` to `completed/{YYYY-MM}/`
5. Generate descriptive commit message based on completed work
6. Execute: `git add ai-contexts/project-plans/completed/ && git commit -m "message"`
7. Provide completion summary with metrics

**Example Response:**
```
✅ All tasks completed! Project plan shows 100% completion.
📋 Moving to: ai-contexts/project-plans/completed/2025-01/
💾 Committing: "Complete NOTKT: Business-Wide Expense Category Types with Emoji Support"
📊 Results: 8 domains, 71 categories, 471 subcategories with emojis imported
🎯 Next: Run MOVE USER CONTEXT to archive session notes
```

### `TASK STATUS`
**AI Actions:**
1. Show current project plan progress
2. List completed [x] and pending [ ] tasks
3. Calculate completion percentage
4. Estimate remaining work time
5. Highlight any blockers or issues
6. Suggest next steps

**Example Response:**
```
📊 Current Progress: projectplan-NOTKT-expense-category-types-2025-01-21.md
✅ Completed: 45/65 tasks (69%)
⏳ Remaining: 20 tasks estimated 1-2 days
🚧 Blockers: None - core functionality complete
🎯 Next: Complete Phase 5 integration (expense creation page)
```

### `MOVE USER CONTEXT`
**AI Actions:**
1. Find related user context file in `ai-contexts/wip/`
2. Move to `ai-contexts/project-plans/completed/{YYYY-MM}/`
3. Rename with `context-` prefix for clarity
4. Add to same commit as project plan
5. Confirm both files archived together

**Example Response:**
```
📄 Found context file: wip/feature-add-expense-categories.md
� Moving to: completed/2025-01/context-feature-add-expense-categories.md
💾 Adding to git commit with project plan
✅ Both project plan and session context archived together
```

### `ARCHIVE PROJECT`
**AI Actions:**
1. Move project plan from `active/` to `completed/{YYYY-MM}/`
2. Move related context file from `wip/` to `completed/{YYYY-MM}/`
3. Rename context file with `context-` prefix
4. Generate comprehensive commit message
5. Commit both files together with `git add` and `git commit`
6. Provide archival summary

### `CLEAN WIP`
**AI Actions:**
1. List files in `ai-contexts/wip/`
2. Identify which have completed project plans
3. Ask permission before removing each file
4. Move to completed/ or delete based on user preference
5. Confirm wip/ folder cleaned up

## Requirements-Plan Synchronization Commands

### `COMPARE REQUIREMENTS`
**Purpose:** Diagnostic analysis of alignment between requirements and project plan
**When:** Before deciding whether to SYNC REQUIREMENTS or REPLAN
**Type:** Read-only diagnostic operation (makes no changes)

**AI Actions:**
1. Read requirements context file from `ai-contexts/wip/`
2. Read current project plan from `ai-contexts/project-plans/active/`
3. Analyze alignment and identify gaps:
   - Requirements in context but missing from plan
   - Details in plan but missing from requirements
   - Mismatches or inconsistencies
4. Calculate alignment percentage
5. Provide specific recommendations
6. Suggest next action (SYNC REQUIREMENTS, REPLAN, or APPROVE PLAN)

**Example Response:**
```
🔍 Comparing Requirements with Project Plan...

📝 Requirements: wip/TICKET-123-user-auth.md
📋 Project Plan: projectplan-TICKET-123-user-auth-2025-10-24.md

📊 Alignment Analysis:

✅ Aligned (80%):
- User registration with email/password
- Login functionality
- Session management basics
- Password hashing with bcrypt

⚠️ Missing from Requirements (Plan has details):
- JWT token expiration: 24 hours (from Phase 2 analysis)
- Password requirements: min 8 chars, 1 uppercase, 1 number
- Rate limiting: 5 failed attempts = 15min lockout
- Database schema: users table needs 'locked_until' column
- Error handling: Return 401 for invalid credentials

⚠️ Missing from Plan (Requirements mention):
- "Remember me" functionality (mentioned in requirements)
- Email verification (listed in success criteria)

❌ Mismatches:
- Requirements say "sessions expire after 1 hour"
- Plan specifies "JWT tokens expire after 24 hours"
  → Need to clarify which is correct

📈 Overall Alignment: 65%
- 8 items aligned
- 5 items in plan but not requirements
- 2 items in requirements but not plan
- 1 mismatch needs resolution

💡 Recommendations:

1. **Resolve Mismatch First:**
   - Clarify session/token expiration time (1 hour vs 24 hours)
   - Update requirements or plan to match decision

2. **Then Choose:**
   - Run `SYNC REQUIREMENTS` to add plan details to requirements
     → Adds: JWT expiration, password rules, rate limiting, DB schema
   - OR run `REPLAN` to add missing features to plan
     → Adds: "Remember me", email verification

3. **Or:**
   - Manually update requirements to include missing items
   - Then run `REPLAN` to regenerate plan with all features

🎯 Suggested Next Step:
SYNC REQUIREMENTS (to capture plan's detailed analysis in requirements for QA)

After sync, manually add "Remember me" and "Email verification" to requirements, then REPLAN.
```

**Workflow Integration:**
```
TASK START → Fill Requirements → START → Generate Plan
                ↓
    Requirements evolve ← → Plan gets detailed
                ↓
COMPARE REQUIREMENTS → identifies gaps (read-only diagnostic)
                ↓
        [User decides based on comparison]
                ↓
SYNC REQUIREMENTS or REPLAN → re-align
                ↓
COMPARE REQUIREMENTS again → verify alignment
                ↓
APPROVE PLAN → lock and implement
```

### `SYNC REQUIREMENTS`
**Purpose:** Update requirements context to match current project plan
**When:** After creating/modifying project plan, before starting implementation

**AI Actions:**
1. Read current project plan in `ai-contexts/project-plans/active/`
2. Extract all requirements, constraints, and implementation details from analysis
3. Update requirements context file in `ai-contexts/wip/`
4. Show diff of what was added/updated in requirements
5. Mark sync timestamp in both files
6. Confirm requirements now match project plan

**Example Response:**
```
📋 Syncing requirements with project plan...

Reading: projectplan-TICKET-123-user-auth-2025-10-24.md
Updating: wip/TICKET-123-user-auth.md

📝 Changes to Requirements:

✅ Added:
- JWT token expiration: 24 hours (from Phase 2 analysis)
- Password strength: min 8 chars, 1 uppercase, 1 number
- Rate limiting: 5 failed attempts = 15min lockout
- Database: users table needs 'locked_until' column

✏️ Updated:
- Success Criteria: Added "passwords must be hashed with bcrypt rounds=10"
- Testing Requirements: Added integration tests for lockout

🔍 Review updated requirements?
wip/TICKET-123-user-auth.md

✅ Requirements now match project plan. Ready to proceed!
```

### `REPLAN`
**Purpose:** Re-analyze requirements and update project plan
**When:** After user manually updates requirements with new ideas/scope changes

**AI Actions:**
1. Read updated requirements context from `ai-contexts/wip/`
2. Perform fresh impact analysis
3. Update project plan in `ai-contexts/project-plans/active/`
4. Show what changed in the plan (added tasks, updated estimates, new risks)
5. Mark as needing sync review
6. Recommend running SYNC REQUIREMENTS after review

**Example Response:**
```
📋 Re-analyzing requirements...

Reading: wip/TICKET-123-user-auth.md
Updating: projectplan-TICKET-123-user-auth-2025-10-24.md

📝 Changes to Project Plan:

✅ Added Tasks:
- Phase 2, Task 2.5: Integrate Google OAuth2 library
- Phase 2, Task 2.6: Create /auth/google/callback endpoint
- Phase 4, Task 4.5: Test Google login flow

✏️ Updated:
- Risk Assessment: Added dependency on Google OAuth service
- Testing Plan: Added OAuth integration tests
- Files Affected: Added oauth-config.ts

⚠️ Impact: +2 hours estimated time

📊 Updated Plan Status:
- Phases: 4 → 4 (unchanged)
- Tasks: 15 → 18 (+3 tasks)
- Estimated Time: 2 days → 2.5 days

🔍 Review updated plan?
projectplan-TICKET-123-user-auth-2025-10-24.md

⚠️ Requirements and plan may be out of sync.
Run SYNC REQUIREMENTS after reviewing changes.
```

### `APPROVE PLAN`
**Purpose:** Lock requirements and plan, begin implementation
**When:** After requirements and plan are synchronized and finalized

**AI Actions:**
1. Check if requirements and plan are in sync (compare timestamps)
2. If not synced, prompt user to run SYNC REQUIREMENTS first
3. If synced, show plan summary (phases, tasks, estimates, risks)
4. Mark plan as "Approved" and lock it
5. Begin Phase 1 implementation
6. Update project plan with approval timestamp

**Example Response (Not Synced):**
```
✅ Checking synchronization status...

Requirements: wip/TICKET-123-user-auth.md
Last modified: 2025-10-24 10:15 AM

Project Plan: projectplan-TICKET-123-user-auth-2025-10-24.md
Last modified: 2025-10-24 10:20 AM

⚠️ Plan was modified after requirements.

Would you like to SYNC REQUIREMENTS first?
This ensures QA has complete requirements.

Options:
1. SYNC REQUIREMENTS (recommended)
2. APPROVE ANYWAY (skip sync)
3. CANCEL (review plan first)
```

**Example Response (Synced):**
```
✅ Synchronization verified!

Requirements and plan last synced: 2025-10-24 10:25 AM
No changes since sync.

📋 Plan Summary:
- 4 Phases
- 18 Tasks
- Estimated: 2.5 days
- All risks documented
- Tests planned

🔒 Locking plan for implementation...

✅ Plan approved and locked!

🚀 Starting Phase 1: Database Schema Setup

Phase 1 Tasks:
- [1.1] Create users table
- [1.2] Add authentication columns
- [1.3] Create migration script

Proceeding with Task 1.1...
```

### `PLAN STATUS`
**Purpose:** Check synchronization status and plan details
**When:** Anytime during planning phase

**AI Actions:**
1. Show last modification times for requirements and plan
2. Check if sync is needed (compare timestamps)
3. Display plan progress (phases completed, tasks done)
4. Show any warnings or recommendations
5. Display current task and next task

**Example Response (In Sync):**
```
📊 Project Plan Status

📋 Plan: projectplan-TICKET-123-user-auth-2025-10-24.md
📝 Requirements: wip/TICKET-123-user-auth.md

🔄 Synchronization:
✅ Last synced: 2025-10-24 10:25 AM
✅ Requirements: No changes since sync
✅ Plan: No changes since sync
✅ Status: IN SYNC

📈 Progress:
- Phase 1: [████████░░] 80% (4/5 tasks)
- Phase 2: [░░░░░░░░░░] 0% (0/6 tasks)
- Phase 3: [░░░░░░░░░░] 0% (0/4 tasks)
- Phase 4: [░░░░░░░░░░] 0% (0/3 tasks)

Overall: 22% complete (4/18 tasks)

🎯 Current: Phase 1, Task 1.5 - Test user table creation
⏭️ Next: Phase 2, Task 2.1 - Implement registration endpoint

✅ Ready to proceed!
```

**Example Response (Out of Sync):**
```
📊 Project Plan Status

📋 Plan: projectplan-TICKET-123-user-auth-2025-10-24.md
📝 Requirements: wip/TICKET-123-user-auth.md

🔄 Synchronization:
⚠️ Last synced: 2025-10-24 09:00 AM
⚠️ Requirements: Modified 10:15 AM (75 min ago)
⚠️ Plan: Modified 10:20 AM (70 min ago)
❌ Status: OUT OF SYNC

🔍 Detected Changes:
- Requirements: Added OAuth requirement
- Plan: Added 3 new tasks for OAuth

⚠️ Recommendation: Run SYNC REQUIREMENTS before implementation

📈 Progress:
Overall: 0% complete (0/18 tasks)

🎯 Status: Planning phase
⏭️ Next: Sync requirements, then APPROVE PLAN
```

### `UNLOCK PLAN`
**Purpose:** Reset to planning phase (emergency scope change mid-implementation)
**When:** Need to change scope after plan is locked

**AI Actions:**
1. Warn user that implementation progress will be reset
2. Show current progress that will be lost
3. Require confirmation
4. If confirmed, unlock plan and reset to planning phase
5. Allow REPLAN and SYNC REQUIREMENTS again
6. Mark plan as "Unlocked" with reason and timestamp

**Example Response:**
```
⚠️ Warning: This will reset implementation progress.

Current progress will be lost:
- Phase 1: 80% complete (4/5 tasks)
- Phase 2: 20% complete (1/6 tasks)

Are you sure? (yes/no)

[User: yes]

✅ Plan unlocked.
⚠️ Progress reset to planning phase.

You can now:
- Update requirements
- REPLAN
- SYNC REQUIREMENTS
- APPROVE PLAN again

Note: Completed code is not deleted, only plan progress is reset.
```

## Reporting Commands

### `DOCUMENT WORK`
**AI Actions:**
1. Read current project plan from `ai-contexts/project-plans/active/`
2. Extract completed tasks and key accomplishments
3. Generate descriptive commit message using conventional commit format
4. Include metrics and impact summary
5. Follow format: `type(scope): description`
6. Suggest commit message for user review
7. Do NOT commit automatically - wait for user approval

### `SUMMARY WEEK`
**AI Actions:**
1. List all project plans completed this week
2. Show files from `ai-contexts/project-plans/completed/`
3. Summarize key accomplishments
4. Calculate productivity metrics
5. Highlight major features or fixes delivered

### `SUMMARY MONTH`
**AI Actions:**
1. List all project plans in `completed/{YYYY-MM}/`
2. Group by feature type (bug fix, feature, refactor)
3. Show completion trends and velocity
4. Highlight major deliverables
5. Generate monthly accomplishment report

### `FIND WORK {keyword}`
**AI Actions:**
1. Search `ai-contexts/project-plans/completed/` for specified keyword
2. Look in file names and content
3. Show matching project plans with dates
4. Provide brief summary of each match
5. Help locate relevant historical work

## Advanced Commands

### `ROLLBACK TASK {project-name}`
**AI Actions:**
1. Locate project plan in `ai-contexts/project-plans/completed/{YYYY-MM}/`
2. Confirm rollback reason with user
3. Move project plan from completed back to `active/`
4. Reset relevant checkboxes to [ ] if needed
5. Add rollback note section with:
   - Original completion date
   - Rollback reason
   - Current date
6. Update timestamps to current date
7. Confirm task is back in active development

### `DUPLICATE PLAN {new-ticket}`
**AI Actions:**
1. Identify current or specified project plan to copy
2. Create copy with new ticket ID: `{new-ticket}`
3. Reset all checkboxes from [x] to [ ]
4. Update all dates to current date
5. Update file name with new ticket ID
6. Preserve structure and phase organization
7. Prompt user to customize for new requirements
8. Save as new project plan in `active/`

### `TEMPLATE SAVE {template-name}`
**AI Actions:**
1. Copy current project plan structure
2. Remove specific ticket numbers and dates
3. Replace with placeholder variables:
   - `{TICKET-ID}` for ticket numbers
   - `{YYYY-MM-DD}` for dates
   - `{DESCRIPTION}` for descriptions
4. Reset all checkboxes to [ ]
5. Add template usage instructions at top
6. Save to: `ai-contexts/templates/project-plans/{template-name}.md`
7. Document template in templates README
8. Confirm template created and ready for reuse

## Help Commands

### `SHOW COMMANDS`
**AI Actions:**
1. Display all available workflow commands in formatted table
2. Organize by category: Task Management, File Management, Reporting, Advanced, Help
3. Show command syntax with placeholders (e.g., `{ticket}`, `{desc}`)
4. Include brief description for each command
5. Highlight most commonly used commands
6. Note VS Code snippets availability
7. Reference full documentation location

**Example Response:**
```
📋 AI Workflow Commands

TASK MANAGEMENT:
  TASK START {ticket} {desc}  - Create project plan and begin work
  TASK UPDATE                 - Update progress and checkboxes
  TASK COMPLETE               - Archive completed work with documentation
  TASK STATUS                 - Show current progress and next steps

FILE MANAGEMENT:
  MOVE USER CONTEXT           - Archive context file with project plan
  ARCHIVE PROJECT             - Archive both plan and context together
  CLEAN WIP                   - Remove completed work from wip folder

REPORTING:
  DOCUMENT WORK               - Generate commit message from current work
  SUMMARY WEEK                - Show this week's completed tasks
  SUMMARY MONTH               - Show this month's productivity metrics
  FIND WORK {keyword}         - Search completed work history

ADVANCED:
  ROLLBACK TASK {project}     - Move completed work back to active
  DUPLICATE PLAN {ticket}     - Copy existing plan for similar work
  TEMPLATE SAVE {name}        - Save current plan as reusable template

HELP:
  SHOW COMMANDS               - Display this command reference
  SHOW SNIPPETS               - Display all VS Code snippets available

💡 TIP: All commands available as VS Code snippets with 'ai-' prefix
📖 Full documentation: contexts/workflow-commands-reference.md
```

### `SHOW SNIPPETS`
**Purpose:** Display all VS Code snippets registered for workflow commands
**AI Actions:**
1. List snippet files location: `integrations/vscode/`
2. Read both snippet files:
   - `ai-workflow-snippets.code-snippets` (basic templates)
   - `ai-workflow-commands.code-snippets` (workflow commands)
3. Parse JSON and extract all snippet definitions
4. Display snippets organized by category (Session, Task, Sync, File, Reporting, Advanced, Help)
5. Show prefix (trigger word) and description for each
6. Provide installation instructions for VS Code
7. Show total count of available snippets

**Example Response:**
```
📋 VS Code Snippets for AI Workflow

📁 Location: integrations/vscode/

📦 ai-workflow-commands.code-snippets (28 snippets):

SESSION MANAGEMENT:
  ai-train              - First-time AI training message
  resume                - Resume AI session and continue work
  resume-ticket         - Resume specific project by ticket
  continue              - Continue implementation after RESUME
  review                - Review completed work after RESUME

TASK MANAGEMENT:
  task-start            - Start new task with template selection
  start                 - Begin work after filling context file
  task-update           - Update project plan checkboxes
  task-complete         - Complete and archive project
  task-status           - Show current task progress

REQUIREMENTS-PLAN SYNC:
  sync-req              - Update requirements to match plan
  replan                - Re-analyze and update plan
  approve-plan          - Lock plan and begin implementation
  plan-status           - Check synchronization status
  unlock-plan           - Reset to planning phase

FILE MANAGEMENT:
  move-context          - Move user context to completed
  archive-project       - Archive project plan and context
  clean-wip             - Clean completed items from wip

REPORTING:
  document-work         - Generate commit message
  summary-week          - Show this week's completed work
  summary-month         - Show this month's completed work
  find-work             - Search completed project plans

ADVANCED:
  rollback-task         - Move project back to active
  duplicate-plan        - Copy project plan for similar work
  template-save         - Save plan as reusable template

HELP:
  show-commands         - Display all workflow commands

📦 ai-workflow-snippets.code-snippets (4 snippets):
  ai-master             - Load core AI contexts
  ai-feature            - Start feature development session
  ai-debug              - Start debugging session
  ai-refactor           - Start refactoring session

📊 Total: 32 snippets available

💡 Installation:
1. Copy files from integrations/vscode/ to:
   - Windows: %APPDATA%\Code\User\snippets\
   - Mac/Linux: ~/.config/Code/User/snippets/
2. Restart VS Code
3. Type snippet prefix in any file (e.g., "task-start")
4. Press Tab to expand snippet

📖 Documentation: contexts/How-to-Use-VS-Code-Snippets.md
```

## Command Standards

### Consistency Rules
- Always confirm action before executing
- Provide status updates during multi-step operations
- Show clear success/failure messages with emojis
- Include relevant metrics when available
- Ask for permission before destructive operations

### Error Handling
- Check file existence before operations
- Validate git repository state
- Provide helpful error messages
- Suggest corrective actions
- Gracefully handle missing files

### Progress Feedback Icons
```
✅ Action completed successfully
🔄 Operation in progress  
⚠️ Warning or attention needed
❌ Error or failure
📊 Metrics or data
📁 File/folder operations
💾 Git operations
🎯 Next steps
```

---

## 🛡️ Command Safety Rules

1. **TASK START**: 
   - **ALWAYS** present template selection menu first
   - **NEVER** assume which template to use
   - Create/show context file for user to edit
   - **NEVER** create project plan during TASK START
   - **ALWAYS** wait for user to type "START" after filling requirements
2. **START** (separate command):
   - **ONLY** execute after user has filled context file
   - Read completed context file before creating project plan
3. **TASK UPDATE**: Only mark tasks [x] that have actually been completed in the conversation
4. **TASK COMPLETE**: Verify 100% completion before moving/committing files
5. **TASK STATUS**: Always read actual project plan file, don't rely on memory
6. **MOVE USER CONTEXT**: Only suggest after TASK COMPLETE has been executed
7. **DOCUMENT WORK**: Generate commit message but DO NOT commit - wait for user approval
8. **ROLLBACK TASK**: Confirm reason with user before moving files, add rollback note explaining why
9. **DUPLICATE PLAN**: Reset all checkboxes to [ ] and update all dates to current date
10. **TEMPLATE SAVE**: Remove ALL specific references (tickets, dates, names) and replace with placeholders
11. **File Operations**: Always use full paths starting with `ai-contexts/`
12. **Git Operations**: Generate descriptive commit messages based on actual work completed

---
