import type { PlaytestPrintableCard } from "@/modules/playtest-pdf/domain/playtest-pdf";

export type ResolvedPrintableImage = {
  id: string;
  name: string;
  bytes: Uint8Array | null;
  mimeType: "image/jpeg" | "image/png" | null;
};

function normalizeImageModeUri(input: PlaytestPrintableCard): string | null {
  return input.imageUri;
}

function normalizeMimeType(contentType: string | null): "image/jpeg" | "image/png" | null {
  if (!contentType) {
    return null;
  }

  const lower = contentType.toLowerCase();
  if (lower.includes("image/png")) {
    return "image/png";
  }

  if (lower.includes("image/jpeg") || lower.includes("image/jpg")) {
    return "image/jpeg";
  }

  return null;
}

export async function resolvePrintableImages(cards: PlaytestPrintableCard[]): Promise<ResolvedPrintableImage[]> {
  return Promise.all(
    cards.map(async (card) => {
      const imageUrl = normalizeImageModeUri(card);

      if (!imageUrl) {
        return {
          id: card.id,
          name: card.name,
          bytes: null,
          mimeType: null,
        };
      }

      try {
        const response = await fetch(imageUrl, { cache: "force-cache" });

        if (!response.ok) {
          console.warn("[PlaytestPdf] Failed to fetch card image", {
            cardName: card.name,
            imageUrl,
            status: response.status,
          });

          return {
            id: card.id,
            name: card.name,
            bytes: null,
            mimeType: null,
          };
        }

        const mimeType = normalizeMimeType(response.headers.get("content-type"));
        const arrayBuffer = await response.arrayBuffer();

        return {
          id: card.id,
          name: card.name,
          bytes: new Uint8Array(arrayBuffer),
          mimeType,
        };
      } catch (error) {
        console.warn("[PlaytestPdf] Error resolving card image", {
          cardName: card.name,
          imageUrl,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        return {
          id: card.id,
          name: card.name,
          bytes: null,
          mimeType: null,
        };
      }
    }),
  );
}
