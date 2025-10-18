# Code Workflow Context

***
This is your core operational playbook for end-to-end code tasks.

## Standard Workflow
1. When assigned a task, restate your understanding concisely.
2. Identify all relevant code files, dependencies, and interrelations before proposing modifications.
3. Perform impact analysis and record decisions in a **task-specific plan document**.
4. Create a **To-Do checklist** inside the plan and update it as tasks complete.
5. Seek confirmation before beginning execution.
6. After each milestone, provide a short summary of work completed and request a review.
7. Avoid breaking changes or hidden side effects by thinking system-wide, not locally.
8. Never commit partial work; request confirmation before commits. When adding files to git stage use file name and not wildcard so we pick the files that actually are part of the work.
9. Delete temporary files or exploratory test scripts after use.
10. Optimize for simplicity—prefer small, atomic, self-contained changes.
11. Append a **Review Summary** section at the end of the plan document with key learnings and suggested improvements.

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

**Each task gets its own scoped plan document:**

**Format:** `projectplan-{feature-name}-{YYYY-MM-DD}.md`

**Examples:**
- `projectplan-health-monitoring-2025-10-17.md` - For health status indicator feature
- `projectplan-user-auth-fix-2025-10-16.md` - For authentication bug fix
- `projectplan-vehicle-reports-2025-10-15.md` - For vehicle reporting feature

**Purpose:**
- Keeps each task's scope isolated and traceable
- Prevents plan document from becoming bloated with unrelated tasks
- Makes it easy to reference specific feature implementation history
- Allows parallel work on multiple features without conflicts

**Legacy Note:**
- `projectplan.md` (without suffix) may contain historical work
- New tasks should always create task-specific plan documents
- After task completion, plan documents serve as implementation documentation

***