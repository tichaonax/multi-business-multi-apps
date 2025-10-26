# Database and Schema Context

## 🎯 Purpose

To enforce strict database naming conventions, ORM standards, and migration discipline for this project.

---

## 🚨 MANDATORY NAMING CONVENTIONS

**These rules are NON-NEGOTIABLE. AI must follow EXACTLY or request approval for deviations.**

### Prisma Model Naming (PascalCase)
```prisma
// ✅ CORRECT
model ExpenseCategory { }
model UserPermission { }
model PersonalExpense { }

// ❌ WRONG - DO NOT USE
model expense_category { }    // Wrong: snake_case
model expenseCategory { }     // Wrong: camelCase
```

### Table Names (snake_case)
```prisma
// ✅ CORRECT
@@map("expense_categories")
@@map("user_permissions")
@@map("personal_expenses")

// ❌ WRONG - DO NOT USE
@@map("ExpenseCategories")    // Wrong: PascalCase
@@map("expenseCategories")    // Wrong: camelCase
```

### Column Names (camelCase)
```prisma
// ✅ CORRECT
model User {
  firstName    String
  lastName     String
  emailAddress String
  createdAt    DateTime
  isActive     Boolean
}

// ❌ WRONG - DO NOT USE
model User {
  first_name     String    // Wrong: snake_case
  FirstName      String    // Wrong: PascalCase
  email-address  String    // Wrong: kebab-case
}
```

---

## 🔧 MANDATORY ORM: Prisma

**Required:** ALL database operations MUST use Prisma ORM.

### Schema Location
```
prisma/
├── schema.prisma          ← Single source of truth
└── migrations/            ← Auto-generated, DO NOT edit manually
    └── YYYYMMDDHHMMSS_description/
        └── migration.sql
```

### Prisma Schema Standards

```prisma
// ✅ CORRECT Example
model ExpenseCategory {
  id          String              @id @default(uuid())
  name        String              @unique
  emoji       String              @default("💰")
  description String?
  isActive    Boolean             @default(true)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  // Relations (camelCase naming)
  expenses    PersonalExpense[]

  @@map("expense_categories")
  @@index([name])
}

model PersonalExpense {
  id         String           @id @default(uuid())
  amount     Decimal          @db.Decimal(12, 2)
  categoryId String?

  category   ExpenseCategory? @relation(fields: [categoryId], references: [id])

  @@map("personal_expenses")
}
```

### Required Fields (Standard Pattern)

**Every table MUST include** (unless explicitly justified):
```prisma
id        String   @id @default(uuid())  // UUID primary key
createdAt DateTime @default(now())        // Creation timestamp
updatedAt DateTime @updatedAt             // Auto-update timestamp
```

**Optional but recommended:**
```prisma
isActive  Boolean  @default(true)         // Soft delete support
createdBy String?                         // Audit trail
```

---

## 📝 Migration Workflow

### 🚨 CRITICAL: Migration-Only Approach

**This project uses MIGRATION-FIRST workflow. The Prisma schema is the source of truth, NOT the database.**

### ❌ FORBIDDEN COMMANDS

**NEVER use these commands unless explicitly authorized:**

```bash
# ❌ FORBIDDEN - Pulls schema from database (bypasses migrations)
npx prisma db pull

# ❌ FORBIDDEN - Pushes schema without creating migration
npx prisma db push

# ❌ FORBIDDEN - Introspects database instead of using schema
npx prisma introspect
```

**Why forbidden?**
- `db pull` generates schema from database, losing migration history
- `db push` applies changes without migration files (no audit trail)
- These commands break migration-based workflow
- Migration history becomes inconsistent
- Team members get out of sync

**Only use if:**
- Explicitly requested by senior developer
- Authorized for specific emergency scenarios
- You understand you're breaking normal workflow

### ✅ MANDATORY Process

1. **Make Schema Changes**
   ```bash
   # Edit prisma/schema.prisma ONLY
   # NEVER edit migration SQL files directly
   # NEVER use db pull to generate schema from database
   ```

