# Project Plans Folder

This folder contains **AI-generated project plans** following the code-workflow methodology.

## 📁 Structure

```
project-plans/
├── active/           # Currently working on (UNTRACKED)
│   ├── README.md
│   └── projectplan-*.md
│
└── completed/        # Finished & documented (TRACKED)
    ├── 2025-10/
    ├── 2025-09/
    └── ...
```

## 🎯 Purpose

- **active/**: AI-generated plans for work currently in progress (gitignored)
- **completed/**: Historical record of finished tasks (tracked for documentation)

## 📝 File Naming Convention

**Format:** `projectplan-{ticket}-{feature}-{YYYY-MM-DD}.md`

**Examples:**
- `projectplan-NOTKT-expense-category-types-2025-01-21.md`
- `projectplan-HPP-5471-payment-gateway-2025-10-18.md`
- `projectplan-NOTKT-refactor-auth-2025-10-15.md`

## 🔄 Complete Workflow

### 1. User Creates Context

```bash
# User fills context in wip/
ai-contexts/wip/feature-add-expense-categories.md
```

### 2. AI Creates Project Plan

```bash
# AI reads context and creates plan in active/
ai-contexts/project-plans/active/projectplan-NOTKT-expense-category-types-2025-01-21.md

# Contains:
# ✅ Task Overview
# ✅ Files Affected  
# ✅ Impact Analysis
# ✅ To-Do Checklist with [ ] checkboxes
# ✅ Risk Assessment
# ✅ Testing Plan
# ✅ Rollback Plan
```

### 3. AI Updates Checkboxes During Work

```markdown
## To-Do Checklist

### Phase 1: Setup
- [x] **Task 1.1:** Install Tailwind dependencies
- [x] **Task 1.2:** Configure tailwind.config.js
- [x] **Task 1.3:** Update postcss.config.js
- [ ] **Task 1.4:** Test build process

### Phase 2: Convert Components
- [ ] **Task 2.1:** Convert Button component
- [ ] **Task 2.2:** Convert Card component
```

### 4. Work Complete → Move to Completed

```bash
# Create monthly folder
mkdir -p ai-contexts/project-plans/completed/2025-01

# Move completed plan
mv ai-contexts/project-plans/active/projectplan-NOTKT-expense-category-types-2025-01-21.md \
   ai-contexts/project-plans/completed/2025-01/

# Optionally move user context too
mv ai-contexts/wip/feature-add-expense-categories.md \
   ai-contexts/project-plans/completed/2025-01/context-expense-categories.md

# Commit for documentation
git add ai-contexts/project-plans/completed/2025-01/
git commit -m "Document NOTKT: Expense Category Types with Emoji Support

- Implemented three-level hierarchy (Domain → Category → Subcategory)
- Imported 200+ expense types with emojis across 8 domains
- All core APIs and components complete
- Dashboard integration with emoji display"

git push
```

## 📊 What to Track vs Not Track

### ❌ NOT Tracked (gitignored)

```
project-plans/active/
```

**Why?**
- Work in progress
- Checkboxes changing frequently  
- May have incomplete information
- Not ready for team documentation

### ✅ TRACKED (committed to git)

```
project-plans/completed/YYYY-MM/
```

**Why?**
- Permanent documentation
- Shows what was done and why
- Helps with debugging later
- Knowledge transfer
- Audit trail

## 🗂️ Organization by Month

Organize completed plans by year-month:

```
completed/
├── 2025-01/
│   ├── projectplan-NOTKT-expense-category-types-2025-01-21.md
│   └── context-expense-categories.md
│
├── 2025-10/
│   ├── projectplan-HPP-5471-payment-gateway-2025-10-18.md
│   └── projectplan-HPP-5472-bug-fix-2025-10-15.md
│
├── 2025-09/
│   ├── projectplan-hpp-5400-user-profile-2025-09-28.md
│   └── projectplan-hpp-5401-api-refactor-2025-09-20.md
│
└── 2025-08/
    └── projectplan-hpp-5300-auth-update-2025-08-15.md
```

**Benefits:**
- Easy to find recent work
- Clear chronological history
- Simple to archive old months

## 📋 Project Plan Required Sections

Every AI-generated project plan MUST include:

### 1. Task Overview
- One-sentence description
- ticket link
- Related documentation

### 2. Files Affected
```markdown
- `src/components/Button.jsx` (lines 45-120)
- `src/styles/button.styles.js` (DELETE)
- `src/utils/classNames.js` (NEW)
```

### 3. Impact Analysis
- What breaks if this fails?
- Which other features depend on this?
- Performance implications

### 4. To-Do Checklist
```markdown
- [ ] **Task 1.1:** Description
- [ ] **Task 1.2:** Description
```

### 5. Risk Assessment
- What could go wrong?
- Mitigation strategies
- Monitoring plan

### 6. Testing Plan
- Unit tests needed
- Integration tests
- Manual testing steps
- Acceptance criteria

### 7. Rollback Plan
- How to undo changes
- Database rollback steps
- Feature flag strategy

### 8. Review Summary (Added at end)
- What was learned
- What worked well
- What would be done differently
- Suggestions for future

## 💡 Best Practices

### For AI

✅ **Always create project plan BEFORE any code changes**
✅ **Update checkboxes as tasks complete**
✅ **Request approval at phase boundaries**
✅ **Add review summary at end**

### For Users

✅ **Review plans before approving**
✅ **Move to completed/ when work merged**
✅ **Commit with meaningful message**
✅ **Keep plans as documentation**

### For Teams

✅ **Read completed plans to understand decisions**
✅ **Reference plans in PR descriptions**
✅ **Use plans for knowledge transfer**
✅ **Review plans during retrospectives**

## 🔍 Finding Plans

### Find by Ticket

```bash
find ai-contexts/project-plans/completed -name "*NOTKT-expense*"
```

### Find by Date

```bash
ls ai-contexts/project-plans/completed/2025-10/
```

### Find by Feature

```bash
grep -r "tailwind" ai-contexts/project-plans/completed/
```

### See All Active Work

```bash
ls ai-contexts/project-plans/active/
```

## 🎯 Example Use Cases

### Use Case 1: New Developer Onboarding

```bash
# Show them recent work
cat ai-contexts/project-plans/completed/2025-10/*.md

# They understand:
# - What features were added
# - Why decisions were made
# - How to approach similar tasks
```

### Use Case 2: Bug Investigation

```bash
# Bug in payment feature
# Find when it was implemented
find ai-contexts/project-plans/completed -name "*payment*"

# Read the plan to understand:
# - Original design
# - Files modified
# - Testing done
# - Known risks
```

### Use Case 3: Performance Review

```bash
# Show what you shipped this quarter
ls ai-contexts/project-plans/completed/2025-{07,08,09}/

# Each file documents:
# - Feature delivered
# - Complexity
# - Impact
```

### Use Case 4: AI Handoff

```bash
# You start task, AI creates plan
# Later, different AI session continues
# AI reads the plan and knows:
# - What's done (checked boxes)
# - What's next (unchecked boxes)
# - Design decisions made
```

## ⚠️ Important Notes

### Don't Edit Completed Plans

Once moved to `completed/`, plans are historical records. Don't edit them.

If you need to track changes to completed work:
- Create a new project plan
- Reference the original plan
- Example: `projectplan-NOTKT-expense-categories-phase7-ui-2025-02-01.md`

### Keep Plans Readable

- Use clear task descriptions
- Add context in risk assessment
- Explain "why" not just "what"
- Future you (or teammate) will thank you

### Plans Are Living Documents

While in `active/`, plans should be updated as work progresses:
- Check off completed tasks
- Add notes on challenges encountered
- Update estimates if scope changes
- Document decisions made during implementation

---

**Remember:** Project plans are created by AI, not users. Users create context files in `wip/`.
