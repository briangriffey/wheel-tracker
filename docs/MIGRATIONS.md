# Database Migrations Quick Reference

## Overview

This project uses Prisma Migrate for database schema management. Migrations are automatically applied during Railway deployment.

## Common Commands

### Development

```bash
# Create a new migration (after changing schema.prisma)
pnpm db:migrate

# Generate Prisma Client (after schema changes or git pull)
pnpm db:generate

# Push schema changes without creating migration (for prototyping)
pnpm db:push

# Open Prisma Studio to view/edit data
pnpm db:studio
```

### Production

```bash
# Apply pending migrations (automatically run on Railway)
pnpm db:migrate:deploy

# Combined deploy script (migrations + start app)
pnpm deploy
```

## Creating a New Migration

1. **Modify the schema** in `prisma/schema.prisma`

2. **Create migration**:
   ```bash
   pnpm db:migrate
   ```
   - Enter a descriptive name (e.g., "add_trade_notes_field")
   - Migration files created in `prisma/migrations/`
   - Migration applied to local database

3. **Verify migration**:
   - Check database with `pnpm db:studio`
   - Test application locally with `pnpm dev`
   - Review generated SQL in migration folder

4. **Commit migration**:
   ```bash
   git add prisma/migrations
   git commit -m "feat: add notes field to trades"
   ```

5. **Deploy**:
   ```bash
   git push origin main
   ```
   Railway automatically applies the migration

## Migration Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  Local Development                                           │
├─────────────────────────────────────────────────────────────┤
│  1. Edit prisma/schema.prisma                               │
│  2. Run: pnpm db:migrate                                    │
│  3. Test changes locally                                    │
│  4. Commit migration files                                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Version Control                                             │
├─────────────────────────────────────────────────────────────┤
│  1. Push to GitHub                                          │
│  2. Railway detects changes                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Railway Deployment                                          │
├─────────────────────────────────────────────────────────────┤
│  1. Build Docker image                                      │
│  2. Run: pnpm db:migrate:deploy                            │
│  3. Start application                                       │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

### ✅ DO

- **Test migrations locally** before deploying
- **Use descriptive migration names** (e.g., "add_user_email_verification")
- **Make incremental changes** - small migrations are safer
- **Review generated SQL** before committing
- **Commit migration files** with your code changes
- **Add default values** when adding NOT NULL columns
- **Make columns nullable first**, migrate data, then add constraints

### ❌ DON'T

- **Don't edit migration files** after they've been applied
- **Don't delete migration files** that have been deployed
- **Don't use `db:push`** in production (use migrations instead)
- **Don't make breaking changes** without a rollout plan
- **Don't rename tables/columns** without backward compatibility
- **Don't drop columns** that the running app might still use

## Safe Migration Patterns

### Adding a Column

```prisma
// ✅ Safe - add as optional
model Trade {
  // ... existing fields
  notes String?  // Nullable - safe to add
}
```

### Adding a Required Column

```prisma
// Step 1: Add as optional
model Trade {
  status TradeStatus?
}

// Step 2: Deploy, backfill data, then make required
// After data migration:
model Trade {
  status TradeStatus @default(OPEN)
}
```

### Renaming a Column

```prisma
// Step 1: Add new column
model Trade {
  oldName String?
  newName String?
}

// Step 2: Deploy app that writes to both columns
// Step 3: Backfill data: UPDATE trade SET newName = oldName
// Step 4: Deploy app that only uses newName
// Step 5: Drop oldName in next migration
```

### Changing Column Type

```prisma
// Step 1: Add new column with new type
model Trade {
  premium_old Decimal?
  premium     Float?
}

// Step 2: Deploy, migrate data, verify
// Step 3: Remove old column
```

## Troubleshooting

### Migration Fails Locally

```bash
# Reset database (⚠️ DELETES ALL DATA)
pnpm prisma migrate reset

# Or manually fix and retry
pnpm db:migrate
```

### Migration Fails on Railway

1. **Check logs** in Railway dashboard
2. **Fix the issue** locally
3. **Create new migration** to resolve
4. **Push to deploy** again

### Prisma Client Out of Sync

```bash
# Regenerate Prisma Client
pnpm db:generate

# If still issues, try:
rm -rf node_modules/.prisma
pnpm db:generate
```

### Need to Rollback

Prisma doesn't support automatic rollback. Options:

1. **Revert commit** and deploy previous version
2. **Create new migration** that undoes the changes
3. **Manually fix database** with SQL

## Migration Files

### Structure

```
prisma/
├── schema.prisma              # Database schema
├── migrations/
│   ├── 20260207181839_init/
│   │   └── migration.sql      # SQL for this migration
│   ├── 20260207183519_add_auth_models/
│   │   └── migration.sql
│   └── migration_lock.toml    # Database provider lock
```

### Migration SQL

Example `migration.sql`:

```sql
-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    -- ... more columns
    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_userId_idx" ON "Trade"("userId");
```

## Environment Variables

### Required for Migrations

```env
# Database connection string
DATABASE_URL="postgresql://user:password@localhost:5432/wheeltracker"
```

### Local Development

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wheeltracker"
```

### Railway Production

Railway automatically sets `DATABASE_URL` when you add a PostgreSQL service.

## Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Troubleshooting Guide](https://www.prisma.io/docs/guides/database/troubleshooting-orm)

## Quick Reference Table

| Task | Command | When |
|------|---------|------|
| Create migration | `pnpm db:migrate` | After schema changes |
| Apply migrations | `pnpm db:migrate:deploy` | Production deploy (automatic) |
| Generate client | `pnpm db:generate` | After schema/migration changes |
| View database | `pnpm db:studio` | Inspect/edit data |
| Push schema | `pnpm db:push` | Prototyping only |
| Reset database | `pnpm prisma migrate reset` | ⚠️ Development only |
