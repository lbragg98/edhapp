import "dotenv/config";
import { runDbCheck, runOcrCheck, runScryfallMatchCheck } from "../src/server/dev/diagnostics-checks";
import { prisma } from "../src/server/db/prisma";
import { createDeckService } from "../src/modules/deck";
import { createAddLibraryCardService } from "../src/modules/library";
import { scryfallCardSchema } from "../src/modules/catalog/infrastructure/scryfall/schemas";
import { shutdownSharedOcrWorker } from "../src/modules/scanner/ocr/ocr-worker";

async function resolveDevUserId() {
  if (!prisma) return null;
  const user = await prisma.appUser.upsert({
    where: { email: "dev-diagnostics@local.test" },
    update: { displayName: "Dev Diagnostics User" },
    create: { email: "dev-diagnostics@local.test", displayName: "Dev Diagnostics User", authUserId: null },
    select: { id: true },
  });
  return user.id;
}

async function resolveDefaultScryfallCardId() {
  const response = await fetch("https://api.scryfall.com/cards/named?exact=Sol%20Ring", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Could not resolve Sol Ring (${response.status}).`);
  }
  const json = (await response.json()) as unknown;
  return scryfallCardSchema.parse(json).id;
}

async function main() {
  let checks: {
    db: Awaited<ReturnType<typeof runDbCheck>>;
    ocr: Awaited<ReturnType<typeof runOcrCheck>>;
    scryfall: Awaited<ReturnType<typeof runScryfallMatchCheck>>;
  };
  try {
    checks = {
      db: await runDbCheck(),
      ocr: await runOcrCheck(),
      scryfall: await runScryfallMatchCheck("Mana Geyser"),
    };
    console.log("[checks]", JSON.stringify(checks, null, 2));

    const userId = await resolveDevUserId();
    if (!userId) {
      throw new Error("No Prisma user available for service tests.");
    }

    const deckService = createDeckService(userId);
    if (!deckService) {
      throw new Error("Deck service unavailable.");
    }
    const createdDeck = await deckService.create({
      name: `Service Test Deck ${new Date().toISOString()}`,
      sourceMode: "all",
    });
    const loadedDeck = await deckService.getById(createdDeck.deck.id);
    console.log("[deck]", {
      createdDeckId: createdDeck.deck.id,
      loadedDeckId: loadedDeck?.deck.id ?? null,
    });

    const libraryService = createAddLibraryCardService(userId);
    const scryfallCardId = await resolveDefaultScryfallCardId();
    const first = await libraryService.execute({ scryfallCardId, quantity: 1, finish: "NONFOIL", condition: "NM" });
    const second = await libraryService.execute({ scryfallCardId, quantity: 1, finish: "NONFOIL", condition: "NM" });
    console.log("[library]", {
      scryfallCardId,
      firstQuantity: first?.quantity ?? null,
      secondQuantity: second?.quantity ?? null,
    });

    const ok = Boolean(checks.db.ok && checks.scryfall.ok && loadedDeck && first && second);
    if (!ok) {
      process.exitCode = 1;
    }
  } finally {
    await shutdownSharedOcrWorker();
  }
}

void main().catch((error) => {
  console.error("[test:services] failed", error);
  process.exitCode = 1;
});
