# PeerSkill

Phase 0 engineering foundation for the PeerSkill local-first application.

## Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui foundation
- Prisma
- SQLite
- Vitest

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Create the local database and Prisma client:

```bash
npm run prisma:migrate
```

4. Start the development server:

```bash
npm run dev
```

## Commands

- `npm run dev` starts the local development server.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript checks.
- `npm run test` runs the test suite once.
- `npm run test:watch` runs tests in watch mode.
- `npm run prisma:generate` regenerates the Prisma client.
- `npm run prisma:migrate` creates and applies the local Prisma migration.
- `npm run db:reset` resets the local database through Prisma.

## Scope

This repository currently targets Phase 0 only:

- project structure
- UI foundation
- Prisma and SQLite setup
- environment configuration
- error handling foundation
- testing foundation

No Phase 1 or later product functionality is implemented here.
