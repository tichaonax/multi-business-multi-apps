# AI Context Documentation

## AI Context Hierarchy for Coding Workflows

This directory contains context documentation for AI assistants working on this codebase. This strategic idea is a simple concept that creates a set of reusable **context files** and is an effective way to work around short-term memory constraints in AI agents. You can think of them as modular “instruction sets” that you load into a conversation as needed. Below is a **hierarchical Markdown template system** that you can expand with task-specific modules.

***

## Structure

- `master-context.md` - Master context file with high-level project overview
- `code-workflow.md` - Standard code workflow and development practices
- `general-problem-solving-context.md` - General problem-solving approaches

### Frontend
- `ui-context.md` - UI/UX patterns and conventions
- `component-context.md` - Component architecture and patterns
- `styling-context.md` - Styling system and conventions
- `unit-testing-context.md` - Frontend testing patterns

### Backend
- `backend-api-context.md` - API design patterns and conventions
- `database-context.md` - Database schema, Prisma conventions, and data models

### Session Templates
Session templates help initialize focused AI-assisted development sessions with proper context loading.

**Location:** `session-templates/v1/`

**Available Templates:**
- `init-session.md` - Generic session initialization
- `feature-development-session.md` - New feature development with structured planning
- `debugging-session.md` - Bug analysis and resolution
- `design-review-session.md` - UI/UX design review before implementation
- `refactor-optimization-session.md` - Code improvement and performance optimization
- `api-endpoint-session.md` - REST API endpoint development with validation
- `database-schema-session.md` - Database schema modifications with migration planning
- `security-review-session.md` - Security audits and vulnerability assessment
- `documentation-session.md` - Technical documentation and code comments

**Example Templates:**
Each template has a corresponding filled example (e.g., `EXAMPLE-feature-development-session-filled.md`) showing realistic usage with detailed scenarios.

**Usage:**
1. Choose the template matching your task
2. Review the corresponding example for guidance
3. Fill in your specific requirements
4. Load recommended context documents
5. Start session with clear objectives

**See:** `session-templates/README.md` for complete guide including session reset procedures.

***