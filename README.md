# GreekWheel

A comprehensive Next.js web application for tracking options trading using the wheel strategy. Built with modern web technologies, GreekWheel helps traders manage their cash-secured PUTs, covered CALLs, stock positions, and performance metrics.

## 🎯 What is GreekWheel?

GreekWheel is designed for options traders who use the "wheel strategy" - a systematic approach to generating income through selling cash-secured PUTs and covered CALLs. The application provides:

- **Trade Management**: Track all your PUT and CALL trades with detailed information
- **Position Tracking**: Monitor stock positions created from assigned PUTs
- **P&L Calculations**: Automatically calculate profit/loss across trades and positions
- **Benchmarking**: Compare your performance against market indices (SPY, QQQ, VTI)
- **Dashboard Analytics**: Visual charts and metrics to understand your performance
- **Export Functionality**: Export data to CSV for tax preparation and analysis

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.0 or higher
- **pnpm**: 8.0 or higher
- **PostgreSQL**: 14+ (or use Docker Compose)
- **FinancialData.net API Key**: Available at [financialdata.net](https://financialdata.net/)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd wheeltracker
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/wheeltracker"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# FinancialData.net API (for stock prices)
FINANCIAL_DATA_API_KEY="your-api-key-here"
```

4. **Start the database**
```bash
# Using Docker Compose (recommended for development)
docker compose up -d

# Or use your own PostgreSQL instance
```

5. **Run database migrations**
```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
```

6. **Start the development server**
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 📚 Documentation

### For Users
- **[Features Guide](docs/FEATURES.md)**: Complete guide to Wheels Dashboard, Notifications, and all features
- **[User Guide](docs/USER_GUIDE.md)**: Comprehensive guide for using GreekWheel
- **[Wheel Strategy Guide](docs/wheel-strategy-guide.md)**: Learn the wheel options trading strategy
- **[FAQ](app/help/faq)**: Frequently asked questions
- **[Glossary](app/help/glossary)**: Options trading terminology

### For Developers
- **[Design System](docs/DESIGN_SYSTEM.md)**: Component library and design tokens
- **[Error Handling](docs/ERROR_HANDLING.md)**: Error handling implementation details
- **[Deployment Guide](docs/RAILWAY_DEPLOYMENT.md)**: Railway deployment instructions
- **[Migrations Guide](docs/MIGRATIONS.md)**: Database migration reference

## 🛠️ Tech Stack

### Core Technologies
- **[Next.js 15+](https://nextjs.org/)**: React framework with App Router
- **[React 19](https://react.dev/)**: UI library with Server Components
- **[TypeScript 5.7](https://www.typescriptlang.org/)**: Type-safe JavaScript
- **[Tailwind CSS 3.4](https://tailwindcss.com/)**: Utility-first CSS framework

### Backend & Database
- **[PostgreSQL 16](https://www.postgresql.org/)**: Relational database
- **[Prisma 7.3](https://www.prisma.io/)**: Type-safe ORM and query builder
- **[NextAuth.js 5.0](https://next-auth.js.org/)**: Authentication for Next.js
- **[Docker](https://www.docker.com/)**: Containerization for local development

### UI & State Management
- **[React Hook Form 7.71](https://react-hook-form.com/)**: Form handling with validation
- **[Zod 4.3](https://zod.dev/)**: Schema validation
- **[React Hot Toast 2.6](https://react-hot-toast.com/)**: Toast notifications
- **[Recharts 3.7](https://recharts.org/)**: Data visualization

### Development Tools
- **[pnpm 10.6](https://pnpm.io/)**: Fast, disk-efficient package manager
- **[ESLint 9](https://eslint.org/)**: Code linting
- **[Prettier 3.4](https://prettier.io/)**: Code formatting
- **[Husky 9](https://typicode.github.io/husky/)**: Git hooks
- **[Vitest 4.0](https://vitest.dev/)**: Unit testing framework
- **[Testing Library](https://testing-library.com/)**: React component testing

## 📁 Project Structure

```
wheeltracker/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication pages (login, register)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── api/                     # API routes
│   │   └── cron/                # Scheduled jobs (price updates)
│   ├── dashboard/               # Dashboard page
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── trades/                  # Trade management
│   │   ├── page.tsx             # Trade list
│   │   ├── new/page.tsx         # New trade form
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── positions/               # Position management
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── help/                    # Help center
│   │   ├── page.tsx             # Help index
│   │   ├── faq/page.tsx         # FAQ page
│   │   └── glossary/page.tsx    # Glossary
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page
│   ├── globals.css              # Global styles
│   ├── loading.tsx              # Root loading state
│   └── error.tsx                # Root error boundary
├── components/                   # React components
│   ├── ui/                      # Reusable UI components
│   │   ├── spinner.tsx
│   │   ├── skeleton.tsx
│   │   ├── empty-state.tsx
│   │   ├── error-message.tsx
│   │   └── help-icon.tsx
│   ├── forms/                   # Form components
│   │   └── trade-entry-form.tsx
│   ├── dashboard/               # Dashboard components
│   │   ├── overview-card.tsx
│   │   ├── pl-chart.tsx
│   │   ├── benchmark-chart.tsx
│   │   └── expiration-calendar.tsx
│   ├── trades/                  # Trade components
│   │   └── trade-list.tsx
│   ├── positions/               # Position components
│   │   └── positions-list.tsx
│   ├── export/                  # Export components
│   │   └── export-button.tsx
│   ├── session-provider.tsx     # Auth session provider
│   ├── toast-provider.tsx       # Toast notification provider
│   └── user-menu.tsx            # User menu
├── lib/                          # Utilities and libraries
│   ├── actions/                 # Server Actions
│   │   ├── trades.ts
│   │   ├── positions.ts
│   │   ├── benchmarks.ts
│   │   └── prices.ts
│   ├── calculations/            # Business logic
│   │   ├── profit-loss.ts
│   │   ├── position.ts
│   │   └── benchmark.ts
│   ├── queries/                 # Database queries
│   │   ├── trades.ts
│   │   ├── positions.ts
│   │   └── benchmarks.ts
│   ├── services/                # External services
│   │   └── alpha-vantage.ts
│   ├── validations/             # Zod schemas
│   │   ├── trade.ts
│   │   ├── position.ts
│   │   └── benchmark.ts
│   ├── auth/                    # Authentication
│   │   └── config.ts
│   ├── db/                      # Database utilities
│   │   └── index.ts
│   └── utils/                   # Helper functions
│       └── cn.ts
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma            # Prisma schema definition
│   └── migrations/              # Database migrations
├── docs/                         # Documentation
│   ├── USER_GUIDE.md
│   └── ERROR_HANDLING.md
├── types/                        # TypeScript type definitions
│   └── index.ts
├── public/                       # Static assets
├── tests/                        # Test files (optional)
├── .husky/                       # Git hooks
├── docker-compose.yml           # Docker setup
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── eslint.config.mjs            # ESLint configuration
├── next.config.ts               # Next.js configuration
├── package.json                 # Dependencies and scripts
├── pnpm-lock.yaml              # pnpm lockfile
├── postcss.config.mjs          # PostCSS configuration
├── prettier.config.json        # Prettier configuration
├── prisma.config.ts            # Prisma configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── vitest.config.ts            # Vitest configuration
├── vitest.setup.ts             # Vitest setup file
└── README.md                   # This file
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests once (CI mode)
pnpm test:run

# Generate coverage report
pnpm test:coverage
```

### Testing Strategy

- **Unit Tests**: Business logic in `lib/calculations/` and `lib/actions/`
- **Component Tests**: React components using Testing Library
- **Integration Tests**: API routes and Server Actions
- **E2E Tests**: Critical user flows (planned with Playwright)

### Test Coverage

Current test coverage: **409+ tests passing**

Key areas covered:
- Profit & loss calculations
- Position calculations
- Benchmark comparisons
- Trade validation
- Position validation
- Component rendering and interactions

## 📜 Available Scripts

```bash
# Development
pnpm dev              # Start development server with Turbopack
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript compiler checks

# Code Quality
pnpm format           # Format code with Prettier
pnpm format:check     # Check code formatting

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run database migrations
pnpm db:push          # Push schema changes (dev only)
pnpm db:studio        # Open Prisma Studio (database GUI)

# Testing
pnpm test             # Run tests in watch mode
pnpm test:ui          # Run tests with UI
pnpm test:run         # Run tests once
pnpm test:coverage    # Generate coverage report

# Git Hooks
pnpm prepare          # Set up Husky git hooks
```

## 🏗️ Architecture

### App Router Structure

GreekWheel uses Next.js 15's App Router with:
- **Server Components**: Default for all pages, reduces client-side JavaScript
- **Client Components**: Used only for interactivity (forms, menus)
- **Server Actions**: Type-safe mutations without API routes
- **Route Handlers**: API endpoints for external integrations

### Data Flow

```
User Interaction
    ↓
Client Component
    ↓
Server Action (lib/actions/)
    ↓
Validation (lib/validations/)
    ↓
Business Logic (lib/calculations/)
    ↓
Database Query (via Prisma)
    ↓
Database (PostgreSQL)
```

### Database Schema

**Core Models**:
- `User`: User accounts and authentication
- `Trade`: Options trades (PUTs and CALLs)
- `Position`: Stock positions from assigned PUTs
- `StockPrice`: Historical stock prices
- `Benchmark`: Personal performance benchmarks
- `MarketBenchmark`: Market comparison data

**Relations**:
- Users have many Trades, Positions, and Benchmarks
- Positions are created from assigned PUT Trades
- Positions can have many covered CALL Trades
- Trades and Positions belong to Users

### Authentication

- **NextAuth.js 5.0** with Prisma adapter
- Email/password authentication with bcrypt
- Session-based authentication
- Protected routes via middleware

### External Services

- **FinancialData.net API**: Real-time and historical stock prices
- **Scheduled Jobs**: Daily price updates via Vercel Cron

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy**: Vercel auto-deploys on push to main

Environment variables needed:
```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
FINANCIAL_DATA_API_KEY
```

### Docker Deployment

The application is containerized using Docker with Next.js 15 standalone output mode for optimal performance and minimal image size.

#### Prerequisites

- Docker 20.0 or higher
- Node.js 20 runtime (used in container)

#### Building the Docker Image

```bash
docker build -t wheeltracker .
```

#### Running the Container

```bash
docker run -d \
  --name wheeltracker \
  -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e FINANCIAL_DATA_API_KEY="your-api-key" \
  wheeltracker
```

#### Testing Locally

```bash
# Build the image
docker build -t wheeltracker:test .

# Run with test environment
docker run -d --name wheeltracker-test -p 3001:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="your-database-url" \
  wheeltracker:test

# Test health endpoint
curl http://localhost:3001/api/health

# View logs
docker logs wheeltracker-test

# Clean up
docker stop wheeltracker-test && docker rm wheeltracker-test
```

### Railway Deployment

The application is configured for deployment on [Railway](https://railway.app/) using the `railway.json` configuration file.

#### Configuration

The `railway.json` file includes:
- Docker builder configuration
- Health check endpoint (`/api/health`)
- Restart policy (on-failure, max 10 retries)
- Single replica deployment

#### Required Environment Variables

Set the following environment variables in your Railway project:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your application URL (e.g., https://yourapp.railway.app)
- `NEXTAUTH_SECRET` - Secret for NextAuth.js session encryption
- `FINANCIAL_DATA_API_KEY` - API key for stock market data

#### Deployment Steps

1. **Connect Repository**
   - Link your GitHub repository to Railway
   - Railway will automatically detect the `railway.json` configuration

2. **Configure Database**
   - Add a PostgreSQL database service in Railway
   - Railway will automatically set the `DATABASE_URL` environment variable

3. **Set Environment Variables**
   - Add all required environment variables in the Railway dashboard

4. **Deploy**
   - Push to your main branch or manually trigger a deployment
   - Railway will build the Docker image and deploy automatically
   - Health checks will run against `/api/health` to ensure the app is running

5. **Verify Deployment**
   - Check the deployment logs in Railway dashboard
   - Visit `https://your-app.railway.app/api/health` to verify health endpoint

#### Health Check Endpoint

The application includes a health check endpoint at `/api/health` that returns:

```json
{
  "status": "ok",
  "timestamp": "2026-02-08T04:24:58.272Z",
  "service": "wheeltracker",
  "version": "0.1.0"
}
```

This endpoint is used by Railway to monitor application health and trigger automatic restarts if needed.

### Other Platforms

GreekWheel can be deployed to any platform that supports Next.js:
- **Netlify**: Use Next.js runtime
- **Self-hosted**: Use Docker or Node.js

### Database

**Production database options**:
- **Vercel Postgres**: Serverless PostgreSQL (recommended)
- **Supabase**: Free tier available
- **Railway**: PostgreSQL with automatic backups
- **AWS RDS**: Enterprise-grade PostgreSQL

### Build Configuration

```bash
# Build the application
pnpm build

# Start production server
pnpm start

# Standalone output for Docker (already configured in next.config.ts)
# output: 'standalone'
```

## 🔐 Security

### Best Practices Implemented

- **Password Hashing**: bcrypt with salt rounds
- **Environment Variables**: Sensitive data never in code
- **SQL Injection Prevention**: Prisma handles parameterization
- **XSS Prevention**: React escapes by default
- **CSRF Protection**: NextAuth.js built-in
- **HTTPS**: Enforced in production
- **Input Validation**: Zod schemas for all user input

### Security Checklist

- ✅ Passwords hashed with bcrypt
- ✅ Environment variables for secrets
- ✅ HTTPS only in production
- ✅ Input validation on all forms
- ✅ SQL injection protection via Prisma
- ✅ XSS protection via React
- ✅ CSRF tokens via NextAuth

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes**
4. **Run tests**: `pnpm test`
5. **Run linter**: `pnpm lint`
6. **Format code**: `pnpm format`
7. **Commit changes**: Follow conventional commits
8. **Push to your fork**: `git push origin feature/my-feature`
9. **Create a pull request**

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new dashboard chart
fix: correct P&L calculation
docs: update user guide
test: add position tests
refactor: simplify trade validation
style: format with prettier
chore: update dependencies
```

### Code Style

- **TypeScript**: Strict mode, no `any` types
- **React**: Functional components, hooks
- **Naming**: camelCase for variables, PascalCase for components
- **Imports**: Absolute imports with `@/` prefix
- **Comments**: JSDoc for complex functions

### Pre-commit Hooks

Husky automatically runs before each commit:
- ESLint (code quality)
- Type checking (TypeScript)
- Prettier (formatting)

## 📊 Features

### ✅ Implemented

- ✅ User authentication (email/password)
- ✅ Trade tracking (PUTs and CALLs)
- ✅ Position management
- ✅ Automatic P&L calculations
- ✅ Dashboard with charts
- ✅ Benchmark comparisons (personal and market)
- ✅ Stock price integration (FinancialData.net)
- ✅ Export to CSV
- ✅ Responsive design
- ✅ Error handling and loading states
- ✅ Toast notifications
- ✅ Help center and documentation
- ✅ Trade notes and journaling
- ✅ Expiration calendar

### 🚧 Planned

- ⏳ OAuth providers (Google, GitHub)
- ⏳ Mobile app (React Native)
- ⏳ Advanced charts (Greeks, IV rank)
- ⏳ Trade alerts and notifications
- ⏳ Multi-portfolio support
- ⏳ Tax form generation (1099)
- ⏳ Broker integration (TDA, IBKR)

## 🐛 Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use a different port
pnpm dev -- -p 3001
```

**Database connection error**:
```bash
# Check Docker is running
docker ps
# Restart database
docker compose down && docker compose up -d
# Check DATABASE_URL in .env.local
```

**Prisma client not generated**:
```bash
pnpm db:generate
```

**Type errors**:
```bash
# Regenerate Prisma client
pnpm db:generate
# Run type check
pnpm type-check
```

**Tests failing**:
```bash
# Clear test cache
pnpm test --run --clearCache
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 📝 License

Private project - All rights reserved

## 👥 Authors

- Developed by the GreekWheel Team
- Built with ❤️ for options traders

## 🙏 Acknowledgments

- **Options Trading Community**: For strategy inspiration
- **Next.js Team**: For the amazing framework
- **Prisma Team**: For the best ORM
- **FinancialData.net**: For stock price data

## 📞 Support

- **Documentation**: [User Guide](docs/USER_GUIDE.md)
- **FAQ**: [/help/faq](app/help/faq)
- **Email**: support@wheeltracker.com
- **Issues**: GitHub Issues (coming soon)

---

**Happy Wheel Trading! 🎯📈**
