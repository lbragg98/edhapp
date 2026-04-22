import { z } from "zod";
import type { LibraryRecord } from "@/modules/library/domain/library-record";

export const libraryRecordViewSchema = z.object({
  holdingId: z.string(),
  entryId: z.string(),
  cardId: z.string(),
  oracleId: z.string(),
  printingId: z.string().nullable(),
  scryfallId: z.string(),
  name: z.string(),
  manaCost: z.string().nullable(),
  typeLine: z.string(),
  imageUri: z.string().nullable(),
  colorIdentity: z.array(z.string()),
  setCode: z.string().nullable(),
  setName: z.string().nullable(),
  collectorNumber: z.string().nullable(),
  finish: z.enum(["NONFOIL", "FOIL", "ETCHED"]),
  condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]),
  quantity: z.number(),
  note: z.string().nullable(),
  price: z
    .object({
      source: z.literal("scryfall"),
      capturedAt: z.string().nullable(),
      usd: z.number().nullable(),
      usdFoil: z.number().nullable(),
      usdEtched: z.number().nullable(),
      eur: z.number().nullable(),
      eurFoil: z.number().nullable(),
      tix: z.number().nullable(),
    })
    .nullable(),
});

export const libraryRecordListViewSchema = z.array(libraryRecordViewSchema);

export function toLibraryRecordListView(records: LibraryRecord[]) {
  return libraryRecordListViewSchema.parse(records);
}
