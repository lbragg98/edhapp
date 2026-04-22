import { z } from "zod";
import type { LibraryRepository } from "@/modules/library/domain/library-repository";
import type { LibraryRecord, LibrarySearchInput } from "@/modules/library/domain/library-record";
import { normalizeLibrarySearchInput } from "@/modules/library/application/library-search-input";

const DEFAULT_EMPTY: LibraryRecord[] = [];

export class ListLibraryCardsService {
  constructor(private readonly repository: LibraryRepository | null) {}

  async execute(input: LibrarySearchInput): Promise<LibraryRecord[]> {
    if (!this.repository) {
      return DEFAULT_EMPTY;
    }

    const normalized = normalizeLibrarySearchInput(input);
    try {
      return await this.repository.list(normalized);
    } catch (error) {
      console.error("[Library] Failed to list cards.", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return DEFAULT_EMPTY;
    }
  }
}

const addLibraryCardSchema = z.object({
  scryfallCardId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(250).default(1),
  finish: z.enum(["NONFOIL", "FOIL", "ETCHED"]).default("NONFOIL"),
  condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]).default("NM"),
  note: z.string().trim().max(250).optional(),
});

export class AddLibraryCardService {
  constructor(private readonly repository: LibraryRepository | null) {}

  async execute(input: unknown): Promise<LibraryRecord | null> {
    if (!this.repository) {
      return null;
    }

    const parsed = addLibraryCardSchema.parse(input);

    return this.repository.add({
      scryfallCardId: parsed.scryfallCardId,
      quantity: parsed.quantity,
      finish: parsed.finish,
      condition: parsed.condition,
      ...(parsed.note ? { note: parsed.note } : {}),
    });
  }
}

const adjustLibraryHoldingSchema = z.object({
  holdingId: z.string().trim().min(1),
  delta: z.number().int().min(-250).max(250).refine((value) => value !== 0),
});

export class AdjustLibraryHoldingService {
  constructor(private readonly repository: LibraryRepository | null) {}

  async execute(input: unknown): Promise<LibraryRecord | null> {
    if (!this.repository) {
      return null;
    }

    const parsed = adjustLibraryHoldingSchema.parse(input);

    return this.repository.adjust(parsed);
  }
}
