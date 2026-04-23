const CONTROL_AND_ZERO_WIDTH = /[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/gu;
const MULTI_WHITESPACE = /\s+/gu;

type NormalizeSearchTextOptions = {
  maxLength: number;
  collapseWhitespace?: boolean;
  unicodeForm?: "NFC" | "NFKC";
};

function sliceByCodePointLength(value: string, maxLength: number): string {
  if (maxLength <= 0) {
    return "";
  }

  const points = Array.from(value);
  if (points.length <= maxLength) {
    return value;
  }

  return points.slice(0, maxLength).join("");
}

export function normalizeSearchText(
  raw: unknown,
  options: NormalizeSearchTextOptions,
): string {
  if (typeof raw !== "string") {
    return "";
  }

  let normalized = raw;

  if (options.unicodeForm) {
    try {
      normalized = normalized.normalize(options.unicodeForm);
    } catch {
      // Ignore unicode normalization failures and continue safely.
    }
  }

  normalized = normalized.replace(CONTROL_AND_ZERO_WIDTH, " ");

  if (options.collapseWhitespace ?? true) {
    normalized = normalized.replace(MULTI_WHITESPACE, " ");
  }

  normalized = normalized.trim();
  return sliceByCodePointLength(normalized, options.maxLength);
}

export function normalizeOptionalSearchText(
  raw: unknown,
  options: NormalizeSearchTextOptions,
): string | undefined {
  const value = normalizeSearchText(raw, options);
  return value.length > 0 ? value : undefined;
}

type NormalizeIntOptions = {
  fallback: number;
  min: number;
  max: number;
};

export function normalizeIntegerParam(raw: unknown, options: NormalizeIntOptions): number {
  const source = typeof raw === "number"
    ? raw
    : typeof raw === "string"
      ? Number(raw)
      : Number.NaN;

  if (!Number.isFinite(source)) {
    return options.fallback;
  }

  const integer = Math.trunc(source);
  return Math.min(options.max, Math.max(options.min, integer));
}

export function normalizeBooleanParam(raw: unknown, fallback: boolean): boolean {
  if (typeof raw !== "string") {
    return fallback;
  }

  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  return fallback;
}

export function normalizeEnumParam<const T extends readonly string[]>(
  raw: unknown,
  values: T,
  fallback: T[number],
): T[number] {
  if (typeof raw !== "string") {
    return fallback;
  }

  return (values as readonly string[]).includes(raw) ? (raw as T[number]) : fallback;
}
