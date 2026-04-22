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

export interface DeckRepository {
  list(): Promise<DeckRecord[]>;
  getById(deckId: string): Promise<DeckRecord | null>;
  create(input: CreateDeckInput): Promise<DeckRecord>;
  updateMetadata(input: UpdateDeckMetadataInput): Promise<DeckRecord | null>;
  addCard(input: AddDeckCardInput): Promise<DeckRecord | null>;
  adjustCard(input: AdjustDeckCardInput): Promise<DeckRecord | null>;
  getOwnedQuantity(input: OwnedQuantityLookupInput): Promise<number>;
  getPreferredSource(deckId: string): Promise<DeckSourceMode | null>;
}
