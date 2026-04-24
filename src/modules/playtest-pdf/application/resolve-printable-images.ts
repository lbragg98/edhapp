import type { PlaytestPrintableCard } from "@/modules/playtest-pdf/domain/playtest-pdf";
import sharp from "sharp";

const TARGET_CARD_ASPECT = 63 / 88;
const TARGET_WIDTH_PX = 1260;
const TARGET_HEIGHT_PX = Math.round(TARGET_WIDTH_PX / TARGET_CARD_ASPECT);

export type ResolvedPrintableImage = {
  id: string;
  name: string;
  bytes: Uint8Array | null;
  mimeType: "image/jpeg" | "image/png" | null;
};

async function normalizePrintableImage(bytes: Uint8Array): Promise<{
  bytes: Uint8Array;
  mimeType: "image/jpeg";
}> {
  const buffer = Buffer.from(bytes);
  const processed = await sharp(buffer)
    // Ensure the rendered image always fills card box (no internal letterboxing).
    .resize(TARGET_WIDTH_PX, TARGET_HEIGHT_PX, {
      fit: "cover",
      position: "attention",
      withoutEnlargement: false,
    })
    .jpeg({
      quality: 92,
      chromaSubsampling: "4:4:4",
      mozjpeg: true,
    })
    .toBuffer();

  return {
    bytes: new Uint8Array(processed),
    mimeType: "image/jpeg",
  };
}

function normalizeImageModeUri(input: PlaytestPrintableCard): string | null {
  return input.imageUri;
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

        const arrayBuffer = await response.arrayBuffer();
        const normalized = await normalizePrintableImage(new Uint8Array(arrayBuffer));

        return {
          id: card.id,
          name: card.name,
          bytes: normalized.bytes,
          mimeType: normalized.mimeType,
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
