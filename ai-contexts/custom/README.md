# Custom Team Contexts

> **Team-Specific Context Files**
> Add your company or team-specific context files here

---

## 🎯 Purpose

This folder is for **your team's custom contexts** that extend or override the base AI workflow framework.

**Key Benefits:**
- ✅ **Preserved During Upgrades** - Framework updates won't overwrite your custom contexts
- ✅ **Auto-Loaded by AI** - AI automatically reads all `.md` files in this folder
- ✅ **Team Standards** - Enforce company-specific coding standards, patterns, and conventions
- ✅ **Git Tracked** - Team's custom contexts are part of your project repository

---

## 📝 What to Put Here

### Common Custom Contexts

**Coding Standards:**
- `team-coding-standards.md` - Company-specific code style, naming conventions
- `code-review-checklist.md` - Team's code review requirements

**Architecture & Patterns:**
- `api-design-patterns.md` - Team's REST/GraphQL API conventions
- `database-conventions.md` - DB naming, schema design standards
- `component-patterns.md` - React/Vue component structure standards

**Processes:**
- `security-requirements.md` - Company security policies and requirements
- `deployment-process.md` - Team's deployment workflow and checklist
- `testing-standards.md` - Testing coverage requirements, patterns

**Technology-Specific:**
- `python-standards.md` - Python-specific standards (if framework doesn't cover)
- `java-conventions.md` - Java-specific patterns
- `terraform-patterns.md` - Infrastructure as code standards

---

## 🚀 Quick Start

### Step 1: Create Your Custom Context

```bash
# Create a new custom context file
touch custom/team-coding-standards.md
```

### Step 2: Fill It With Your Standards

```markdown
# Team Coding Standards

## Naming Conventions

### Variables
- Use camelCase for variables: `userName`, `orderTotal`
- Avoid single-letter variables except in loops

### Functions
- Use verb-noun format: `getUserById()`, `calculateTotal()`
- Async functions should be prefixed: `async fetchUserData()`

### Constants
- Use SCREAMING_SNAKE_CASE: `MAX_RETRIES`, `API_TIMEOUT`

## Code Organization

### File Structure
- One component per file
- Index files only for re-exports
- Keep files under 300 lines

### Import Order
1. External dependencies (react, lodash)
2. Internal utilities
3. Components
4. Styles
5. Types

## Error Handling

- Always use try-catch for async operations
- Log errors with context: `logger.error('Failed to fetch user', { userId, error })`
- Return meaningful error messages to users

## Testing Requirements

- Minimum 80% code coverage
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
```

### Step 3: AI Auto-Loads It

When you bootstrap AI, it will automatically read your custom contexts:

```
👋 Hi! Please read these files to learn our AI development workflow:

📖 ai-contexts/contexts/master-context.md
📖 ai-contexts/contexts/code-workflow.md
📖 ai-contexts/custom/team-coding-standards.md ← Your custom context!

These files teach you:
- RESUME: Continue existing work after interruptions/handoffs
- TASK START: Begin new feature or task
- Team-specific standards and conventions (from custom/)
```

---

## 🛡️ Framework Upgrade Safety

### What Happens During Upgrades

When you upgrade the AI workflow framework:

```bash
# Run the installer to upgrade
./install-ai-workflow.sh /path/to/your/project
```

**The installer:**
1. ✅ **Backs up** your entire `ai-contexts/` folder
2. ✅ **Preserves** `custom/` folder contents
3. ✅ **Updates** framework contexts (master-context.md, etc.)
4. ✅ **Restores** your `custom/` folder after update
5. ✅ **Your custom contexts are safe!**

### What Gets Updated vs Preserved

| Folder/File | During Upgrade |
|-------------|----------------|
| `contexts/` | **Updated** - Framework contexts get latest version |
| `templates/` | **Updated** - Framework templates get latest version |
| `custom/` | **✅ PRESERVED** - Your custom contexts remain unchanged |
| `wip/` | **Preserved** - Your work in progress stays intact |
| `project-plans/` | **Preserved** - Your project plans stay intact |

---

## 📖 Example Custom Contexts

### Example 1: API Design Standards

**File:** `custom/api-design-patterns.md`

```markdown
# Company API Design Standards

## RESTful Endpoints

### Naming
- Use plural nouns: `/users`, `/orders`, `/products`
- Use kebab-case for multi-word resources: `/order-items`
- Avoid verbs in endpoint names

### HTTP Methods
- GET: Retrieve resource(s)
- POST: Create new resource
- PUT: Replace entire resource
- PATCH: Update partial resource
- DELETE: Remove resource

### Response Format

**Success (200):**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-10-24T10:30:00Z",
    "version": "1.0"
  }
}
```

**Error (400+):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email"
  }
}
```

### Pagination
- Use query params: `?page=1&limit=20`
- Include metadata: `{ "total": 100, "page": 1, "pages": 5 }`

### Authentication
- All endpoints require JWT in Authorization header
- Format: `Authorization: Bearer <token>`
- Tokens expire after 24 hours
```

### Example 2: Database Conventions

**File:** `custom/database-conventions.md`

