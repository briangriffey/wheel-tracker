# Wheel Tracker

A Next.js application for tracking wheel options trading strategies and performance vs benchmarks.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Package Manager:** pnpm
- **Code Quality:** ESLint, Prettier
- **Git Hooks:** Husky, lint-staged

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 16 (for production use)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update the values as needed.

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

## Project Structure

```
├── app/              # Next.js App Router pages and layouts
├── components/       # Reusable React components
├── lib/             # Utility functions and shared code
├── public/          # Static assets
└── ...config files
```

## Code Quality

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for git hooks (pre-commit)
- **lint-staged** to run linters on staged files

Code is automatically linted and formatted on commit.

## TypeScript

The project uses TypeScript in strict mode for enhanced type safety.
