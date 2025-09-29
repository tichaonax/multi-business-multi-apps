# Prisma relation rename audit

Generated: 2025-09-28

This file is a compact, per-file audit of snake_case occurrences found by `scripts/find-prisma-relation-occurrences.js`. For each occurrence I include the snippet, context, recommendation, and the suggested camelCase mapping (if applicable). I recommend leaving DB/table name strings unchanged unless you plan to also change the physical database or the way those scripts reference tables.

---

## Summary

Total matches found: 36

Files with matches:
- `scripts/find-prisma-snake-case.js`
- `scripts/production-setup.js`
- `scripts/setup-project-management-schema.js`
- `src/lib/backup.ts`
- `src/lib/schema.ts`
- `src/lib/sync/conflict-resolver.ts`
- `src/lib/sync/initial-load.ts`
- `scripts/apply-prisma-relation-renames-dryrun.js` (dev helper)

---

## Per-file audit

### 1) `scripts/find-prisma-snake-case.js`
- Location / line: ~67
- Snippet: `'id_format_templates'`
- Context: utility script that searches for snake_case tokens
- Recommendation: Leave as-is. This file intentionally lists DB/table tokens for scanning.
- Suggested mapping (for reference): `id_format_templates -> idFormatTemplates` (do NOT apply automatically here)

---

### 2) `scripts/production-setup.js`
- Location / lines: ~80-89
- Snippets & mappings:
  - `phoneNumberTemplate: 'id_format_templates'`  (id_format_templates -> idFormatTemplates)
  - `dateFormatTemplate: 'id_format_templates'`   (id_format_templates -> idFormatTemplates)
  - `idFormatTemplate: 'id_format_templates'`     (id_format_templates -> idFormatTemplates)
  - `driverLicenseTemplate: 'driver_license_templates'` (driver_license_templates -> driverLicenseTemplates)
  - `jobTitle: 'job_titles'` (job_titles -> jobTitles)
  - `compensationType: 'compensation_types'` (compensation_types -> compensationTypes)
  - `benefitType: 'benefit_types'` (benefit_types -> benefitTypes)
  - `projectType: 'project_types'` (project_types -> projectTypes)
- Context: raw SQL / seed/setup script passing DB table names as strings into insertion/queries
- Recommendation: Leave as-is. These are physical table names used in SQL and must match the DB. Changing them here will break SQL unless DB objects are renamed or additional mapping logic is added.

---

### 3) `scripts/setup-project-management-schema.js`
- Locations: multiple (CREATE TABLE / ALTER TABLE / INSERT / SELECT) referencing `project_types`, `construction_projects`, and related names.
- Key tokens/mappings:
  - `project_types -> projectTypes` (mapping for reference)
  - `construction_projects -> constructionProjects`
- Context: DDL and raw SQL for creating or migrating DB tables
- Recommendation: Leave as-is. These are SQL table identifiers. Only change if you're also migrating DB object names or using PG-level views/aliases.

---

### 4) `src/lib/backup.ts`
- Location / line: ~36
- Snippet: `tables.push('chat_rooms', 'chat_messages', 'chat_participants')`
- Mapping reference: `chat_rooms -> chatRooms`, `chat_messages -> chatMessages`, `chat_participants -> chatParticipants`
- Context: runtime backup uses raw SQL `SELECT * FROM ${table}` to read DB tables
- Recommendation: Leave as-is. These strings are passed directly to SQL and must reflect the DB table names.

---

### 5) `src/lib/schema.ts` (Drizzle table defs)
- Locations / lines: ~57, 80, 105, 136
- Snippets:
  - `export const chatRooms = pgTable('chat_rooms', { ... })`
  - `export const constructionProjects = pgTable('construction_projects', { ... })`
  - `export const menuItems = pgTable('menu_items', { ... })`
  - `export const personalExpenses = pgTable('personal_expenses', { ... })`
- Mapping reference: these Drizzle exports already *map* JS camelCase symbols to snake_case DB table names. This is correct.
- Recommendation: Leave as-is. No change needed; the code already exports camelCase constants (good) while using the DB table name string for `pgTable()`.

---

### 6) `src/lib/sync/conflict-resolver.ts`
- Location / lines: ~485-486
- Snippet: `this.addResolutionRule('business_products', { tableName: 'business_products', ... })`
- Mapping reference: `business_products -> businessProducts`
- Context: conflict resolution rules keyed by table name / applies to sync logic
- Recommendation: Leave as-is. These rule keys refer to DB table names and are used in raw event resolution logic. If you later move to using Prisma model names here, update with careful crosswalk logic; don't rename automatically.

---

### 7) `src/lib/sync/initial-load.ts`
- Location / lines: ~91-99 (CORE_TABLES)
- Snippet: CORE_TABLES includes: `'job_titles', 'compensation_types', 'benefit_types', 'project_contractors', 'project_stages', 'id_format_templates', ...`
- Mapping reference examples: `job_titles -> jobTitles`, `compensation_types -> compensationTypes`, `benefit_types -> benefitTypes`, `project_contractors -> projectContractors`, `project_stages -> projectStages`, `id_format_templates -> idFormatTemplates`
- Context: list of physical DB tables used to create snapshots/transfers
- Recommendation: Leave as-is. These strings are used to run SQL for snapshots and must match the DB table names.

---

### 8) `scripts/apply-prisma-relation-renames-dryrun.js` (dev helper)
- Location / line: ~45
- Snippet: comment referencing `job_titles` as a detection example
- Recommendation: Leave as-is — it's a helper/dry-run script and can reference DB tokens for explaining behavior.

---

## Overall recommendation

- Do NOT perform automated replacements for the matches above — they are primarily DB/table name strings, SQL/DDL references, or Drizzle table mappings. Changing them without simultaneous DB changes or explicit crosswalk logic will break SQL scripts and backup/restore routines.

- The safe places to change Prisma client field names are unquoted object keys in `include`/`select` blocks or dot-access on Prisma return objects inside `src/`. I ran a conservative dry-run scan and found _no_ such occurrences for the filtered mapping in `src/` — so no automatic edits were proposed.

## Next steps (pick one)

- If you want to canonicalize non-src scripts/tooling for readability (not required for Prisma to work), I can optionally update scripts in `scripts/` to use camelCase names for their JS variables while still using the DB table string for SQL (or add a mapping table in those scripts). This is cosmetic/organizational only.

- If you want me to create a safe crosswalk utility (a small module) that maps DB table names to Prisma relation names and centralizes conversions for backup/restore and migration scripts, I can implement that. This is a robust solution if you want to gradually move code to the canonical form.

- If you'd like, I can also produce a PR with small, well-commented changes (backups created) for any specific files you approve.

---

If you'd like edits applied, tell me *which files* to alter (or approve a crosswalk utility), and I'll:
1. Create per-file backups (`<file>.prisma-rename-bak`).
2. Apply minimally-invasive edits (JS variable renames, use mapping utility, or other safe changes).
3. Run `npm run build` and `node scripts/smoke-prisma.js` to validate.

If you'd like the audit improved (different format, CSV), say so and I'll update it.