```markdown
# Company Database Standards

## Table Naming
- Plural nouns: `users`, `orders`, `products`
- Snake_case for multi-word: `order_items`, `product_categories`

## Column Naming
- Snake_case: `user_id`, `created_at`, `is_active`
- Boolean columns: Prefix with `is_`, `has_`, `can_`
- Timestamps: Always include `created_at` and `updated_at`

## Primary Keys
- Use `id` as primary key (not `user_id` in users table)
- Type: `BIGINT UNSIGNED AUTO_INCREMENT`

## Foreign Keys
- Format: `{table_singular}_id`
- Example: `user_id`, `order_id`, `product_id`
- Always add index on foreign keys
- Use ON DELETE CASCADE or ON DELETE SET NULL appropriately

## Indexes
- Add index on frequently queried columns
- Composite indexes for multi-column queries
- Naming: `idx_{table}_{columns}`

## Migrations
- One change per migration file
- Always provide rollback (down migration)
- Test migrations on staging before production
```

### Example 3: Security Requirements

**File:** `custom/security-requirements.md`

```markdown
# Company Security Standards

## Authentication & Authorization

### Password Requirements
- Minimum 12 characters
- Must include: uppercase, lowercase, number, special character
- Hash with bcrypt, rounds=12
- Salted hashing (never store plain text)

### Session Management
- JWT tokens with 1-hour expiration
- Refresh tokens valid for 7 days
- Rotate refresh tokens on use
- Invalidate all sessions on password change

### API Security
- Rate limiting: 100 requests/minute per IP
- Require HTTPS for all endpoints
- CORS: Whitelist specific origins only
- No credentials in URLs or logs

## Data Protection

### Sensitive Data
- Encrypt PII at rest (AES-256)
- Mask sensitive data in logs
- Never log passwords, tokens, or credit cards

### Database Security
- Use parameterized queries (prevent SQL injection)
- Least privilege: App user has minimal permissions
- Regular backups with encryption

## Code Security

### Input Validation
- Validate all user input
- Sanitize before database queries
- Escape before rendering in HTML
- Use allowlists, not denylists

### Dependencies
- Scan for vulnerabilities weekly
- Update critical security patches within 24 hours
- No deprecated or unmaintained packages

### Secrets Management
- Never commit secrets to git
- Use environment variables
- Rotate API keys quarterly
- Use secret management service (AWS Secrets Manager, Vault)
```

---

## 🎨 Best Practices

### File Naming

✅ **Good:**
- `team-coding-standards.md`
- `api-design-patterns.md`
- `security-requirements.md`

❌ **Avoid:**
- `standards.md` (too generic)
- `MyTeamStandards.md` (use kebab-case)
- `temp.md` (not descriptive)

### Content Structure

**Each custom context should have:**
1. ✅ **Clear title** - What this context covers
2. ✅ **Examples** - Show don't just tell
3. ✅ **Do's and Don'ts** - Make it actionable
4. ✅ **Why** - Explain the reasoning when needed

### Keep It Focused

- One topic per file
- If file exceeds 500 lines, split it
- Link to external docs for deep details

### Version Control

```bash
# Commit custom contexts to your project repo
git add custom/
git commit -m "docs: Add team coding standards to custom contexts"
git push
```

**Benefits:**
- ✅ Team members get contexts when they clone
- ✅ Changes are tracked and reviewable
- ✅ Onboarding is automated

---

## 🔗 Related Documentation

- **[Customization Guide](../docs/customization.md)** - Adapting framework to your needs
- **[Core Concepts](../docs/concepts.md)** - Understanding the context system
- **[Installation Guide](../docs/installation.md)** - Installing and updating framework

---

## 💡 Tips

### Start Simple

Don't create 20 custom contexts on day 1. Start with:
1. Team coding standards
2. Your most important pattern (API, DB, or component structure)

Add more as needs arise.

### Review and Update

- Review custom contexts quarterly
- Update when standards change
- Remove outdated patterns

### Get Team Buy-In

- Involve team in creating contexts
- Review context changes in PRs
- Make contexts living documents

---

## 🆘 Troubleshooting

### AI isn't loading my custom context

**Check:**
1. File is in `ai-contexts/custom/` folder
2. File has `.md` extension
3. File is not named `README.md` (excluded by default)
4. Bootstrap message includes `custom/*.md`

### Custom context conflicts with framework

**Solution:**
- Custom contexts should **extend**, not replace framework contexts
- If you need to override, be specific about what's different
- Document the override clearly

### Lost custom contexts during upgrade

**Prevention:**
- Always use the installer script (it preserves `custom/`)
- Don't manually delete `ai-contexts/` and re-clone
- Backup before manual operations

---

## 📞 Need Help?

- **Issues:** [GitHub Issues](https://github.com/tichaonax/ai-dev-workflow/issues)
- **Discussions:** [GitHub Discussions](https://github.com/tichaonax/ai-dev-workflow/discussions)
- **Examples:** See `docs/customization.md` for more examples

---

**Your team's custom contexts make the AI workflow truly yours.** 🚀
