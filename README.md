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

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript compiler checks
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

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

## Code Quality

This project uses automated code quality tools:

- **ESLint** - Linting for JavaScript/TypeScript
- **Prettier** - Code formatting
- **TypeScript** - Static type checking (strict mode)
- **Husky** - Git hooks for pre-commit checks

Pre-commit hooks automatically run linting and type checking before each commit.

## Development Guidelines

- Write type-safe code (avoid `any` types)
- Follow Next.js best practices
- Use Server Components by default, Client Components when needed
- Keep components focused and reusable
- Write meaningful commit messages

## License

Private project
