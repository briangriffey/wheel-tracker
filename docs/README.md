# GreekWheel Documentation

This directory contains documentation for the GreekWheel application.

## Contents

### User Documentation

- **[Features Guide](./FEATURES.md)** - Comprehensive guide to all GreekWheel features
  - Wheels Dashboard
  - Wheel Detail View
  - Notification System
  - Trade & Position Management
  - Dashboard & Analytics
  - Tips & Best Practices

- **[User Guide](./USER_GUIDE.md)** - Complete user guide for using GreekWheel
  - Getting started
  - Understanding the wheel strategy
  - Entering trades and managing positions
  - Using the dashboard
  - Exporting for taxes

- **[Wheel Strategy Guide](./wheel-strategy-guide.md)** - Educational guide to the wheel strategy
  - What is the wheel strategy
  - Step-by-step cycle breakdown
  - Risk management
  - Advanced techniques

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

### For Users

- **[Features Guide](./FEATURES.md)** - Learn about Wheels Dashboard, Notifications, and all app features
- **[User Guide](./USER_GUIDE.md)** - Complete guide to using the application
- **[Wheel Strategy Guide](./wheel-strategy-guide.md)** - Learn the wheel options trading strategy

### For Developers

1. [Setup Development Environment](../README.md#development-setup)
2. [Database Migrations](./MIGRATIONS.md)
3. [Deploy to Railway](./RAILWAY_DEPLOYMENT.md)
4. [Design System](./DESIGN_SYSTEM.md)
5. [Error Handling](./ERROR_HANDLING.md)
6. [Notifications API](./NOTIFICATIONS_API.md) - Server actions for notification system

### Common Tasks

- **Using wheels feature**: See [FEATURES.md](./FEATURES.md#wheels-dashboard)
- **Setting up notifications**: See [FEATURES.md](./FEATURES.md#notification-system)
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
