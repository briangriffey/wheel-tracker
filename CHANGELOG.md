# Changelog

All notable changes to GreekWheel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- OAuth authentication (Google, GitHub)
- Advanced options analytics (Greeks, IV rank, IV percentile)
- Trade alerts and notifications
- Mobile application (React Native)
- Multi-portfolio support
- Tax form generation (1099)
- Broker integration (TD Ameritrade, Interactive Brokers)
- Advanced charting with technical indicators
- Trade simulator for strategy testing

---

## [1.0.0] - 2026-02-07

### 🎉 Initial Release

The first production release of GreekWheel! A comprehensive web application for tracking options trading using the wheel strategy.

### Added

#### Core Features

**Authentication & User Management**
- User registration with email and password
- Secure login with NextAuth.js
- Session-based authentication
- Password hashing with bcrypt
- Protected routes via middleware

**Trade Management**
- Create and track options trades (PUTs and CALLs)
- Record trade details: ticker, strike price, premium, contracts, expiration
- Trade actions: Sell to Open, Buy to Close
- Trade statuses: Open, Closed, Expired, Assigned
- Close trades early with P&L calculation
- Mark PUT trades as assigned to create positions
- Add notes to trades for journaling
- View all trades in sortable table
- Filter trades by status and ticker
- Export trades to CSV for tax preparation

**Position Management**
- Automatic position creation from assigned PUTs
- Track stock holdings from assignments
- Monitor current value and unrealized P&L
- Cost basis calculation (strike price)
- Link covered CALLs to positions
- Close positions manually
- Realized P&L calculation on position closure
- Export positions to CSV

**Dashboard & Analytics**
- Overview cards: Total P&L, Portfolio Value, Active Positions, Open Trades
- Profit & Loss chart over time
- Premium income by month chart
- Win rate and success metrics
- Upcoming expirations calendar
- Color-coded expiration warnings (< 7 days, < 3 days)
- Quick stats and performance summaries

**Benchmark Comparisons**
- Personal benchmarks: Track portfolio value over time
- Market benchmarks: Compare to SPY, QQQ, VTI, or any ticker
- Performance comparison charts
- Relative return calculations
- Benchmark setup with initial capital and date
- Multiple benchmark support

**Stock Price Integration**
- Alpha Vantage API integration
- Automatic price updates (daily via cron)
- Manual price refresh button
- Historical price storage
- Position value calculation with current prices

#### User Experience

**Responsive Design**
- Mobile-first design approach
- Optimized for phone, tablet, and desktop
- Touch-friendly interactions
- Responsive navigation and tables
- Breakpoints for all screen sizes

**Error Handling & Loading States**
- Comprehensive error boundaries (root, page-level)
- Loading skeletons for all pages
- Loading spinners for async operations
- User-friendly error messages with retry options
- Toast notifications for all actions
- Empty states with helpful guidance
- Form validation with inline errors

**Help & Documentation**
- Complete user guide (docs/USER_GUIDE.md)
- In-app help center (/help)
- Frequently Asked Questions (FAQ) page
- Options trading glossary
- Contextual help icons
- Tooltips for complex features
- Quick reference guides

**Navigation**
- Clean header with navigation links
- User menu with sign out
- Help link in navigation
- Breadcrumb trails
- Easy access to all features

#### Technical Implementation

**Architecture**
- Next.js 15 with App Router
- React 19 Server and Client Components
- TypeScript strict mode throughout
- Server Actions for mutations
- Route Handlers for API endpoints
- Prisma ORM with PostgreSQL
- Type-safe database queries

**Data Management**
- Prisma schema with full relations
- Database indexes for performance
- Atomic transactions for data integrity
- Optimistic UI updates where appropriate
- Proper cascade deletes and constraints

**Code Quality**
- ESLint configuration with Next.js rules
- Prettier for consistent formatting
- Husky pre-commit hooks
- TypeScript type checking
- Strict mode enabled
- No `any` types policy

**Testing**
- Vitest test framework
- React Testing Library for components
- 409+ unit and integration tests
- Business logic tests (P&L, calculations, benchmarks)
- Component rendering and interaction tests
- Test coverage reports

**Performance**
- Server Components by default (zero JS where possible)
- Client Components only for interactivity
- Optimized bundle size
- Code splitting and lazy loading
- Efficient database queries with Prisma
- Proper indexing on database

**Security**
- Password hashing with bcrypt
- Environment variables for secrets
- SQL injection prevention via Prisma
- XSS protection via React
- CSRF protection via NextAuth
- HTTPS enforced in production
- Input validation with Zod schemas

**Developer Experience**
- pnpm for fast installs
- Turbopack dev server
- Hot module replacement
- Docker Compose for local database
- Prisma Studio for database GUI
- Clear project structure
- Comprehensive documentation

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- Implemented secure authentication with NextAuth.js
- Password hashing with bcrypt
- Environment variables for all secrets
- Input validation on all forms
- Protected API routes and Server Actions
- CSRF protection
- SQL injection prevention

---

## Version History

### [1.0.0] - 2026-02-07
- 🎉 Initial production release
- Complete wheel strategy tracking application
- Full documentation and help center
- 409+ tests passing
- Production-ready deployment

---

## Release Notes

### How to Read This Changelog

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed in future versions
- **Removed**: Features that have been removed
- **Fixed**: Bug fixes
- **Security**: Security improvements or fixes

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version (1.x.x): Incompatible API changes
- **MINOR** version (x.1.x): New features, backwards-compatible
- **PATCH** version (x.x.1): Bug fixes, backwards-compatible

### Migration Guides

When upgrading between major versions, check for migration guides in the docs folder.

### Support

- **Documentation**: See [User Guide](docs/USER_GUIDE.md)
- **Issues**: Report bugs on GitHub Issues
- **Email**: support@wheeltracker.com

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Suggesting features
- Submitting pull requests
- Code style and standards

---

**[Unreleased]**: https://github.com/yourorg/wheeltracker/compare/v1.0.0...HEAD
**[1.0.0]**: https://github.com/yourorg/wheeltracker/releases/tag/v1.0.0

*Last Updated: 2026-02-07*
