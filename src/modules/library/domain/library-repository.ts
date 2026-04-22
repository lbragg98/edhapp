import type {
  AddLibraryCardInput,
  AdjustLibraryHoldingInput,
  LibraryRecord,
  NormalizedLibrarySearchInput,
} from "@/modules/library/domain/library-record";

export interface LibraryRepository {
  list(input: NormalizedLibrarySearchInput): Promise<LibraryRecord[]>;
  add(input: AddLibraryCardInput): Promise<LibraryRecord>;
  adjust(input: AdjustLibraryHoldingInput): Promise<LibraryRecord | null>;
}
