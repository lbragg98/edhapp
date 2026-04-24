const OCR_CONFUSABLES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /[\u2018\u2019\u0060]/g, replacement: "'" },
  { pattern: /[\u201C\u201D]/g, replacement: "\"" },
  { pattern: /[\u2013\u2014]/g, replacement: "-" },
  { pattern: /\bRlng\b/gi, replacement: "Ring" },
  { pattern: /\bBoit\b/gi, replacement: "Bolt" },
  { pattern: /\bThlef\b/gi, replacement: "Thief" },
];

function stripDiacritics(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSymbols(value: string): string {
  return value.replace(/[|[\]{}<>]/g, " ").replace(/[^a-zA-Z0-9,'\- ]/g, " ");
}

export function normalizeOcrText(input: string): string {
  let normalized = stripDiacritics(input);

  for (const rule of OCR_CONFUSABLES) {
    normalized = normalized.replace(rule.pattern, rule.replacement);
  }

  normalized = normalizeSymbols(normalized);
  normalized = normalizeWhitespace(normalized);

  if (normalized.length > 120) {
    normalized = normalized.slice(0, 120).trim();
  }

  return normalized;
}

export function extractLikelyCardName(input: string): string {
  const normalized = normalizeOcrText(input);
  if (!normalized) {
    return "";
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  const best = lines
    .map((line) => line.replace(/\b(legendary|creature|artifact|sorcery|instant|enchantment|planeswalker)\b.*/i, ""))
    .map((line) => normalizeWhitespace(line))
    .find((line) => line.length >= 2);

  return (best ?? lines[0] ?? "").slice(0, 64);
}

