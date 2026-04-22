# Collection Foundation

## Identity Layers

- Canonical card identity: `Card` (oracle-level card data shared across the app).
- Print identity: `CardPrinting` (set/collector/finish-capable printing metadata).
- Owned identity: `CollectionEntry` + `CollectionHolding` (user-owned records and quantity buckets).

## Ownership Model

- `CollectionEntry` links a user to a card and optional printing.
- `CollectionHolding` captures quantity by `(entry, finish, condition)`.
- Notes are stored at entry level so scanner/manual flows can attach provenance context.

## Service Boundaries

- `modules/catalog`: external card discovery and detail retrieval.
- `modules/library`: persistence, ownership rules, quantity adjustment.
- `modules/selection`: source-agnostic card selection payloads for future drag/drop deckbuilder.

## Future Integrations Enabled

- Scanner imports: map scanned print IDs into `CollectionEntry` + `CollectionHolding` writes.
- Price-aware valuation: join `CollectionHolding` quantities with future price snapshots by printing.
- Deckbuilder mode switching: selection payload stays stable whether source is `all` or `library`.
