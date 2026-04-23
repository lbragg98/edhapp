# Command Tower

Premium, production-grade Magic: The Gathering Commander (EDH) companion app foundation.

## Stack

- Next.js (App Router)
- TypeScript (`strict`)
- Tailwind + shadcn/ui
- Prisma + Postgres
- Zod validation
- Vitest for service tests

## Product Rules

Global UX and architecture constraints are defined in [docs/global-product-rules.md](./docs/global-product-rules.md).

## Architecture

See [docs/architecture.md](./docs/architecture.md).

## Implemented Slices

- `Card Browser`: Scryfall-backed search + detail (`/cards`, `/cards/[cardId]`)
- `Collection Foundation`: personal library model + flows (`/library`)
- `Deckbuilder Foundation`: source-switchable Commander deck editor (`/decks`, `/decks/[deckId]`)

Deckbuilder currently supports:
- commander and mainboard editing
- drag/drop add flow
- source mode switching (`all` vs `library`)
- deck metadata/tags/notes editing
- domain-level Commander validation

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

Set both:
- `DATABASE_URL`: pooled/runtime connection string used by the app
- `DIRECT_URL`: direct Postgres connection string used by Prisma migrations

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Apply schema migrations:

```bash
npm run prisma:migrate:dev
```

For production deploys:

```bash
npm run prisma:migrate:deploy
```

If production already has the schema from manual SQL and no `_prisma_migrations` history yet, baseline once:

```bash
npm run prisma:migrate:baseline:init
```

Then future deploys can use:

```bash
npm run prisma:migrate:deploy
```

5. Run dev server:

```bash
npm run dev
```

## Quality Commands

```bash
npm run lint
npm run test
npm run build
```
