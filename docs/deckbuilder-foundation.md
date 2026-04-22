# Deckbuilder Foundation

## Domain Structure

- `Deck`: metadata aggregate (name, description, notes, tags, preferred source mode).
- `DeckCardEntry`: canonical deck card membership by zone (`COMMANDER`, `MAINBOARD`) and quantity.
- `DeckTag`: deck-level tags for organization.

## Source Mode Architecture

One deckbuilder system, two source providers:
- `all`: full legal pool from Scryfall-backed catalog services.
- `library`: user-owned cards from collection services.

Both sources normalize into a shared `CardSelectionRecord` and `DeckDragCardPayload` contract.
This keeps drag/drop behavior identical regardless of source.

## Rule Enforcement Layer

Commander structure validation is handled in domain logic (`validateCommanderDeck`), not UI:
- commander presence and validity
- total card count ceiling (100)
- duplicate non-basic detection
- commander color identity constraints
- owned quantity constraints for library mode

## Analytics Integration

- Deck analytics are computed in the deck domain layer and returned with deck payloads.
- Editor mutations (`add/remove/metadata`) refresh `deck + validation + analytics` together.
- This keeps composition review embedded in the same workspace without report-page navigation.

## Extension Points

- Analytics: `DeckAnalyticsExtension`
- Recommendations: `DeckRecommendationExtension`
- Pricing overlays: `DeckPricingOverlayExtension`

These interfaces allow later features without coupling them to editor UI or mutation handlers.

## Scanner and Pricing Compatibility

- Scanner imports populate canonical card + print identities in collection.
- Deck entries reference canonical cards (and optional printings), so price overlays can join future pricing snapshots cleanly.
- Library mode quantity checks already read owned holdings, so scanner updates automatically influence deckbuilding constraints.
