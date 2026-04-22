"use client";

import { useEffect, useMemo, useState } from "react";
import { Library, Search } from "lucide-react";
import { CardSelectionGrid } from "@/components/cards";
import { AddToLibraryControls, LibraryControls } from "@/components/library/library-controls";
import { Stack } from "@/components/primitives";
import { toCardSelectionItems, type CardSearchResult, type CardSelectionItem } from "@/modules/catalog";
import {
  toLibrarySelectionItems,
  type CollectionCondition,
  type CollectionFinish,
  type LibraryRecord,
} from "@/modules/library";
import { estimateValuation } from "@/modules/pricing";
import { PriceInline, ValueEstimateChip } from "@/components/pricing";

type LibraryWorkspaceProps = {
  initialRecords: LibraryRecord[];
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);

    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

export function LibraryWorkspace({ initialRecords }: LibraryWorkspaceProps) {
  const [records, setRecords] = useState(initialRecords);
  const [query, setQuery] = useState("");
  const [finishFilter, setFinishFilter] = useState<CollectionFinish | "ALL">("ALL");
  const [conditionFilter, setConditionFilter] = useState<CollectionCondition | "ALL">("ALL");

  const [addQuery, setAddQuery] = useState("");
  const [addQuantity, setAddQuantity] = useState(1);
  const [addFinish, setAddFinish] = useState<CollectionFinish>("NONFOIL");
  const [addCondition, setAddCondition] = useState<CollectionCondition>("NM");
  const [addNote, setAddNote] = useState("");

  const [searchResults, setSearchResults] = useState<CardSearchResult>({
    items: [],
    hasMore: false,
    nextPage: null,
    total: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 180);
  const debouncedAddQuery = useDebouncedValue(addQuery, 180);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("query", debouncedQuery);
    if (finishFilter !== "ALL") params.set("finish", finishFilter);
    if (conditionFilter !== "ALL") params.set("condition", conditionFilter);

    fetch(`/api/library?${params.toString()}`)
      .then((response) => response.json())
      .then((payload: { data: LibraryRecord[] }) => {
        setRecords(payload.data);
      })
      .catch(() => {
        setRecords([]);
      });
  }, [debouncedQuery, finishFilter, conditionFilter]);

  useEffect(() => {
    if (!debouncedAddQuery || debouncedAddQuery.length < 2) {
      return;
    }

    const params = new URLSearchParams({
      query: debouncedAddQuery,
      pool: "all",
      commanderOnly: "false",
      pageSize: "12",
      sort: "relevance",
    });

    fetch(`/api/cards?${params.toString()}`)
      .then((response) => response.json())
      .then((payload: { data: CardSearchResult }) => {
        setSearchResults(payload.data);
      })
      .catch(() => {
        setSearchResults({ items: [], hasMore: false, nextPage: null, total: 0 });
      });
  }, [debouncedAddQuery]);

  const libraryItems = useMemo(() => toLibrarySelectionItems(records), [records]);
  const addItems = useMemo(
    () => toCardSelectionItems(debouncedAddQuery.length < 2 ? [] : searchResults.items),
    [debouncedAddQuery, searchResults.items],
  );
  const collectionEstimate = useMemo(
    () =>
      estimateValuation(
        records.map((record) => ({
          quantity: record.quantity,
          finish: record.finish,
          price: record.price,
        })),
      ),
    [records],
  );

  async function refreshLibrary() {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (finishFilter !== "ALL") params.set("finish", finishFilter);
    if (conditionFilter !== "ALL") params.set("condition", conditionFilter);

    const payload = (await (await fetch(`/api/library?${params.toString()}`)).json()) as {
      data: LibraryRecord[];
    };

    setRecords(payload.data);
  }

  async function mutateHolding(holdingId: string, delta: number) {
    await fetch(`/api/library/holdings/${holdingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });

    await refreshLibrary();
  }

  async function addCard(item: CardSelectionItem) {
    setIsSubmitting(true);

    await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scryfallCardId: item.id,
        quantity: addQuantity,
        finish: addFinish,
        condition: addCondition,
        note: addNote || undefined,
      }),
    });

    await refreshLibrary();
    setIsSubmitting(false);
  }

  return (
    <Stack size="lg">
      <LibraryControls
        query={query}
        finish={finishFilter}
        condition={conditionFilter}
        onQueryChange={setQuery}
        onFinishChange={setFinishFilter}
        onConditionChange={setConditionFilter}
      />

      <div className="flex justify-end">
        <ValueEstimateChip label="Collection Value" estimate={collectionEstimate} />
      </div>

      <CardSelectionGrid
        items={libraryItems}
        getHref={(item) => `/cards/${item.selection.scryfallId}?pool=library`}
        emptyIcon={<Library size={24} />}
        emptyTitle="Your library is empty"
        emptyDescription="Search for cards below and add them to build your personal collection. Track owned quantities, conditions, and finishes for deckbuilding."
        renderFooter={(item) => {
          const quantity = item.selection.availableQuantity ?? 0;
          const record = records.find((entry) => entry.holdingId === item.id);

          return (
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--text-subtle)]">
                Qty {quantity}
                {record ? ` | ${record.finish} | ${record.condition}` : ""}
              </div>
              <PriceInline price={record?.price ?? null} finish={record?.finish ?? "NONFOIL"} />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => mutateHolding(item.id, -1)}
                >
                  -1
                </button>
                <button
                  type="button"
                  className="nav-link nav-link-active"
                  onClick={() => mutateHolding(item.id, 1)}
                >
                  +1
                </button>
              </div>
            </div>
          );
        }}
      />

      <AddToLibraryControls
        addQuery={addQuery}
        quantity={addQuantity}
        finish={addFinish}
        condition={addCondition}
        note={addNote}
        isSubmitting={isSubmitting}
        onAddQueryChange={setAddQuery}
        onQuantityChange={setAddQuantity}
        onFinishChange={setAddFinish}
        onConditionChange={setAddCondition}
        onNoteChange={setAddNote}
      />

      <CardSelectionGrid
        items={addItems}
        getHref={(item) => `/cards/${item.id}?pool=all`}
        emptyIcon={<Search size={24} />}
        emptyTitle="Search cards to add"
        emptyDescription="Type at least two characters above to search the Scryfall card database."
        renderFooter={(item) => (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[color:var(--text-subtle)]">Add with current finish/condition settings</p>
            <button
              type="button"
              className="nav-link nav-link-active"
              onClick={() => addCard(item)}
              disabled={isSubmitting}
            >
              Add to Library
            </button>
          </div>
        )}
      />
    </Stack>
  );
}
