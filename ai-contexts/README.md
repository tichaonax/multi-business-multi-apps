# AI Development Workflow

This directory contains the AI-assisted development workflow for this project.

## 📁 Structure

```
ai-contexts/
├── contexts/          # Context documents (teach AI your standards)
│   ├── master-context.md
│   ├── code-workflow.md
│   ├── backend/       # Backend-specific contexts
│   └── frontend/      # Frontend-specific contexts
│
├── templates/         # Session templates for different tasks
│   └── v1/
│       ├── feature-development-session.md
│       ├── debugging-session.md
│       ├── refactor-optimization-session.md
│       └── ...
│
├── wip/              # Work-in-progress context files (gitignored)
│
└── project-plans/    # AI-generated project plans
    ├── active/       # Currently working on (gitignored)
    └── completed/    # Finished & documented (tracked)
```

## 🚀 Quick Start

1. **Choose a template** based on your task:
   - Feature development: `templates/v1/feature-development-session.md`
   - Bug fixing: `templates/v1/debugging-session.md`
   - Refactoring: `templates/v1/refactor-optimization-session.md`

2. **Start AI session:**
   ```
   Please read these contexts in order:
   1. FIRST: ai-contexts/contexts/master-context.md
   2. SECOND: ai-contexts/contexts/code-workflow.md
   3. THIRD: ai-contexts/templates/v1/[your-template].md
   ```

3. **Follow the workflow** with approval checkpoints

## 📚 Documentation

For complete documentation, examples, and guides:
→ https://github.com/tichaonax/ai-dev-workflow

## 🔄 Updating

Check `.workflow-version` file for current version and update instructions.

## ✏️ Customization

Add project-specific contexts in:
- `contexts/custom/` (create this folder)
- These won't be overwritten during updates