2. **Generate Migration**
   ```bash
   npx prisma migrate dev --name descriptive_name_here
   # Example: npx prisma migrate dev --name add_expense_category_system

   # This is the ONLY correct way to apply schema changes
   ```

3. **Review Generated SQL**
   ```bash
   # Check: prisma/migrations/[timestamp]_descriptive_name/migration.sql
   # Verify it does what you expect
   ```

4. **Test Migration**
   ```bash
   # Run on development database first
   npx prisma migrate dev

   # Verify schema matches
   npx prisma generate
   ```

5. **Apply to Production** (when ready)
   ```bash
   npx prisma migrate deploy
   ```

### Migration Naming Convention
```bash
# ✅ CORRECT
npx prisma migrate dev --name add_expense_categories
npx prisma migrate dev --name update_user_permissions
npx prisma migrate dev --name fix_category_relationships

# ❌ WRONG
npx prisma migrate dev --name changes
npx prisma migrate dev --name fix
npx prisma migrate dev --name update
```

---

## 🚨 Critical Rules for AI

### Rule 1: NEVER Deviate Without Approval
```
❌ AI decides: "I'll use snake_case for fields because it's more common"
✅ AI asks: "Project uses camelCase for fields, but I think snake_case
             would be better here because [reason]. Should I deviate?"
```

### Rule 2: ALWAYS Use Prisma
```
❌ AI suggests: "Let me write raw SQL for this query"
✅ AI does: Uses Prisma Client methods ONLY
✅ AI exception: "Raw SQL needed for [complex reason], here's the Prisma
                 syntax: await prisma.$queryRaw`...`"
```

### Rule 3: ALWAYS Generate Migrations (NEVER use db pull/push)
```
❌ AI suggests: "Let me run npx prisma db pull to sync the schema"
❌ AI suggests: "Let me run npx prisma db push for quick testing"
❌ AI does: Edits migration.sql files directly
✅ AI does: Edits schema.prisma, then runs npx prisma migrate dev
✅ AI exception: "I need db pull for [emergency reason]. This will break
                 migration history. Is this authorized?"
```

**Why this matters:**
- `db pull` overwrites schema from database (loses migration history)
- `db push` skips migrations (no audit trail, team sync breaks)
- Migration-first is the ONLY correct workflow

### Rule 4: ALWAYS Follow Naming Exactly
```
❌ AI decides: "I'll name this userPreference for consistency"
✅ AI follows: Checks existing models, uses UserPreference (PascalCase)
              with @@map("user_preferences") (snake_case table)
```

---

## 📋 Example Checklist for Database Changes

Before creating any database-related code, AI must verify:

- [ ] Model name is PascalCase (e.g., `ExpenseCategory`)
- [ ] Table name uses @@map with snake_case (e.g., `@@map("expense_categories")`)
- [ ] All columns are camelCase (e.g., `firstName`, `createdAt`)
- [ ] Standard fields included: `id`, `createdAt`, `updatedAt`
- [ ] Relations properly defined with camelCase names
- [ ] Migration will be generated via `npx prisma migrate dev --name descriptive_name`
- [ ] **NOT using `npx prisma db pull` or `npx prisma db push`** (FORBIDDEN unless authorized)
- [ ] No manual SQL editing (use Prisma schema ONLY)
- [ ] Backward compatibility maintained (if applicable)
- [ ] Foreign keys properly set up
- [ ] Indexes added for frequently queried fields

---

## 🎯 Real-World Example: Adding Expense Categories

### Step 1: Update Schema
```prisma
// prisma/schema.prisma

model ExpenseDomain {
  id          String              @id @default(uuid())
  name        String              @unique
  emoji       String
  description String?
  isActive    Boolean             @default(true)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  categories  ExpenseCategory[]

  @@map("expense_domains")
}

model ExpenseCategory {
  id          String              @id @default(uuid())
  domainId    String?
  name        String
  emoji       String              @default("💰")
  isDefault   Boolean             @default(false)
  createdAt   DateTime            @default(now())

  domain      ExpenseDomain?      @relation(fields: [domainId], references: [id])
  expenses    PersonalExpense[]

  @@unique([domainId, name])
  @@map("expense_categories")
}
```

