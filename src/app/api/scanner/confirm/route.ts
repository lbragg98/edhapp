import { NextResponse } from "next/server";
import { z } from "zod";
import type { ScannerConfirmationResult } from "@/modules/scanner";
import { createAddLibraryCardService } from "@/modules/library";
import { scryfallCardSchema } from "@/modules/catalog/infrastructure/scryfall/schemas";
import { requireApiAppUser } from "@/server/auth";

const SCRYFALL_API_BASE = "https://api.scryfall.com";

const confirmInputSchema = z.object({
  scanId: z.string().min(1),
  cardId: z.string().min(1),
  printingId: z.string().min(1),
  finish: z.enum(["NONFOIL", "FOIL", "ETCHED"]),
  condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]),
  quantity: z.number().int().min(1).max(250),
  cardName: z.string().optional(),
  setName: z.string().optional(),
});

/**
 * POST /api/scanner/confirm
 * 
 * Confirms a scanned card and imports it to the user's library.
 * Accepts the user's printing, finish, condition, and quantity selections.
 */
export async function POST(request: Request) {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = confirmInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { scanId, cardId, printingId, finish, condition, quantity, cardName, setName } = parsed.data;

  try {
    const [selectedCard, selectedPrinting] = await Promise.all([
      fetchScryfallCard(cardId),
      fetchScryfallCard(printingId),
    ]);

    const selectedCardOracleId = selectedCard.oracle_id ?? selectedCard.id;
    const selectedPrintingOracleId = selectedPrinting.oracle_id ?? selectedPrinting.id;
    if (selectedCardOracleId !== selectedPrintingOracleId) {
      return NextResponse.json(
        { error: "Selected printing does not match selected card." },
        { status: 400 },
      );
    }

    const addService = createAddLibraryCardService(auth.appUser.appUserId);
    const result = await addService.execute({
      scryfallCardId: printingId,
      quantity,
      finish,
      condition,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to add card to library. Database may be unavailable." },
        { status: 500 },
      );
    }

    const confirmationResult: ScannerConfirmationResult = {
      scanId,
      holdingId: result.holdingId,
      cardName: cardName ?? result.name,
      setName: setName ?? result.setName ?? "Unknown Set",
      finish,
      condition,
      quantity,
    };

    return NextResponse.json({ data: confirmationResult });
  } catch (error) {
    console.error("[Scanner][confirm] Failed to import scanned card.", {
      userId: auth.appUser.appUserId,
      scanId,
      cardId,
      printingId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    const message = error instanceof Error ? error.message : "Failed to import card.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchScryfallCard(cardId: string) {
  const response = await fetch(`${SCRYFALL_API_BASE}/cards/${cardId}`, {
    headers: {
      "User-Agent": "CommandTower/0.1 (https://example.com)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Unable to resolve Scryfall card ${cardId}.`);
  }

  const json = (await response.json()) as unknown;
  return scryfallCardSchema.parse(json);
}
