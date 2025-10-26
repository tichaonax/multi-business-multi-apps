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

💡 TIP: All commands available as VS Code snippets with 'ai-' prefix
📖 Full documentation: contexts/workflow-commands-reference.md
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
