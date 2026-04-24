type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class TimedCache<T> {
  private readonly map = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}

export class ScanDedupe {
  private readonly recentlySeen = new TimedCache<number>(5_000);

  seenRecently(cardId: string): boolean {
    const previous = this.recentlySeen.get(cardId);
    this.recentlySeen.set(cardId, Date.now());
    return previous !== null;
  }
}

