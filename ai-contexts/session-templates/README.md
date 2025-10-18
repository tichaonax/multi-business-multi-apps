
# Session Templates Index

## Purpose
It explains the purpose of each session type and when to use it, helping you choose the right initialization template quickly.

***

This directory contains modular templates for initiating focused AI-assisted development sessions.  
Each template defines its own purpose, recommended contexts, and collaboration flow to maintain clarity and consistency across different types of coding work.

---

## 🧭 How to Use

1. Choose the session template that best matches your goal.  
2. Load it along with `master-context.md` and `code-workflow.md` from the main `contexts/` directory.  
3. Fill in the **Session Objective** field before starting.  
4. Send **Start Session** to formally begin, prompting the AI to summarize the goal and suggest a plan.

---

## 📂 Available Session Templates (v1)

| File | Purpose | Typical Contexts Loaded |
|------|----------|-------------------------|
| **init-session.md** | Generic initialization for new AI sessions; establishes scope and expectations. | `master-context.md`, `code-workflow.md`, `general-problem-solving-context.md` |
| **feature-development-session.md** | For creating new features, screens, or endpoints with structured planning. | `code-workflow.md`, `component-context.md`, `backend-api-context.md`, `unit-testing-context.md` |
| **debugging-session.md** | For analyzing bugs, identifying causes, and proposing safe fixes. | `code-workflow.md`, `general-problem-solving-context.md`, optional front/back-end modules |
| **design-review-session.md** | To review UI layouts, architectures, or theme organization before implementation. | `ui-context.md`, `styling-context.md`, `code-workflow.md` |
| **refactor-optimization-session.md** | For improving or simplifying existing code while preserving function and tests. | `code-workflow.md`, `general-problem-solving-context.md`, optional domain-specific contexts |
| **api-endpoint-session.md** | For creating new REST API endpoints with proper validation and error handling. | `code-workflow.md`, `backend-api-context.md`, `database-context.md` |
| **database-schema-session.md** | For adding, modifying, or removing database tables, columns, or relationships. | `code-workflow.md`, `database-context.md`, `backend-api-context.md`, `CLAUDE.md` (naming conventions) |
| **security-review-session.md** | For conducting security audits, identifying vulnerabilities, and implementing security best practices. | `code-workflow.md`, `backend-api-context.md`, `database-context.md`, `component-context.md` |
| **documentation-session.md** | For creating or updating technical documentation, API docs, README files, and code comments. | `code-workflow.md`, `backend-api-context.md`, `component-context.md`, `database-context.md` |

---

## 📚 Example Templates

Each template has a corresponding filled example showing realistic usage:

| Example File | Demonstrates | Scenario |
|--------------|--------------|----------|
| **EXAMPLE-init-session-filled.md** | Generic session initialization | Starting a new coding task with proper context setup |
| **EXAMPLE-feature-development-session-filled.md** | Complete feature development | Employee Leave Request Management System with backend + frontend |
| **EXAMPLE-debugging-session-filled.md** | Bug investigation and resolution | Dashboard revenue calculation bug with detailed investigation plan |
| **EXAMPLE-design-review-session-filled.md** | UI/UX design review process | Employee Detail Page redesign with accessibility and mobile considerations |
| **EXAMPLE-refactor-optimization-session-filled.md** | Performance optimization | Fixing N+1 query problem in dashboard activity API (3-5s → <500ms) |
| **EXAMPLE-api-endpoint-session-filled.md** | REST API development | Creating POST /api/payroll/entries endpoint with validation and tests |
| **EXAMPLE-database-schema-session-filled.md** | Database schema changes | Adding Asset Management System with 3 new tables and relationships |
| **EXAMPLE-security-review-session-filled.md** | Security vulnerability assessment | Reviewing personal finance APIs for IDOR vulnerabilities and access control |
| **EXAMPLE-documentation-session-filled.md** | Technical documentation creation | Documenting Payroll Module APIs with JSDoc comments and developer guides |

**How to use examples:**
1. Review the example before filling your own template
2. Understand the level of detail expected
3. Use similar structure and formatting
4. Adapt to your specific use case

---

## 🧩 Recommended Usage Scenarios

### New Feature
Use `feature-development-session.md`  
Focus on planning, implementing, and validating new logic or UI sections.  

