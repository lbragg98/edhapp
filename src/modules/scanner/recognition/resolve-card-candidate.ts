import type { CardListItem } from "@/modules/catalog";
import { mapScryfallCardToListItem } from "@/modules/catalog/infrastructure/scryfall/mapper";
import {
  scryfallCardSchema,
  scryfallErrorResponseSchema,
  scryfallSearchResponseSchema,
} from "@/modules/catalog/infrastructure/scryfall/schemas";
import { normalizeOcrText } from "@/modules/scanner/ocr/normalize-ocr-text";
import { TimedCache } from "@/modules/scanner/recognition/scan-dedupe";
import { prisma } from "@/server/db/prisma";

const SCRYFALL_API_BASE = "https://api.scryfall.com";
const SCRYFALL_MIN_INTERVAL_MS = 120;
const SCRYFALL_CACHE_TTL_MS = 60_000;
const SCRYFALL_REQUEST_TIMEOUT_MS = 4_000;

type CandidateResolutionStatus = "high-confidence" | "needs-confirmation" | "failed";

export type ScannerCandidateResolution = {
  status: CandidateResolutionStatus;
  candidates: Array<{
    card: CardListItem;
    confidence: number;
    reasons: string[];
  }>;
  normalizedQuery: string;
  reason?: string;
};

const fallbackCache = new TimedCache<ScannerCandidateResolution>(SCRYFALL_CACHE_TTL_MS);
let lastScryfallRequestAt = 0;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toTokens(value: string): string[] {
  return normalizeOcrText(value)
    .toLowerCase()
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function levenshtein(left: string, right: string): number {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  const matrix = Array.from({ length: b.length + 1 }, () => Array<number>(a.length + 1).fill(0));

  for (let i = 0; i <= b.length; i += 1) matrix[i]![0] = i;
  for (let j = 0; j <= a.length; j += 1) matrix[0]![j] = j;

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  return matrix[b.length]![a.length]!;
}

function similarity(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }

  const distance = levenshtein(left, right);
  const base = Math.max(left.length, right.length);
  if (base === 0) {
    return 0;
  }

  return clamp01(1 - distance / base);
}

async function throttleScryfall(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastScryfallRequestAt;
  if (elapsed < SCRYFALL_MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, SCRYFALL_MIN_INTERVAL_MS - elapsed));
  }
  lastScryfallRequestAt = Date.now();
}

function toConfidence(
  query: string,
  candidate: CardListItem,
  extractionConfidence: number,
  sourceWeight: number,
): number {
  const score = similarity(normalizeOcrText(query), normalizeOcrText(candidate.name));
  return Number(clamp01(score * sourceWeight + extractionConfidence * (1 - sourceWeight)).toFixed(4));
}

