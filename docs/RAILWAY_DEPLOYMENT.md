# Railway Deployment Guide

This document explains how the Wheel Tracker application is deployed to Railway and how database migrations are handled automatically.

## Overview

The application uses Railway for hosting with automatic database migrations on each deployment. This ensures the database schema always stays in sync with the application code.

## Architecture

### Deployment Flow

1. **Build Phase**: Docker builds the application image
   - Installs dependencies
   - Generates Prisma Client
   - Builds Next.js application in standalone mode

2. **Migration Phase**: Before app starts, migrations run automatically
   - Prisma CLI applies pending migrations to the database
   - If migrations fail, deployment is aborted
   - Application only starts if migrations succeed

3. **Start Phase**: Application server starts
   - Next.js server runs in production mode
   - Health checks monitor application status

### Files Involved

- **`Dockerfile`**: Multi-stage build including Prisma CLI in production
- **`railway.json`**: Railway configuration with migration command
- **`package.json`**: Scripts for deployment and migrations
- **`prisma/schema.prisma`**: Database schema
- **`prisma/migrations/`**: Migration history

## Database Migrations

### How Migrations Work

Migrations are managed using Prisma Migrate with a production-safe workflow:

1. **Development**: Create migrations locally with `pnpm db:migrate`
2. **Version Control**: Commit migrations to git
3. **Deployment**: Railway automatically applies migrations with `prisma migrate deploy`

### Migration Commands

```bash
# Local development - create new migration
pnpm db:migrate

# Production deployment - apply pending migrations
pnpm db:migrate:deploy

# Generate Prisma Client (run after schema changes)
pnpm db:generate

# Open Prisma Studio to view/edit data
pnpm db:studio
```

### Railway Deployment Command

The `pnpm deploy` command runs automatically on Railway:

```json
"deploy": "pnpm db:migrate:deploy && node server.js"
```

This ensures migrations run **before** the application starts. If migrations fail, the deployment is aborted and the previous version continues running.

## Environment Variables

Required environment variables in Railway:

### Database
- `DATABASE_URL`: PostgreSQL connection string (provided by Railway Postgres)
  - Format: `postgresql://user:password@host:port/database`
  - Railway automatically injects this when Postgres service is linked

### Application
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js sessions
- `NEXTAUTH_URL`: Application URL (e.g., `https://wheeltracker.railway.app`)
- `NODE_ENV`: Set to `production` (Railway sets this automatically)

### Optional
- `FINANCIAL_DATA_API_KEY`: For stock price data fetching
- `NEXT_PUBLIC_APP_URL`: Public-facing application URL

## Deployment Process

### Initial Setup

1. **Create Railway Project**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Login to Railway
   railway login

   # Initialize project
   railway init
   ```

2. **Add PostgreSQL Database**
   - In Railway dashboard, click "New" → "Database" → "Add PostgreSQL"
   - Railway automatically sets `DATABASE_URL` environment variable

3. **Configure Environment Variables**
   - Add required variables in Railway dashboard
   - Go to project → Variables → Add variables

4. **Deploy Application**
   ```bash
   # Deploy from current branch
   railway up

   # Or connect to GitHub for automatic deployments
   # (Railway dashboard → Settings → Connect GitHub repo)
   ```

### Subsequent Deployments

Railway automatically deploys when you push to the connected branch:

```bash
git push origin main
```

Deployment process:
1. Railway detects new commit
2. Builds Docker image using `Dockerfile`
3. Runs `pnpm deploy` command (migrations + start)
4. Health checks verify app is running
5. Routes traffic to new deployment

## Migration Best Practices

### Creating Migrations

1. **Make schema changes** in `prisma/schema.prisma`

2. **Create migration locally**
   ```bash
   pnpm db:migrate
   ```
   - Prompts for migration name (e.g., "add_trade_status_field")
   - Generates SQL migration files
   - Applies migration to local database

3. **Test migration**
   - Verify local database updated correctly
   - Run application locally to test changes
   - Check for data integrity issues

4. **Commit migration files**
   ```bash
   git add prisma/migrations
   git commit -m "Add migration: description"
   ```

5. **Deploy to production**
   ```bash
   git push origin main
   ```
   - Railway applies migration automatically
   - Application restarts with new schema

### Handling Migration Failures

If a migration fails during deployment:

1. **Railway keeps previous version running** - no downtime
2. **Check Railway logs** for error details
3. **Fix migration issue** locally
4. **Create new migration** to resolve the problem
5. **Deploy again**

Common issues:
- **Breaking changes**: Add migrations that preserve data (e.g., make field nullable first, migrate data, then add constraint)
- **Missing data**: Provide default values or backfill data before enforcing constraints
- **Conflicting constraints**: Drop conflicting constraints before adding new ones

### Safe Migration Patterns

✅ **Safe Migrations** (zero downtime):
- Adding nullable columns
- Adding new tables
- Adding indexes
- Creating new non-unique constraints

⚠️ **Risky Migrations** (may cause issues):
- Dropping columns (could break running app)
- Renaming columns (breaks existing queries)
- Adding NOT NULL constraints (fails if existing rows have NULL)
- Changing column types (may lose data)

🔧 **Safe Pattern for Risky Changes**:
1. Add new column (nullable)
2. Deploy app version that writes to both old and new columns
3. Backfill data from old to new column
4. Deploy app version that only uses new column
5. Drop old column in next migration

## Rollback Strategy

If you need to rollback a migration:

1. **Immediate Fix**: Deploy previous git commit
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Database Rollback**: Manually reverse migration
   - Prisma Migrate doesn't support automatic rollback
   - Write SQL to reverse the changes
   - Apply using Prisma Studio or database client
   - Or create a new migration that undoes the changes

3. **Prevention**: Test migrations thoroughly in staging/preview environments

## Monitoring

### Railway Dashboard

Monitor deployments in Railway dashboard:
- **Deployments**: View build logs and deployment history
- **Metrics**: CPU, memory, and request metrics
- **Logs**: Real-time application logs
- **Health Checks**: Monitor `/api/health` endpoint

### Health Check Endpoint

The application includes a health check endpoint at `/api/health`:

```typescript
// Returns 200 OK if application is healthy
{
  "status": "ok",
  "timestamp": "2026-02-07T12:00:00.000Z"
}
```

Railway uses this to verify the application is running correctly.

## Troubleshooting

### Migration Fails on Deploy

**Symptom**: Deployment fails with Prisma migration error

**Solutions**:
1. Check Railway logs for specific error
2. Test migration locally first
3. Ensure DATABASE_URL is set correctly
4. Verify migration files are committed to git

### Application Won't Start

**Symptom**: Health checks fail after deployment

**Solutions**:
1. Check Railway logs for startup errors
2. Verify all environment variables are set
3. Ensure DATABASE_URL is accessible
4. Check Prisma Client was generated correctly

### Database Connection Issues

**Symptom**: "Can't reach database server" errors

**Solutions**:
1. Verify PostgreSQL service is running in Railway
2. Check DATABASE_URL format is correct
3. Ensure Railway Postgres is linked to the application
4. Check network connectivity in Railway

### Build Failures

**Symptom**: Docker build fails

**Solutions**:
1. Check Dockerfile syntax
2. Verify all COPY paths exist
3. Ensure pnpm lockfile is committed
4. Check Node.js version compatibility

## References

- [Railway Documentation](https://docs.railway.app/)
- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

## Support

For issues or questions:
1. Check Railway logs first
2. Review this documentation
3. Check Prisma migration docs
4. Open an issue in the repository
