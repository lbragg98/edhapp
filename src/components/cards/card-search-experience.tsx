"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CardSearchControls } from "@/components/cards/card-search-controls";
import { CardSelectionGrid } from "@/components/cards/card-selection-grid";
import { Stack } from "@/components/primitives";
import type { CardSearchResult } from "@/modules/catalog";
import {
  normalizeCardSearchParams,
  parseCardSearchResultResponse,
  toCardSelectionItems,
} from "@/modules/catalog";

type CardSearchExperienceProps = {
  initialResult: CardSearchResult;
  initialQuery: string;
  initialTypeLine: string;
  initialCommanderOnly: boolean;
  initialSort: "relevance" | "name" | "released";
  initialPool: "all" | "library";
  initialColors: string[];
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);

    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

export function CardSearchExperience({
  initialResult,
  initialQuery,
  initialTypeLine,
  initialCommanderOnly,
  initialSort,
  initialPool,
  initialColors,
}: CardSearchExperienceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [typeLine, setTypeLine] = useState(initialTypeLine);
  const [commanderOnly, setCommanderOnly] = useState(initialCommanderOnly);
  const [sort, setSort] = useState<"relevance" | "name" | "released">(initialSort);
  const [pool, setPool] = useState<"all" | "library">(initialPool);
  const [colors, setColors] = useState<string[]>(initialColors);
  const [result, setResult] = useState<CardSearchResult>(initialResult);
  const [isLoading, setIsLoading] = useState(false);
  const requestSequenceRef = useRef(0);

  const debouncedQuery = useDebouncedValue(query, 180);
  const debouncedTypeLine = useDebouncedValue(typeLine, 180);
  const debouncedColors = useDebouncedValue(colors, 180);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramsForRequest = useMemo(
    () =>
      normalizeCardSearchParams(
        {
          query: debouncedQuery,
          typeLine: debouncedTypeLine,
          commanderOnly: String(commanderOnly),
          sort,
          pool,
          colors: debouncedColors,
        },
        "card_search_experience",
        { defaultCommanderOnly: true, defaultPool: "all", defaultSort: "relevance", defaultPage: 1, defaultPageSize: 18 },
      ),
    [debouncedQuery, debouncedTypeLine, commanderOnly, sort, pool, debouncedColors],
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (paramsForRequest.query) params.set("query", paramsForRequest.query);
    else params.delete("query");

    if (paramsForRequest.typeLine) params.set("typeLine", paramsForRequest.typeLine);
    else params.delete("typeLine");

    params.set("commanderOnly", String(paramsForRequest.commanderOnly));
    params.set("sort", paramsForRequest.sort);
    params.set("pool", paramsForRequest.pool);

    if (paramsForRequest.colors.length > 0) params.set("colors", paramsForRequest.colors.join(","));
    else params.delete("colors");

    const nextQueryString = params.toString();
    if (nextQueryString !== searchParams.toString()) {
      router.replace(`${pathname}?${nextQueryString}`, { scroll: false });
    }
  }, [paramsForRequest, pathname, router, searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const requestSequence = ++requestSequenceRef.current;

    async function run() {
      setIsLoading(true);

      const requestParams = new URLSearchParams();
      requestParams.set("query", paramsForRequest.query);
      requestParams.set("typeLine", paramsForRequest.typeLine);
      requestParams.set("commanderOnly", String(paramsForRequest.commanderOnly));
      requestParams.set("sort", paramsForRequest.sort);
      requestParams.set("pool", paramsForRequest.pool);
      requestParams.set("pageSize", String(paramsForRequest.pageSize));
      if (paramsForRequest.colors.length > 0) {
        requestParams.set("colors", paramsForRequest.colors.join(","));
      }

      const response = await fetch(`/api/cards?${requestParams.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        if (requestSequence !== requestSequenceRef.current) {
          return;
        }
        setIsLoading(false);
        return;
      }

      const payload = await response.json();
      const parsed = parseCardSearchResultResponse(payload, "card_search_experience");
      if (!parsed) {
        if (requestSequence !== requestSequenceRef.current) {
          return;
        }
        setIsLoading(false);
        return;
      }

      if (requestSequence === requestSequenceRef.current) {
        setResult(parsed);
        setIsLoading(false);
      }
    }

    run().catch((error) => {
      if ((error as { name?: string } | undefined)?.name === "AbortError") {
        return;
      }

      if (requestSequence === requestSequenceRef.current) {
        setIsLoading(false);
      }
    });

    return () => controller.abort();
  }, [paramsForRequest]);

  const selectionItems = useMemo(() => toCardSelectionItems(result.items), [result.items]);

  function toggleColor(value: string) {
    setColors((current) =>
      current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value],
    );
  }

  return (
    <Stack size="md">
      <CardSearchControls
        query={query}
        typeLine={typeLine}
        commanderOnly={commanderOnly}
        sort={sort}
        pool={pool}
        colors={colors}
        onQueryChange={setQuery}
        onTypeLineChange={setTypeLine}
        onCommanderOnlyChange={setCommanderOnly}
        onSortChange={setSort}
        onPoolChange={setPool}
        onToggleColor={toggleColor}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="type-label">{isLoading ? "Refreshing results..." : `${result.items.length} cards`}</p>
          <p className="text-xs text-[color:var(--text-subtle)]">
            {pool === "library" ? "Sourced from your owned collection" : "All cards via Scryfall"}
          </p>
        </div>

        <CardSelectionGrid
          items={selectionItems}
          getHref={(item) => `/cards/${item.id}?pool=${pool}`}
          emptyTitle={pool === "library" ? "No library cards yet" : "No cards matched your filters"}
          emptyDescription={
            pool === "library"
              ? "Add cards to your library to search your owned pool."
              : "Try broadening your search text or removing one filter."
          }
        />
      </section>
    </Stack>
  );
}
