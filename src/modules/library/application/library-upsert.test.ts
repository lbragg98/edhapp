import { describe, expect, it } from "vitest";
import { AddLibraryCardService } from "@/modules/library/application/library-services";
import type { LibraryRepository } from "@/modules/library/domain/library-repository";
import type { AddLibraryCardInput, LibraryRecord, NormalizedLibrarySearchInput } from "@/modules/library/domain/library-record";

class InMemoryUpsertLibraryRepository implements LibraryRepository {
  private quantity = 0;

  async list(input: NormalizedLibrarySearchInput): Promise<LibraryRecord[]> {
    void input;
    return [];
  }

  async add(input: AddLibraryCardInput): Promise<LibraryRecord> {
    this.quantity += input.quantity ?? 1;
    return {
      holdingId: "holding-1",
      entryId: "entry-1",
      cardId: "card-1",
      oracleId: "oracle-1",
      printingId: "printing-1",
      scryfallId: input.scryfallCardId,
      name: "Sol Ring",
      manaCost: "{1}",
      typeLine: "Artifact",
      imageUri: null,
      colorIdentity: [],
      setCode: "CMM",
      setName: "Commander Masters",
      collectorNumber: "1",
      finish: input.finish ?? "NONFOIL",
      condition: input.condition ?? "NM",
      quantity: this.quantity,
      note: input.note ?? null,
      price: null,
    };
  }

  async adjust(): Promise<LibraryRecord | null> {
    return null;
  }
}

describe("AddLibraryCardService", () => {
  it("supports idempotent import upsert semantics by incrementing quantity", async () => {
    const repository = new InMemoryUpsertLibraryRepository();
    const service = new AddLibraryCardService(repository);

    const first = await service.execute({
      scryfallCardId: "card-1",
      quantity: 1,
      finish: "NONFOIL",
      condition: "NM",
    });
    const second = await service.execute({
      scryfallCardId: "card-1",
      quantity: 1,
      finish: "NONFOIL",
      condition: "NM",
    });

    expect(first?.quantity).toBe(1);
    expect(second?.quantity).toBe(2);
  });
});