### Bug or Regression
Use `debugging-session.md`  
Follow a hypothesis–test–verify cycle.  

### Design Review
Use `design-review-session.md`  
Ideal before major visual or structural updates.  

### System Optimization or Cleanup
Use `refactor-optimization-session.md`  
Safely analyze and refine codebases without breaking behavior.  

### Multi-Domain Projects
Start with `init-session.md`  
Add or remove active contexts manually for hybrid goals that don’t fit neatly into one template.

---

## 🪄 Tip
These session templates can be mixed if the task spans multiple stages —
for example, start with a **design review**, evolve into a **feature development**, then conclude with **refactor optimization** using chained sessions.

---

## 🔄 Starting a New Session (Resetting Context)

When you complete one session and want to start a new one with fresh context, it's critical to explicitly signal to the AI that previous context is no longer relevant.

### ✅ Recommended Methods

#### **Method 1: Use `/clear` Command (Best)**
```
/clear

═══════════════════════════════════════════════════════
🆕 NEW SESSION
═══════════════════════════════════════════════════════

Previous session: CLOSED (health monitoring feature)
New session: Employee Leave Request System

Load fresh contexts:
- ai-contexts/code-workflow.md
- ai-contexts/backend/backend-api-context.md
- ai-contexts/database-context.md

[Paste filled template here]
```

#### **Method 2: Explicit Reset Message**
```
---
## 🔄 NEW SESSION - PREVIOUS CONTEXT IRRELEVANT
---

The previous session is now complete. Please discard all context from the previous task.

Starting NEW session for: [task description]

Load the following contexts:
1. ai-contexts/code-workflow.md
2. [other relevant contexts]

[Paste filled template here]
```

#### **Method 3: Start New Chat/Conversation**
- If your interface supports it, start a completely new chat
- This guarantees zero context bleed from previous session
- Load your new session template from the start

### 🎯 Key Phrases to Signal Context Reset

Use these explicit phrases to ensure the AI understands this is a fresh start:

- ✅ **"Start new session"** or **"New session"**
- ✅ **"Previous task complete, discard context"**
- ✅ **"Fresh start for [new task]"**
- ✅ **"Do NOT reference previous session"**
- ✅ **"Clear previous context"**
- ✅ **"Load fresh context documents"**

### ⚠️ Common Mistakes to Avoid

❌ **DON'T:**
- Continue in same conversation without clear reset
- Assume AI will automatically forget previous context
- Say vague things like "forget the health monitoring stuff"
- Mix old and new task context in same message
- Reference files from previous session without re-loading context

✅ **DO:**
- Use explicit reset markers and visual separators
- State clearly what the NEW task is
- List NEW context documents to load
- Use visual separators (lines, headers) for clarity
- Create NEW project plan with NEW date
- Be unambiguous about the context switch

### 📋 Best Practice: Session Transition Workflow

**End Current Session:**
```
Current session is complete.

Summary:
- Feature: Health Monitoring
- Status: ✅ Complete
- Files modified: [list]
- Plan: projectplan-health-monitoring-2025-10-17.md

Session ended.
```

**Start New Session:**
```
/clear

═══════════════════════════════════════════════════════
🆕 NEW SESSION
═══════════════════════════════════════════════════════

Task: Employee Leave Request System
Date: 2025-10-18
Template: feature-development-session.md

Load contexts:
- ai-contexts/code-workflow.md
- ai-contexts/master-context.md
- ai-contexts/backend/backend-api-context.md

═══════════════════════════════════════════════════════

[Paste filled template]
```

### 💡 Pro Tip: Add Session Metadata

Add this header to every filled template:

```markdown
═══════════════════════════════════════════════════════
SESSION METADATA
═══════════════════════════════════════════════════════
Session Date: 2025-10-18
Session Type: Feature Development
Previous Session: NONE (or specify if related)
Context Reset: YES
═══════════════════════════════════════════════════════
```

This makes it crystal clear to the AI that this is a fresh start with no relation to previous work.

---

## ✅ Versioning
Maintain version tags for large teams or multiple projects. Example:

```
session-templates/
├── v1/
├── v2/
└── archive/
```

This folder acts as the bridge between your **context library** (how the AI should think) and **execution sessions** (what the AI should do).

---

***

