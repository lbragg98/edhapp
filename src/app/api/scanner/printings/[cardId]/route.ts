import { NextResponse } from "next/server";
import { ScryfallPrintingResolver } from "@/modules/scanner";
import { requireApiAppUser } from "@/server/auth";

type RouteParams = {
  params: Promise<{ cardId: string }>;
};

/**
 * GET /api/scanner/printings/[cardId]
 * 
 * Fetches all available printings for a card by its Scryfall ID.
 * Used in the scanner confirmation flow to let users select which printing to import.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  const { cardId } = await params;

  if (!cardId || cardId.length < 10) {
    return NextResponse.json({ error: "Invalid card ID." }, { status: 400 });
  }

  try {
    const resolver = new ScryfallPrintingResolver();
    const printings = await resolver.resolvePrintings(cardId);

    return NextResponse.json({ data: { printings } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch printings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
