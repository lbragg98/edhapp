# Command Tower Architecture

## 1) System Architecture

- Framework layer: Next.js App Router for server-first rendering and route handlers.
- Interface layer: React UI components and page composition only. No business rules.
- Application layer: use-case services (input normalization, orchestration, policy checks).
- Domain layer: core EDH concepts and contracts (card models, deck models, analytics concepts).
- Infrastructure layer: Prisma repositories, external API adapters (Scryfall, pricing providers), scanner adapters.
- Data layer: Postgres with Prisma schema as canonical persistence contract.

### Request Flow

UI/Page -> Application Service -> Domain Contract -> Repository Interface -> Prisma Adapter -> Postgres

External integrations follow the same flow through adapter boundaries.

### Interaction Architecture

- Prefer persistent workspace layouts over page-to-page churn.
- Keep source panels, detail panels, and editors composable in shared shells.
- Favor partial updates and in-place state transitions over blocking full-page reloads.

## 2) Folder Structure

```text
src/
  app/                       # Next.js routes, layouts, and API handlers
    api/
      cards/
  components/                # Presentational + design system composition
    catalog/
    layout/
    ui/
  modules/
    catalog/                 # First bounded context slice
      domain/
      application/
      infrastructure/
      presentation/
  server/
    config/                  # env and runtime configuration
    db/                      # prisma client lifecycle

prisma/
  schema.prisma

docs/
  architecture.md
```

## 3) Core Domain Boundaries

- Catalog: normalized card identity + printings + legality + searchable metadata.
- Decks: user deck construction, commander identity, deck composition constraints.
- Analytics: mana curve, color balance, role classification, consistency heuristics.
- Synergy/Combos: relationship graph, pattern matching, recommendation scoring.
- Collection/Budget: owned inventory, desired inventory, price snapshots, spend constraints.
- Gameplay Tools: life tracker, turn order, commander damage, poison/energy counters.
- Rules/Reference: rulings snapshots, oracle updates, card detail knowledge views.

Each bounded context owns its domain models and repository contracts; cross-context interaction occurs through explicit application services.

## 4) Database Schema Direction (High-Level)

Implemented:
- Card and CardPrinting for canonical and print identity.
- AppUser, CollectionEntry, CollectionHolding for owned library.
- Deck, DeckTag, DeckCardEntry for deckbuilding foundation.

Deferred:
- price snapshots and valuation overlays
- playtest sessions
- recommendation/synergy graph tables
- rulings persistence layer

## 5) Design System Direction

- Visual language: premium dark interface with restrained cool highlights and layered depth.
- Typography: high-contrast modern sans stack with JetBrains Mono for technical accents.
- Tokens: semantic CSS variables for surfaces, typography, spacing rhythm, and accents.
- Components: shadcn/ui primitives customized through token system.
- Motion: subtle elevation and opacity transitions on interaction; avoid noisy animation.
- Layout: spacious, grid-based card presentation with strong content hierarchy.

## 6) Active Slices

- Card Browser: Scryfall-backed search and detail.
- Collection Foundation: personal library add/list/adjust flows.
- Deckbuilder Foundation: source-switchable editor (`all` vs `library`) with Commander validation.

## 7) Implementation Notes

- Business logic is centralized in `modules/catalog/application`.
- Data access is isolated in module-level infrastructure repositories.
- UI consumes service outputs only, with validation and rule enforcement in domain/application layers.
- Zod guards request/service boundaries.
- Source-provider architecture unifies card selection for both deck modes.
