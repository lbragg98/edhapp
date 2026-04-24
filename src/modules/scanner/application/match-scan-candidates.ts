import type { CardListItem, SearchCardsService } from "@/modules/catalog";
import type { ScannerCandidateMatch } from "@/modules/scanner/domain/scanner-record";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalize(value).split(" ").filter(Boolean);
}

function overlapScore(left: string, right: string): number {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union > 0 ? overlap / union : 0;
}

function trigramScore(left: string, right: string): number {
  const a = normalize(left);
  const b = normalize(right);
  if (a.length < 3 || b.length < 3) {
    return 0;
  }

  const leftTrigrams = new Set<string>();
  const rightTrigrams = new Set<string>();

  for (let index = 0; index <= a.length - 3; index += 1) {
    leftTrigrams.add(a.slice(index, index + 3));
  }
  for (let index = 0; index <= b.length - 3; index += 1) {
    rightTrigrams.add(b.slice(index, index + 3));
  }

  if (leftTrigrams.size === 0 || rightTrigrams.size === 0) {
    return 0;
  }

  let overlap = 0;
  leftTrigrams.forEach((token) => {
    if (rightTrigrams.has(token)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(leftTrigrams.size, rightTrigrams.size);
}

function rankCandidate(card: CardListItem, queryText: string, extractionConfidence: number): ScannerCandidateMatch {
  const nameScore = overlapScore(card.name, queryText);
  const nameTrigram = trigramScore(card.name, queryText);
  const oracleScore = overlapScore(card.oracleText ?? "", queryText) * 0.3;
  const typeScore = overlapScore(card.typeLine, queryText) * 0.2;
  const combined = Math.min(
    1,
    nameScore * 0.4 + nameTrigram * 0.35 + oracleScore + typeScore + extractionConfidence * 0.15,
  );

  const reasons: string[] = [];
  if (nameScore >= 0.5 || nameTrigram >= 0.4) reasons.push("Name tokens strongly overlap extracted text");
  if (oracleScore >= 0.15) reasons.push("Rules text keywords align with OCR content");
  if (typeScore >= 0.1) reasons.push("Type line tokens align with OCR content");
  if (extractionConfidence < 0.4) reasons.push("Low OCR confidence; verify before confirming");

  return {
    card,
    confidence: Number(combined.toFixed(4)),
    reasons,
  };
}

function extractQueryCandidates(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(lines.map((line) => normalize(line)).filter(Boolean)));

  const tokenizedCandidates = tokenize(raw)
    .filter((token) => token.length >= 3)
    .slice(0, 5);

  return [...unique, ...tokenizedCandidates]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)
    .map((entry) => entry.slice(0, 80));
}

export async function matchScanCandidates(input: {
  extractedText: string;
  extractionConfidence: number;
  searchCardsService: Pick<SearchCardsService, "execute">;
}): Promise<ScannerCandidateMatch[]> {
  const queryCandidates = extractQueryCandidates(input.extractedText);
  if (queryCandidates.length === 0) {
    return [];
  }

  const fetched = new Map<string, CardListItem>();

  for (const query of queryCandidates) {
    const result = await input.searchCardsService.execute({
      query,
      pool: "all",
      commanderOnly: false,
      sort: "relevance",
      pageSize: 12,
    });

    for (const item of result.items) {
      fetched.set(item.id, item);
    }
  }

  return Array.from(fetched.values())
    .map((card) => rankCandidate(card, input.extractedText, input.extractionConfidence))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 8);
}
