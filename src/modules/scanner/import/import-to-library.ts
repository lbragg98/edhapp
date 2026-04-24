import type { ScannerConfirmationResult } from "@/modules/scanner/domain/scanner-record";

export async function importScannedCardToLibrary(input: {
  scanId: string;
  cardId: string;
  printingId: string;
  cardName: string;
  setName: string;
  finish: "NONFOIL" | "FOIL" | "ETCHED";
  condition: "NM" | "LP" | "MP" | "HP" | "DMG";
  quantity: number;
}): Promise<{ result: ScannerConfirmationResult | null; error: string | null }> {
  try {
    const response = await fetch("/api/scanner/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = (await response.json()) as { data?: ScannerConfirmationResult; error?: string };

    if (!response.ok || !payload.data) {
      return { result: null, error: payload.error ?? "Failed to import scanned card." };
    }

    return { result: payload.data, error: null };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : "Failed to import scanned card.",
    };
  }
}