async function fetchScryfallCardByFuzzyName(cleanedName: string): Promise<CardListItem | null> {
  await throttleScryfall();
  const url = `${SCRYFALL_API_BASE}/cards/named?fuzzy=${encodeURIComponent(cleanedName)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRYFALL_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as { name?: string } | undefined)?.name === "AbortError") {
      throw new Error("SCRYFALL_MATCH_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const json = (await response.json()) as unknown;

  if (!response.ok) {
    const parsedError = scryfallErrorResponseSchema.safeParse(json);
    if (parsedError.success) {
      console.warn("[Scanner][resolver] Scryfall fuzzy lookup failed.", {
        query: cleanedName,
        code: parsedError.data.code,
        details: parsedError.data.details,
      });
    }
    return null;
  }

  const parsedCard = scryfallCardSchema.safeParse(json);
  if (!parsedCard.success) {
    console.warn("[Scanner][resolver] Invalid fuzzy response payload.", {
      query: cleanedName,
      issues: parsedCard.error.issues,
    });
    return null;
  }

  return mapScryfallCardToListItem(parsedCard.data);
}

async function fetchScryfallSearchCandidates(cleanedName: string): Promise<CardListItem[]> {
  await throttleScryfall();
  const url = `${SCRYFALL_API_BASE}/cards/search?q=${encodeURIComponent(cleanedName)}&order=name&unique=cards`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRYFALL_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as { name?: string } | undefined)?.name === "AbortError") {
      throw new Error("SCRYFALL_MATCH_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const json = (await response.json()) as unknown;

  if (!response.ok) {
    const parsedError = scryfallErrorResponseSchema.safeParse(json);
    if (parsedError.success) {
      console.warn("[Scanner][resolver] Scryfall search lookup failed.", {
        query: cleanedName,
        code: parsedError.data.code,
        details: parsedError.data.details,
      });
    }
    return [];
  }

  const parsed = scryfallSearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.warn("[Scanner][resolver] Invalid search response payload.", {
      query: cleanedName,
      issues: parsed.error.issues,
    });
    return [];
  }

  return parsed.data.data.map(mapScryfallCardToListItem).slice(0, 8);
}

async function resolveLocalCandidates(cleanedName: string): Promise<CardListItem[]> {
  if (!prisma) {
    return [];
  }

  const tokens = toTokens(cleanedName).slice(0, 4);
  const orFilters = [
    { normalizedName: { contains: cleanedName.toLowerCase() } },
    ...tokens.map((token) => ({ normalizedName: { contains: token } })),
  ];

  const rows = await prisma.card.findMany({
    where: {
      OR: orFilters,
    },
    orderBy: [{ normalizedName: "asc" }],
    take: 24,
    select: {
      scryfallId: true,
      oracleId: true,
      name: true,
      manaCost: true,
      typeLine: true,
      oracleText: true,
      imageUriNormal: true,
      colorIdentity: true,
      cmc: true,
      legalCommander: true,
    },
  });

  return rows.map((row) => ({
    id: row.scryfallId,
    oracleId: row.oracleId,
    name: row.name,
    manaCost: row.manaCost,
    typeLine: row.typeLine,
    oracleText: row.oracleText,
    imageUri: row.imageUriNormal,
    colorIdentity: row.colorIdentity,
    cmc: Number(row.cmc),
    legalCommander: row.legalCommander,
    price: null,
  }));
}

function scoreCandidates(
  cleanedName: string,
  extractionConfidence: number,
  cards: CardListItem[],
  reason: string,
  sourceWeight: number,
): ScannerCandidateResolution["candidates"] {
  return cards
    .map((card) => ({
      card,
      confidence: toConfidence(cleanedName, card, extractionConfidence, sourceWeight),
      reasons: [reason],
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}

export async function resolveCardCandidate(input: {
  extractedText: string;
  extractionConfidence: number;
}): Promise<ScannerCandidateResolution> {
  const normalizedQuery = normalizeOcrText(input.extractedText);
  if (normalizedQuery.length < 2) {
    return {
      status: "failed",
      candidates: [],
      normalizedQuery,
      reason: "NO_TEXT",
    };
  }

  const cached = fallbackCache.get(normalizedQuery);
  if (cached) {
    return cached;
  }

  const localCandidates = await resolveLocalCandidates(normalizedQuery);
  const localRanked = scoreCandidates(
    normalizedQuery,
    input.extractionConfidence,
    localCandidates,
    "Matched against local card catalog",
    0.88,
  );

  const bestLocal = localRanked[0];
  if (bestLocal && bestLocal.confidence >= 0.9) {
    const result: ScannerCandidateResolution = {
      status: "high-confidence",
      candidates: localRanked,
      normalizedQuery,
    };
    fallbackCache.set(normalizedQuery, result);
    return result;
  }

  if (bestLocal && bestLocal.confidence >= 0.72) {
    const result: ScannerCandidateResolution = {
      status: "needs-confirmation",
      candidates: localRanked,
      normalizedQuery,
    };
    fallbackCache.set(normalizedQuery, result);
    return result;
  }

  const fuzzy = await fetchScryfallCardByFuzzyName(normalizedQuery);
  if (fuzzy) {
    const candidates = scoreCandidates(
      normalizedQuery,
      input.extractionConfidence,
      [fuzzy],
      "Matched by Scryfall fuzzy name resolution",
      0.92,
    );
    const status = (candidates[0]?.confidence ?? 0) >= 0.8 ? "high-confidence" : "needs-confirmation";
    const result: ScannerCandidateResolution = {
      status,
      candidates,
      normalizedQuery,
    };
    fallbackCache.set(normalizedQuery, result);
    return result;
  }

  const searched = await fetchScryfallSearchCandidates(normalizedQuery);
  const searchedRanked = scoreCandidates(
    normalizedQuery,
    input.extractionConfidence,
    searched,
    "Matched by Scryfall search fallback",
    0.78,
  );

  const result: ScannerCandidateResolution = {
    status: searchedRanked.length > 0 ? "needs-confirmation" : "failed",
    candidates: searchedRanked,
    normalizedQuery,
    ...(searchedRanked.length === 0 ? { reason: "CANDIDATE_MATCH_FAILED" } : {}),
  };
  fallbackCache.set(normalizedQuery, result);
  return result;
}
