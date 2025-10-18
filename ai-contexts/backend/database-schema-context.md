## 8. Database and Schema Workflow Context

## Purpose
To standardize data modeling, naming, and migration discipline.

## Guidelines
1. Model names in **PascalCase**; column names in **camelCase**; tables in **snake_case**.
2. Include timestamps on all major tables where applicable.
3. Avoid nullable fields unless justified.
4. Ensure referential integrity—use foreign keys instead of manual joins.
5. Test schema migrations in a staging environment before release.
6. Maintain data shape backward compatibility.
7. Document schema changes immediately upon modification.
8. Avoid prisma db pull (Introspection) instead always do prisma migrate deploy ensuring that the database schema matches the state defined by your Prisma migration files

***