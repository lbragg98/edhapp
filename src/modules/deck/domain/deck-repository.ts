import type {
  AddDeckCardInput,
  AdjustDeckCardInput,
  CreateDeckInput,
  DeckRecord,
  DeckSourceMode,
  UpdateDeckMetadataInput,
} from "@/modules/deck/domain/deck-record";

export type OwnedQuantityLookupInput = {
  cardId: string;
  printingId: string | null;
};

/**
 * Repository interface for deck persistence operations.
 *
 * **Multi-User Ownership Model:**
 * - Implementations MUST be scoped to a single authenticated user via a `userId` constructor parameter.
 * - All read operations (list, getById) only return decks owned by the authenticated user.
 * - All write operations (create, updateMetadata, addCard, adjustCard) verify user ownership before mutation.
 * - Cross-user deck access is not permitted; attempting to access another user's deck returns null.
 *
 * **Security Guarantees:**
 * - `getById()` returns null for decks not owned by the authenticated user (implicit 404).
 * - `updateMetadata()`, `addCard()`, `adjustCard()` return null if the deck is not owned by the user.
 * - `getOwnedQuantity()` only counts cards in the authenticated user's library holdings.
 */
export interface DeckRepository {
  /** Lists all decks owned by the authenticated user, ordered by most recently updated. */
  list(): Promise<DeckRecord[]>;

  /** Returns a deck by ID, or null if not found or not owned by the authenticated user. */
  getById(deckId: string): Promise<DeckRecord | null>;

  /** Creates a new deck owned by the authenticated user. */
  create(input: CreateDeckInput): Promise<DeckRecord>;

  /** Updates deck metadata. Returns null if deck not found or not owned by user. */
  updateMetadata(input: UpdateDeckMetadataInput): Promise<DeckRecord | null>;

  /** Adds a card to a deck. Returns null if deck not found or not owned by user. */
  addCard(input: AddDeckCardInput): Promise<DeckRecord | null>;

  /** Adjusts card quantity in a deck. Returns null if deck/entry not found or not owned by user. */
  adjustCard(input: AdjustDeckCardInput): Promise<DeckRecord | null>;

  /** Returns the owned quantity of a card in the authenticated user's library. */
  getOwnedQuantity(input: OwnedQuantityLookupInput): Promise<number>;

  /** Returns the preferred source mode for a deck, or null if not owned by the authenticated user. */
  getPreferredSource(deckId: string): Promise<DeckSourceMode | null>;
}
