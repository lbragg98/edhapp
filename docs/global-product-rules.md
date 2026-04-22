# Global Product Rules

These are non-optional UX and architecture constraints for the entire app.

## Design and UX

- Keep visuals sleek, restrained, and professional.
- Keep backgrounds subdued and non-distracting; avoid bright or noisy backdrops.
- Use subtle depth and clean surfaces over decorative textures.
- Prioritize readability and long-session comfort.
- Keep typography modern, consistent, and highly legible.
- Preserve clear contrast boundaries between text, borders, highlights, and surfaces.
- Avoid oversaturated accents and harsh contrast spikes.
- Maintain a premium, calm, elegant visual tone.

## Interaction Rules

- Minimize blocking loading screens.
- Avoid unnecessary full-page transitions.
- Prefer persistent layouts, side panels, inline expansion, tabs, drawers, and modals.
- Preserve user context while browsing cards, editing decks, checking prices, and viewing rulings.
- Favor fast-feeling interactions through partial updates.
- Use skeletons, optimistic updates, prefetching, and incremental rendering where useful.

## Architecture Implications

- Navigation/state must support shared layouts where search, detail, and editing co-exist.
- Favor reusable panels and composable workspaces over isolated feature pages.
- Build toward a premium desktop-app interaction model, especially for deckbuilding and collection.
- Keep business/domain logic out of UI components.

## Implementation Notes

- New features should default to in-place panel transitions before route navigation.
- Data-loading UX should avoid blank states during refresh.
- Any visual changes should preserve restrained color and low-noise surface hierarchy.