### Step 2: Generate Migration
```bash
npx prisma migrate dev --name add_expense_category_system
```

### Step 3: Verify Generated SQL
```sql
-- Check: prisma/migrations/20251021120000_add_expense_category_system/migration.sql

CREATE TABLE "expense_domains" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domainId" TEXT,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '💰',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_domainId_fkey"
        FOREIGN KEY ("domainId") REFERENCES "expense_domains"("id")
);

CREATE UNIQUE INDEX "expense_domains_name_key" ON "expense_domains"("name");
CREATE UNIQUE INDEX "expense_categories_domainId_name_key"
    ON "expense_categories"("domainId", "name");
```

---

## ⚠️ Common Mistakes AI Must Avoid

### Mistake 1: Inconsistent Naming
```prisma
// ❌ WRONG
model ExpenseCategory {
  category_id String    // Wrong: snake_case column
  CategoryName String   // Wrong: PascalCase column
  @@map("ExpenseCategory")  // Wrong: PascalCase table
}

// ✅ CORRECT
model ExpenseCategory {
  categoryId   String
  categoryName String
  @@map("expense_categories")
}
```

### Mistake 2: Skipping Standard Fields
```prisma
// ❌ WRONG - Missing standard fields
model Category {
  id   String
  name String
}

// ✅ CORRECT - All standard fields
model Category {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Mistake 3: Using db pull or db push (FORBIDDEN)
```bash
# ❌ WRONG - Breaks migration workflow
npx prisma db pull              # Pulls from database, loses history
npx prisma db push              # Pushes without migration file
npx prisma introspect           # Old name for db pull

# ✅ CORRECT - Migration-first workflow
vim prisma/schema.prisma
npx prisma migrate dev --name add_categories
```

**Why this is critical:**
- `db pull` generates schema from existing database, destroying migration history
- `db push` applies changes without creating migration files (no audit trail)
- Team members can't replay migrations to sync their databases
- Production deployments have no migration record
- **Only use if explicitly authorized for emergency recovery**

### Mistake 4: Direct SQL Migration Editing
```bash
# ❌ WRONG - Never edit migration files manually
vim prisma/migrations/20251021_add_categories/migration.sql
# Manually editing SQL

# ✅ CORRECT - Always use schema
vim prisma/schema.prisma
npx prisma migrate dev --name add_categories
```

---

## 📚 Additional Guidelines

### Backward Compatibility
1. **Adding columns:** Use nullable or default values
2. **Removing columns:** Deprecate first, remove later
3. **Renaming:** Create new column, migrate data, remove old

### Foreign Keys
- **ALWAYS** define relations in Prisma schema
- Use `onDelete: Cascade` or `onDelete: SetNull` explicitly
- Never create orphaned records

### Indexes
- Add indexes for frequently queried fields
- Composite indexes for multi-column queries
- Unique constraints where appropriate

### Soft Deletes
```prisma
// Recommended pattern
model Entity {
  id        String   @id
  isActive  Boolean  @default(true)  // Soft delete flag
  deletedAt DateTime?                // Optional: when deleted
}
```

---

## 🎓 Reference Examples

See complete, production-tested examples:
- `examples/feature-development/expense-categories-emoji-system.md`
- Demonstrates 3-level hierarchy with Prisma
- Shows proper naming throughout
- Includes migration strategy

---

## ✅ Success Criteria

Database changes are correct when:
- [ ] All naming conventions followed exactly
- [ ] Prisma schema is single source of truth
- [ ] Migration generated (not hand-written)
- [ ] Standard fields present
- [ ] Relations properly defined
- [ ] Backward compatible (if updating existing schema)
- [ ] Tested on development database
- [ ] AI requested approval before any naming deviations

---

**Remember:** These conventions exist to maintain consistency. AI MUST follow them or explicitly request approval to deviate with strong justification.
