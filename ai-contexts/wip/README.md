# Work in Progress (WIP) Folder

This folder contains **user-created context files** that are being actively worked on.

## 🎯 Purpose

Store your filled session templates and task contexts here while you're working on them. These files are **NOT tracked in git** (see `.gitignore`) until you decide they're ready to be documented.

## 🤖 First Time? Train Your AI Assistant!

**IMPORTANT:** Before using this workflow, your AI assistant needs to learn the commands and process.

### Quick Start (30 seconds)

Copy and paste this to your AI assistant:

\`\`\`
👋 Hi! Please read these files to learn our AI development workflow:

📖 ai-contexts/contexts/master-context.md
📖 ai-contexts/contexts/code-workflow.md

These files teach you:
1. TASK START command (template selection & requirements gathering)
2. START command (project plan creation & execution)
3. Approval checkpoints (wait for my approval before coding)
4. Project plan tracking (update checkboxes as you complete tasks)

Once you've read them, help me with: TASK START <ticket> <description>
\`\`\`

### What This Does

Your AI will learn:
- ✅ The two-phase workflow (TASK START → fill template → START)
- ✅ To create project plans BEFORE writing any code
- ✅ To wait for your approval at each checkpoint
- ✅ To update project plan checkboxes as work progresses
- ✅ All workflow commands (TASK STATUS, TASK COMPLETE, etc.)

### Alternative: Use VS Code Snippets

If you've installed the VS Code snippets:
1. Type \`ai-train\` + Tab
2. Send the expanded message to your AI
3. Done!

See: \`ai-contexts/integrations/vscode/\` for snippet installation.

### Need More Help?

- **Full guide:** \`docs/ai-training.md\`
- **Quick start:** \`docs/quick-start.md\`
- **Complete workflow:** \`docs/complete-workflow.md\`

---

## 📝 What Goes Here

- Filled session templates (from \`templates/v1/\`)
- Task descriptions and requirements
- Feature specifications
- Bug investigation notes
- Any context you want to provide to AI

## 🔄 Typical Workflow

### 1. Start New Task

\`\`\`bash
# Copy a template
cp ai-contexts/templates/v1/feature-development-session.md \
   ai-contexts/wip/feature-add-expense-categories.md

# Fill in your context:
# - Feature description
# - Files affected
# - Requirements
# - Success criteria
\`\`\`

### 2. Provide to AI

\`\`\`
"Please read ai-contexts/wip/feature-add-expense-categories.md
and create a project plan."
\`\`\`

### 3. Work on Task

- AI reads your context
- AI creates project plan in \`project-plans/active/\`
- You and AI iterate on the work
- This file stays here during development

### 4. Task Complete (Optional Documentation)

**Option A: Archive with project plan**
\`\`\`bash
mv ai-contexts/wip/feature-add-expense-categories.md \
   ai-contexts/project-plans/completed/2025-01/context-expense-categories.md

git add ai-contexts/project-plans/completed/2025-01/
git commit -m "Document NOTKT: Expense category types context and plan"
\`\`\`

**Option B: Just delete**
\`\`\`bash
rm ai-contexts/wip/feature-add-expense-categories.md
# Project plan has the important info
\`\`\`

## ✅ Best Practices

### Do's ✅

- ✅ Use descriptive filenames: \`feature-add-expense-categories.md\`
- ✅ Include ticket number if applicable (or NOTKT if none)
- ✅ Fill in as much detail as you know
- ✅ Update as requirements change
- ✅ Keep one file per task/feature

### Don'ts ❌

- ❌ Don't commit files from this folder (already gitignored)
- ❌ Don't store completed work here (move to completed/)
- ❌ Don't put project plans here (AI creates those in project-plans/)
- ❌ Don't put sensitive data (passwords, keys, etc.)

## 📋 Naming Convention

**Format:** \`{ticket}-{brief-description}.md\`

**Examples:**
- \`feature-add-expense-categories.md\`
- \`HPP-5471-payment-gateway-integration.md\`
- \`debug-revenue-calculation-bug.md\`
- \`NOTKT-refactor-auth-service.md\` (if no ticket)

## 🗂️ File Lifecycle

\`\`\`
1. CREATE    → wip/feature-add-expense-categories.md
2. WORK      → (stays in wip/ during development)
3. COMPLETE  → Move to project-plans/completed/ OR delete
\`\`\`

## 📊 Current Status

Files currently in this folder are **active work** that hasn't been completed or documented yet.

## 💡 Tips

### For Long-Running Tasks

If a task spans multiple days/weeks, keep the file here. It's your reference for what you're working on.

### For Quick Tasks

For quick fixes or small changes, you might skip creating a context file and just use \`init-session.md\` template directly with AI.

### For Team Handoffs

If someone else needs to take over:
1. Commit your WIP file temporarily
2. They can read it and continue
3. Move back to WIP until complete

---

**Remember:** This folder is for YOUR context files. AI creates project plans in \`project-plans/active/\`.
