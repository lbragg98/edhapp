import type {
  AddLibraryCardInput,
  AdjustLibraryHoldingInput,
  LibraryRecord,
  NormalizedLibrarySearchInput,
} from "@/modules/library/domain/library-record";

/**
 * Repository interface for library (card collection) persistence operations.
 *
 * **Multi-User Ownership Model:**
 * - Implementations MUST be scoped to a single authenticated user via a `userId` constructor parameter.
 * - All operations only affect cards/holdings owned by the authenticated user.
 * - Each user has their own isolated collection; no cross-user data access is permitted.
 *
 * **Data Model:**
 * - A CollectionEntry represents a unique (user, card, printing) combination.
 * - A CollectionHolding represents a specific (entry, finish, condition) variant with a quantity.
 * - Multiple holdings can exist per entry (e.g., 2x NM foil + 3x LP nonfoil of the same card/printing).
 *
 * **Security Guarantees:**
 * - `list()` only returns holdings owned by the authenticated user.
 * - `add()` creates entries/holdings associated with the authenticated user.
 * - `adjust()` verifies holding ownership before quantity mutation; returns null if not owned.
 */
export interface LibraryRepository {
  /** Lists library holdings for the authenticated user, filtered by search criteria. */
  list(input: NormalizedLibrarySearchInput): Promise<LibraryRecord[]>;

  /** Adds a card to the authenticated user's library. Creates entry and holding as needed. */
  add(input: AddLibraryCardInput): Promise<LibraryRecord>;

  /** Adjusts holding quantity. Returns null if holding not found or not owned by user. */
  adjust(input: AdjustLibraryHoldingInput): Promise<LibraryRecord | null>;
}
