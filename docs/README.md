# Wheel Tracker Documentation

This directory contains documentation for the Wheel Tracker application.

## Contents

### Deployment

- **[Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)** - Complete guide for deploying to Railway
  - Environment setup
  - Deployment process
  - Migration workflow
  - Monitoring and troubleshooting

### Database

- **[Migrations Quick Reference](./MIGRATIONS.md)** - Quick guide for database migrations
  - Common commands
  - Migration workflow
  - Best practices
  - Troubleshooting

## Quick Links

### Getting Started

1. [Setup Development Environment](../README.md#development-setup)
2. [Database Migrations](./MIGRATIONS.md)
3. [Deploy to Railway](./RAILWAY_DEPLOYMENT.md)

### Common Tasks

- **Creating a migration**: See [MIGRATIONS.md](./MIGRATIONS.md#creating-a-new-migration)
- **Deploying to production**: See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md#deployment-process)
- **Troubleshooting deployments**: See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md#troubleshooting)

### Architecture

- **Tech Stack**: Next.js 15, React 19, TypeScript, Prisma, PostgreSQL
- **Deployment**: Railway with Docker
- **Database**: PostgreSQL with automatic migrations
- **Authentication**: NextAuth.js

## Contributing

When adding new documentation:

1. Create markdown files in this directory
2. Update this README with links to new docs
3. Use clear headings and examples
4. Include troubleshooting sections

## Support

For issues or questions:

1. Check the relevant documentation file
2. Review troubleshooting sections
3. Check application logs
4. Open an issue in the repository
