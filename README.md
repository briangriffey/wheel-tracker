# Wheel Tracker

A Next.js web application for tracking options trading using the wheel strategy.

## Tech Stack

- **Next.js 15+** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **pnpm** - Fast, disk-efficient package manager

## Prerequisites

- Node.js 18.0 or higher
- pnpm 8.0 or higher

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd wheeltracker
pnpm install
```

### 2. Set Up Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
- Database connection string
- NextAuth configuration
- API keys (Alpha Vantage for stock data)

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

### Development
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript compiler checks
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

### Testing
- `pnpm test` - Run unit/integration tests (watch mode)
- `pnpm test:run` - Run unit/integration tests (once)
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:ui` - Run tests with UI
- `pnpm test:e2e` - Run E2E tests with Playwright
- `pnpm test:e2e:ui` - Run E2E tests with UI
- `pnpm test:e2e:debug` - Debug E2E tests
- `pnpm test:e2e:report` - View E2E test report

### Database
- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema to database
- `pnpm db:studio` - Open Prisma Studio

## Project Structure

```
wheeltracker/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utilities and libraries
├── .husky/               # Git hooks
├── public/               # Static assets
└── package.json          # Dependencies
```

## Testing

Wheel Tracker has comprehensive test coverage across three layers:

- **Unit Tests** - Test individual functions and components (Vitest + React Testing Library)
- **Integration Tests** - Test Server Actions and API routes with database (Vitest + Prisma)
- **E2E Tests** - Test complete user flows in browser (Playwright)

### Quick Start

```bash
# Setup (first time only)
docker compose up -d        # Start PostgreSQL
pnpm db:generate           # Generate Prisma Client
pnpm db:push              # Push schema to database
pnpm exec playwright install chromium  # Install E2E browser

# Run tests
pnpm test                  # Unit/integration tests (watch)
pnpm test:e2e             # E2E tests
pnpm test:coverage        # Coverage report
```

**Coverage Goals**: >70% overall, 100% critical paths

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

## Code Quality

This project uses automated code quality tools:

- **ESLint** - Linting for JavaScript/TypeScript
- **Prettier** - Code formatting
- **TypeScript** - Static type checking (strict mode)
- **Husky** - Git hooks for pre-commit checks
- **Vitest** - Fast unit testing framework
- **Playwright** - Reliable E2E testing

Pre-commit hooks automatically run linting and type checking before each commit.

### CI/CD

All pull requests must pass:
- ✅ Type checking
- ✅ Linting
- ✅ Unit tests
- ✅ Integration tests
- ✅ E2E tests
- ✅ Build verification

## Development Guidelines

- Write type-safe code (avoid `any` types)
- Follow Next.js best practices
- Use Server Components by default, Client Components when needed
- Keep components focused and reusable
- Write meaningful commit messages

## License

Private project
