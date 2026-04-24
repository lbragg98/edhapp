"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DeckIntelligenceReport,
  DeckPlaytestReport,
  DeckRecord,
  DeckUpgradeMode,
  DeckUpgradeReport,
  DeckValidationReport,
} from "@/modules/deck";
import type { CardSelectionRecord, DeckDragCardPayload } from "@/modules/selection";
import { DeckReviewPanel } from "@/components/decks/deck-review-panel";
import type { DeckAnalyticsReport } from "@/modules/deck";
import { estimateValuation } from "@/modules/pricing";
import { PriceInline, ValueEstimateChip } from "@/components/pricing";
import { CardPreviewThumbnail } from "@/components/cards/card-preview";
import { parseDeckSourceResultResponse } from "@/modules/deckbuilder";
import { normalizeSearchText } from "@/modules/search";
import { parseDeckWorkspaceResponse } from "@/modules/deck";

type CardColor = "W" | "U" | "B" | "R" | "G";
const TYPE_FILTERS = ["Any", "Land", "Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker"] as const;

type SourceDragPayload = {
  items: DeckDragCardPayload[];
};

type PanelFilters = {
  type: (typeof TYPE_FILTERS)[number];
  maxCmc: number | null;
  color: CardColor | null;
};

type DeckEditorWorkspaceProps = {
  initialDeck: DeckRecord;
  initialValidation: DeckValidationReport;
  initialAnalytics: DeckAnalyticsReport;
  initialIntelligence: DeckIntelligenceReport;
};
type WorkspaceView = "deckbuilder" | "analytics" | "playtest" | "upgrades";
type MobileDeckTab = "deck" | "add" | "suggestions" | "stats" | "settings";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

function parseApproximateCmc(manaCost: string | null): number {
  if (!manaCost) return 0;
  const matches = manaCost.match(/\{([^}]+)\}/g);
  if (!matches) return 0;
  return matches.reduce((sum, token) => {
    const value = token.replace(/[{}]/g, "");
    if (/^\d+$/.test(value)) return sum + Number(value);
    if (value === "X") return sum;
    return sum + 1;
  }, 0);
}

function matchesFilters(input: { typeLine: string; manaCost: string | null; colorIdentity: string[] }, filters: PanelFilters) {
  const normalizedTypeLine = typeof input.typeLine === "string" ? input.typeLine : "";
  const normalizedManaCost = typeof input.manaCost === "string" ? input.manaCost : null;
  const normalizedColorIdentity = Array.isArray(input.colorIdentity)
    ? input.colorIdentity.filter((entry): entry is string => typeof entry === "string")
    : [];

  const typeOk =
    filters.type === "Any" || normalizedTypeLine.toLowerCase().includes(filters.type.toLowerCase());
  const cmcOk = filters.maxCmc === null || parseApproximateCmc(normalizedManaCost) <= filters.maxCmc;
  const colorOk = filters.color === null || normalizedColorIdentity.includes(filters.color);
  return typeOk && cmcOk && colorOk;
}

function SourceCardRow({
  item,
  onQuickAdd,
  selected,
  onToggleSelect,
  selectedPayloads,
}: {
  item: CardSelectionRecord;
  onQuickAdd: (payload: DeckDragCardPayload, zone: "commander" | "mainboard") => void;
  selected: boolean;
  onToggleSelect: (sourceItemId: string) => void;
  selectedPayloads: DeckDragCardPayload[];
}) {
  const payload: DeckDragCardPayload = {
    source: item.source,
    sourceItemId: item.sourceItemId,
    cardId: item.cardId,
    printingId: item.printingId,
    scryfallId: item.scryfallId,
  };

  return (
    <article
      className={`surface-card group flex cursor-grab items-center gap-3 p-3 ${selected ? "border-[color:var(--surface-border-strong)]" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        const items = selectedPayloads.length > 0 ? selectedPayloads : [payload];
        event.dataTransfer.setData("application/json", JSON.stringify({ items } satisfies SourceDragPayload));
      }}
    >
      <button
        type="button"
        className={`h-5 w-5 rounded border ${selected ? "border-zinc-100 bg-zinc-100/15" : "border-white/20 bg-transparent"}`}
        onClick={() => onToggleSelect(item.sourceItemId)}
        aria-label={selected ? "Deselect source card" : "Select source card"}
      />
      <CardPreviewThumbnail
        normalUri={item.imageUri}
        name={item.title}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{item.title}</p>
        <p className="truncate text-xs text-[color:var(--text-subtle)]">{item.subtitle}</p>
        {item.availableQuantity !== null ? (
          <p className="text-xs text-[color:var(--text-subtle)]">Owned: {item.availableQuantity}</p>
        ) : null}
      </div>
      <PriceInline price={item.price} />
      <div className="flex gap-1.5">
        <button type="button" className="nav-link" onClick={() => onQuickAdd(payload, "commander")}>C</button>
        <button
          type="button"
          className="nav-link nav-link-active"
          onClick={() => onQuickAdd(payload, "mainboard")}
        >
          +
        </button>
      </div>
    </article>
  );
}

function DeckCardRow({
  entry,
  onAdjust,
  selected,
  onToggleSelect,
}: {
  entry: DeckRecord["cards"][number];
  onAdjust: (entryId: string, delta: number) => void;
  selected: boolean;
  onToggleSelect: (entryId: string) => void;
}) {
  return (
    <article className={`surface-card flex items-center gap-3 p-3 ${selected ? "border-[color:var(--surface-border-strong)]" : ""}`}>
      <button
        type="button"
        className={`h-5 w-5 rounded border ${selected ? "border-zinc-100 bg-zinc-100/15" : "border-white/20 bg-transparent"}`}
        onClick={() => onToggleSelect(entry.id)}
        aria-label={selected ? "Deselect deck card" : "Select deck card"}
      />
      <CardPreviewThumbnail
        normalUri={entry.imageUri}
        name={entry.name}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{entry.name}</p>
        <p className="truncate text-xs text-[color:var(--text-subtle)]">{entry.typeLine}</p>
      </div>
      <PriceInline price={entry.price} />
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-300">x{entry.quantity}</span>
        <button type="button" className="nav-link" onClick={() => onAdjust(entry.id, -1)}>
          -
        </button>
        <button type="button" className="nav-link nav-link-active" onClick={() => onAdjust(entry.id, 1)}>
          +
        </button>
      </div>
    </article>
  );
}

export function DeckEditorWorkspace({
  initialDeck,
  initialValidation,
  initialAnalytics,
  initialIntelligence,
}: DeckEditorWorkspaceProps) {
  const [deck, setDeck] = useState(initialDeck);
  const [validation, setValidation] = useState(initialValidation);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [intelligence, setIntelligence] = useState(initialIntelligence);
  const [playtest, setPlaytest] = useState<DeckPlaytestReport | null>(null);
  const [isRunningPlaytest, setIsRunningPlaytest] = useState(false);
  const [upgrades, setUpgrades] = useState<DeckUpgradeReport | null>(null);
  const [upgradeMode, setUpgradeMode] = useState<DeckUpgradeMode>("all");
  const [isLoadingUpgrades, setIsLoadingUpgrades] = useState(false);
  const [sourceMode, setSourceMode] = useState<"all" | "library">(initialDeck.preferredSource);
  const [search, setSearch] = useState("");
  const [sourceItems, setSourceItems] = useState<CardSelectionRecord[]>([]);
  const [selectedSource, setSelectedSource] = useState<Set<string>>(new Set());
  const [selectedDeck, setSelectedDeck] = useState<Set<string>>(new Set());
  const [sourceFilters, setSourceFilters] = useState<PanelFilters>({ type: "Any", maxCmc: null, color: null });
  const [deckFilters, setDeckFilters] = useState<PanelFilters>({ type: "Any", maxCmc: null, color: null });
  const [deckSearch, setDeckSearch] = useState("");
  const [isBulkMutating, setIsBulkMutating] = useState(false);
  const [isDraggingCommander, setIsDraggingCommander] = useState(false);
  const [isDraggingMainboard, setIsDraggingMainboard] = useState(false);
  const [reviewTab, setReviewTab] = useState<"analytics" | "validation" | "guidance" | "playtest">("analytics");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("deckbuilder");
  const [mobileDeckTab, setMobileDeckTab] = useState<MobileDeckTab>("deck");
  const [showSourceFilters, setShowSourceFilters] = useState(false);
  const [showDeckFilters, setShowDeckFilters] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const sourcePanelRef = useRef<HTMLDivElement | null>(null);
  const sourceSearchInputRef = useRef<HTMLInputElement | null>(null);
  const sourceRequestSequenceRef = useRef(0);
  const debouncedSourceSearch = useDebouncedValue(search, 180);
  const normalizedSourceSearch = useMemo(
    () => normalizeSearchText(debouncedSourceSearch, { maxLength: 120, unicodeForm: "NFKC" }),
    [debouncedSourceSearch],
  );
  const normalizedDeckSearch = useMemo(
    () => normalizeSearchText(deckSearch, { maxLength: 120, unicodeForm: "NFKC" }).toLowerCase(),
    [deckSearch],
  );

  const commanderEntries = useMemo(
    () => deck.cards.filter((entry) => entry.zone === "commander"),
    [deck.cards],
  );
  const mainboardEntries = useMemo(
    () => deck.cards.filter((entry) => entry.zone === "mainboard"),
    [deck.cards],
  );
  const filteredSourceItems = useMemo(
    () =>
      sourceItems.filter((item) =>
        matchesFilters(
          {
            typeLine: item.subtitle,
            manaCost: item.manaCost,
            colorIdentity: item.colorIdentity,
          },
          sourceFilters,
        ),
      ),
    [sourceItems, sourceFilters],
  );
  const filteredCommanderEntries = useMemo(
    () =>
      commanderEntries.filter(
        (entry) =>
          matchesFilters(
            { typeLine: entry.typeLine, manaCost: entry.manaCost, colorIdentity: entry.colorIdentity },
            deckFilters,
          ) &&
          entry.name.toLowerCase().includes(normalizedDeckSearch),
      ),
    [commanderEntries, deckFilters, normalizedDeckSearch],
  );
  const filteredMainboardEntries = useMemo(
    () =>
      mainboardEntries.filter(
        (entry) =>
          matchesFilters(
            { typeLine: entry.typeLine, manaCost: entry.manaCost, colorIdentity: entry.colorIdentity },
            deckFilters,
          ) &&
          entry.name.toLowerCase().includes(normalizedDeckSearch),
      ),
    [mainboardEntries, deckFilters, normalizedDeckSearch],
  );
  const deckValueEstimate = useMemo(
    () =>
      estimateValuation(
        deck.cards.map((entry) => ({
          quantity: entry.quantity,
          finish: "NONFOIL",
          price: entry.price,
        })),
      ),
    [deck.cards],
  );
  const isEmptyDeck = deck.cards.length === 0;

  function focusSourcePanel(options?: { preferCommander?: boolean }) {
    setWorkspaceView("deckbuilder");
    if (options?.preferCommander) {
      setSourceFilters((current) => ({ ...current, type: "Creature" }));
    }

    sourcePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      sourceSearchInputRef.current?.focus();
    }, 80);
  }

  useEffect(() => {
    const controller = new AbortController();
    const requestSequence = ++sourceRequestSequenceRef.current;

    const params = new URLSearchParams({
      mode: sourceMode,
      query: normalizedSourceSearch,
      limit: "20",
      commanderOnly: "false",
    });

    fetch(`/api/deckbuilder/source?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        const parsed = parseDeckSourceResultResponse(payload, "deck_editor_source_panel");
        if (requestSequence !== sourceRequestSequenceRef.current) {
          return;
        }

        if (!parsed) {
          setSourceItems([]);
          return;
        }

        setSourceItems(parsed.items);
      })
      .catch((error) => {
        if ((error as { name?: string } | undefined)?.name === "AbortError") {
          return;
        }

        if (requestSequence === sourceRequestSequenceRef.current) {
          setSourceItems([]);
        }
      });

    return () => controller.abort();
  }, [sourceMode, normalizedSourceSearch]);

  async function syncDeckFromResponse(response: Response): Promise<boolean> {
    if (!response.ok) {
      let message = "Deck update failed.";
      try {
        const payload = (await response.json()) as { error?: string };
        if (typeof payload.error === "string" && payload.error.length > 0) {
          message = payload.error;
        }
      } catch {
        // ignore parse failures
      }
      setMutationError(message);
      return false;
    }

    const rawPayload = await response.json();
    const payload = parseDeckWorkspaceResponse(rawPayload, "deck_editor_workspace_sync");
    if (!payload) {
      setMutationError("Deck response was invalid. Please retry.");
      return false;
    }

    setDeck(payload.deck);
    setValidation(payload.validation);
    setAnalytics(payload.analytics);
    setIntelligence(payload.intelligence);
    setSelectedDeck(new Set());
    setMutationError(null);
    return true;
  }

  async function setMode(mode: "all" | "library") {
    setSourceMode(mode);

    const response = await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceMode: mode }),
    });

    await syncDeckFromResponse(response);
  }

  async function addToDeck(payload: DeckDragCardPayload, zone: "commander" | "mainboard") {
    const response = await fetch(`/api/decks/${deck.id}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceMode,
        sourceItemId: payload.sourceItemId,
        cardId: payload.cardId,
        scryfallId: payload.scryfallId,
        printingId: payload.printingId,
        zone,
      }),
    });

    const synced = await syncDeckFromResponse(response);
    if (!synced) {
      return;
    }
    setSelectedSource((current) => {
      const next = new Set(current);
      next.delete(payload.sourceItemId);
      return next;
    });
  }

  async function adjustCard(entryId: string, delta: number) {
    const response = await fetch(`/api/decks/${deck.id}/cards`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, delta }),
    });

    await syncDeckFromResponse(response);
  }

  function handleDrop(
    event: React.DragEvent,
    zone: "commander" | "mainboard",
    setDragging: (value: boolean) => void,
  ) {
    event.preventDefault();
    setDragging(false);

    const raw = event.dataTransfer.getData("application/json");

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SourceDragPayload | DeckDragCardPayload;
      if ("items" in parsed && Array.isArray(parsed.items)) {
        void bulkAdd(parsed.items, zone);
        return;
      }
      void addToDeck(parsed as DeckDragCardPayload, zone);
    } catch {
      // noop
    }
  }

  const fetchDeckSnapshot = useCallback(async () => {
    const response = await fetch(`/api/decks/${deck.id}`);
    await syncDeckFromResponse(response);
  }, [deck.id]);

  const bulkAdd = useCallback(async (payloads: DeckDragCardPayload[], zone: "commander" | "mainboard") => {
    if (payloads.length === 0) return;
    setIsBulkMutating(true);
    const responses = await Promise.all(
      payloads.map((payload) =>
        fetch(`/api/decks/${deck.id}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceMode,
            sourceItemId: payload.sourceItemId,
            cardId: payload.cardId,
            scryfallId: payload.scryfallId,
            printingId: payload.printingId,
            zone,
          }),
        }),
      ),
    );
    if (responses.some((response) => !response.ok)) {
      setMutationError("Some cards could not be added.");
    }
    await fetchDeckSnapshot();
    setSelectedSource(new Set());
    setIsBulkMutating(false);
  }, [deck.id, sourceMode, fetchDeckSnapshot]);

  const bulkRemove = useCallback(async () => {
    const selectedEntries = deck.cards.filter((entry) => selectedDeck.has(entry.id));
    if (selectedEntries.length === 0) return;
    setIsBulkMutating(true);
    const responses = await Promise.all(
      selectedEntries.map((entry) =>
        fetch(`/api/decks/${deck.id}/cards`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId: entry.id, delta: -1 }),
        }),
      ),
    );
    if (responses.some((response) => !response.ok)) {
      setMutationError("Some cards could not be removed.");
    }
    await fetchDeckSnapshot();
    setSelectedDeck(new Set());
    setIsBulkMutating(false);
  }, [deck.cards, selectedDeck, deck.id, fetchDeckSnapshot]);

  async function saveMetadata(next: {
    name?: string;
    description?: string;
    notes?: string;
    tags?: string[];
  }) {
    const response = await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    await syncDeckFromResponse(response);
  }

  const runPlaytest = useCallback(async (options?: { runs?: number; turns?: number }) => {
    setIsRunningPlaytest(true);
    const params = new URLSearchParams();
    params.set("sourceMode", sourceMode);
    params.set("runs", String(options?.runs ?? 250));
    params.set("turns", String(options?.turns ?? 7));

    const response = await fetch(`/api/decks/${deck.id}/playtest?${params.toString()}`);
    if (!response.ok) {
      setIsRunningPlaytest(false);
      return;
    }

    const payload = (await response.json()) as { data: DeckPlaytestReport };
    setPlaytest(payload.data);
    setIsRunningPlaytest(false);
  }, [deck.id, sourceMode]);

  const loadUpgrades = useCallback(async (mode: DeckUpgradeMode) => {
    setIsLoadingUpgrades(true);
    setUpgradeMode(mode);
    const params = new URLSearchParams({ mode });
    const response = await fetch(`/api/decks/${deck.id}/upgrades?${params.toString()}`);
    if (!response.ok) {
      setIsLoadingUpgrades(false);
      return;
    }

    const payload = (await response.json()) as { data: DeckUpgradeReport };
    setUpgrades(payload.data);
    setIsLoadingUpgrades(false);
  }, [deck.id]);

  function handleReviewTabChange(tab: "analytics" | "validation" | "guidance" | "playtest") {
    setReviewTab(tab);
    if (tab === "playtest" && !playtest && !isRunningPlaytest) {
      void runPlaytest();
    }
    if (tab === "guidance" && !upgrades && !isLoadingUpgrades) {
      void loadUpgrades(upgradeMode);
    }
  }

  function switchWorkspaceView(view: WorkspaceView) {
    setWorkspaceView(view);
    if (view === "analytics") {
      handleReviewTabChange("analytics");
      return;
    }
    if (view === "playtest") {
      handleReviewTabChange("playtest");
      return;
    }
    if (view === "upgrades") {
      handleReviewTabChange("guidance");
      return;
    }
  }

  function switchMobileDeckTab(next: MobileDeckTab) {
    setMobileDeckTab(next);
    if (next === "suggestions") {
      handleReviewTabChange("guidance");
    }
    if (next === "stats") {
      handleReviewTabChange("analytics");
    }
  }

  return (
    <div className="min-h-[100dvh] space-y-4 overflow-x-hidden pb-[calc(7rem+env(safe-area-inset-bottom))] md:space-y-5 md:pb-0">
      <section className="hidden surface-panel p-2 md:block">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`nav-link ${workspaceView === "deckbuilder" ? "nav-link-active" : ""}`}
            onClick={() => switchWorkspaceView("deckbuilder")}
          >
            Deckbuilder
          </button>
          <button
            type="button"
            className={`nav-link ${workspaceView === "analytics" ? "nav-link-active" : ""}`}
            onClick={() => switchWorkspaceView("analytics")}
          >
            Analytics
          </button>
          <button
            type="button"
            className={`nav-link ${workspaceView === "playtest" ? "nav-link-active" : ""}`}
            onClick={() => switchWorkspaceView("playtest")}
          >
            Playtest
          </button>
          <button
            type="button"
            className={`nav-link ${workspaceView === "upgrades" ? "nav-link-active" : ""}`}
            onClick={() => switchWorkspaceView("upgrades")}
          >
            Upgrades
          </button>
        </div>
      </section>
      {mutationError ? (
        <section className="surface-panel border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">
          {mutationError}
        </section>
      ) : null}

      <div className={workspaceView === "deckbuilder" ? "" : "hidden"}>
        <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
          <aside
            ref={sourcePanelRef}
            className={`space-y-5 ${mobileDeckTab === "add" ? "" : "hidden"} xl:block`}
          >
            <section className="surface-panel p-5 sm:p-6">
              <p className="type-label">Source Mode</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className={`nav-link ${sourceMode === "library" ? "nav-link-active" : ""}`}
                  onClick={() => setMode("library")}
                >
                  Build From Library
                </button>
                <button
                  type="button"
                  className={`nav-link ${sourceMode === "all" ? "nav-link-active" : ""}`}
                  onClick={() => setMode("all")}
                >
                  Build From All Cards
                </button>
              </div>

              <label className="mt-4 block space-y-2">
                <span className="type-label">Search Source</span>
                <input
                  ref={sourceSearchInputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  maxLength={240}
                  placeholder="Search cards"
                  className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
                />
              </label>
              <div className="mt-3 flex items-center justify-between gap-2 md:hidden">
                <p className="text-xs text-[color:var(--text-subtle)]">Filters</p>
                <button type="button" className="nav-link" onClick={() => setShowSourceFilters(true)}>
                  Edit Filters
                </button>
              </div>
              <div className="mt-3 hidden gap-2 md:grid md:grid-cols-3">
                <select
                  value={sourceFilters.type}
                  onChange={(event) => setSourceFilters((current) => ({ ...current, type: event.target.value as PanelFilters["type"] }))}
                  className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
                >
                  {TYPE_FILTERS.map((type) => <option key={type} value={type} className="bg-zinc-900">{type}</option>)}
                </select>
                <input
                  placeholder="Max CMC"
                  type="number"
                  min={0}
                  max={20}
                  value={sourceFilters.maxCmc ?? ""}
                  onChange={(event) =>
                    setSourceFilters((current) => ({
                      ...current,
                      maxCmc: event.target.value
                        ? Math.max(0, Math.min(20, Number(event.target.value) || 0))
                        : null,
                    }))
                  }
                  className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
                />
                <select
                  value={sourceFilters.color ?? ""}
                  onChange={(event) =>
                    setSourceFilters((current) => ({ ...current, color: (event.target.value || null) as CardColor | null }))
                  }
                  className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
                >
                  <option value="" className="bg-zinc-900">Any Color</option>
                  {["W", "U", "B", "R", "G"].map((color) => <option key={color} value={color} className="bg-zinc-900">{color}</option>)}
                </select>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-[color:var(--text-subtle)]">{selectedSource.size} selected</p>
                <div className="flex gap-2">
                  <button type="button" className="nav-link" onClick={() => setSelectedSource(new Set())}>
                    Clear
                  </button>
                  <button
                    type="button"
                    className="nav-link nav-link-active"
                    disabled={selectedSource.size === 0 || isBulkMutating}
                    onClick={() =>
                      void bulkAdd(
                        filteredSourceItems
                          .filter((item) => selectedSource.has(item.sourceItemId))
                          .map((item) => ({
                            source: item.source,
                            sourceItemId: item.sourceItemId,
                            cardId: item.cardId,
                            printingId: item.printingId,
                            scryfallId: item.scryfallId,
                          })),
                        "mainboard",
                      )
                    }
                  >
                    Bulk Add
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              {filteredSourceItems.map((item) => (
                <SourceCardRow
                  key={`${item.source}-${item.sourceItemId}`}
                  item={item}
                  onQuickAdd={addToDeck}
                  selected={selectedSource.has(item.sourceItemId)}
                  onToggleSelect={(sourceItemId) =>
                    setSelectedSource((current) => {
                      const next = new Set(current);
                      if (next.has(sourceItemId)) next.delete(sourceItemId);
                      else next.add(sourceItemId);
                      return next;
                    })
                  }
                  selectedPayloads={filteredSourceItems
                    .filter((entry) => selectedSource.has(entry.sourceItemId))
                    .map((entry) => ({
                      source: entry.source,
                      sourceItemId: entry.sourceItemId,
                      cardId: entry.cardId,
                      printingId: entry.printingId,
                      scryfallId: entry.scryfallId,
                    }))}
                />
              ))}
              {filteredSourceItems.length === 0 ? (
                <div className="surface-panel p-6">
                  <p className="type-title">No source cards</p>
                  <p className="type-body-muted mt-2">Try a broader search or switch source mode.</p>
                </div>
              ) : null}
            </section>
          </aside>

          <section className={`space-y-4 md:space-y-5 ${mobileDeckTab === "add" ? "hidden xl:block" : ""}`}>
            {isEmptyDeck ? (
              <section className={`surface-panel p-4 sm:p-6 ${mobileDeckTab === "deck" ? "" : "hidden xl:block"}`}>
                <p className="type-label">Start Building</p>
                <h3 className="type-title mt-2">This deck is ready for its first cards.</h3>
                <p className="type-body-muted mt-2">
                  Choose a commander first, or start adding core cards from your source panel.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="nav-link nav-link-active" onClick={() => focusSourcePanel({ preferCommander: true })}>
                    Add Commander
                  </button>
                  <button type="button" className="nav-link" onClick={() => focusSourcePanel()}>
                    Add Cards
                  </button>
                </div>
              </section>
            ) : null}
            <section className={`surface-panel p-4 sm:p-6 ${mobileDeckTab === "settings" ? "" : "hidden xl:block"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="type-label">Deck Metadata</p>
                  <h2 className="type-title mt-2">{deck.name}</h2>
                  <p className="text-xs text-[color:var(--text-subtle)]">{validation.cardCount}/100 cards</p>
                </div>
                <ValueEstimateChip label="Deck Value" estimate={deckValueEstimate} />
              </div>
              {mobileDeckTab === "settings" ? (
                <div className="mt-4 rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] p-3">
                  <p className="type-label">Source Mode</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className={`nav-link ${sourceMode === "library" ? "nav-link-active" : ""}`}
                      onClick={() => setMode("library")}
                    >
                      Library
                    </button>
                    <button
                      type="button"
                      className={`nav-link ${sourceMode === "all" ? "nav-link-active" : ""}`}
                      onClick={() => setMode("all")}
                    >
                      All Cards
                    </button>
                  </div>
                </div>
              ) : null}
              <DeckMetadataEditor deck={deck} onSave={saveMetadata} />
            </section>

            <section className={`surface-panel p-4 sm:p-6 ${mobileDeckTab === "deck" ? "" : "hidden xl:block"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-zinc-100">{deck.name}</p>
                  <p className="text-xs text-[color:var(--text-subtle)]">{validation.cardCount}/100 cards</p>
                </div>
                <ValueEstimateChip label="Value" estimate={deckValueEstimate} />
              </div>
            </section>

            <section
              className={`surface-panel p-4 sm:p-6 ${isDraggingCommander ? "border-white/30" : ""} ${mobileDeckTab === "deck" ? "" : "hidden xl:block"}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingCommander(true);
              }}
              onDragLeave={() => setIsDraggingCommander(false)}
              onDrop={(event) => handleDrop(event, "commander", setIsDraggingCommander)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="type-label">Deck Panel</p>
                <div className="flex gap-2">
                  <input
                    value={deckSearch}
                    onChange={(event) => setDeckSearch(event.target.value)}
                    maxLength={240}
                    placeholder="Search deck"
                    className="w-36 rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
                  />
                  <button type="button" className="nav-link" disabled={selectedDeck.size === 0 || isBulkMutating} onClick={() => void bulkRemove()}>
                    Bulk Remove
                  </button>
                  <button type="button" className="nav-link md:hidden" onClick={() => setShowDeckFilters(true)}>
                    Filters
                  </button>
                </div>
              </div>
              <div className="mt-3 hidden gap-2 md:grid md:grid-cols-3">
                <select
                  value={deckFilters.type}
                  onChange={(event) => setDeckFilters((current) => ({ ...current, type: event.target.value as PanelFilters["type"] }))}
                  className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
                >
                  {TYPE_FILTERS.map((type) => <option key={type} value={type} className="bg-zinc-900">{type}</option>)}
                </select>
                <input
                  placeholder="Max CMC"
                  type="number"
                  min={0}
                  max={20}
                  value={deckFilters.maxCmc ?? ""}
                  onChange={(event) =>
                    setDeckFilters((current) => ({
                      ...current,
                      maxCmc: event.target.value
                        ? Math.max(0, Math.min(20, Number(event.target.value) || 0))
                        : null,
                    }))
                  }
                  className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
                />
                <select
                  value={deckFilters.color ?? ""}
                  onChange={(event) =>
                    setDeckFilters((current) => ({ ...current, color: (event.target.value || null) as CardColor | null }))
                  }
                  className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
                >
                  <option value="" className="bg-zinc-900">Any Color</option>
                  {["W", "U", "B", "R", "G"].map((color) => <option key={color} value={color} className="bg-zinc-900">{color}</option>)}
                </select>
              </div>

              <p className="type-label mt-4">Commander Slot</p>
              <div className="mt-3 space-y-2">
                {filteredCommanderEntries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-sm text-zinc-400">
                    Drag a card here to set commander.
                  </div>
                ) : (
                  filteredCommanderEntries.map((entry) => (
                    <DeckCardRow
                      key={entry.id}
                      entry={entry}
                      onAdjust={adjustCard}
                      selected={selectedDeck.has(entry.id)}
                      onToggleSelect={(entryId) =>
                        setSelectedDeck((current) => {
                          const next = new Set(current);
                          if (next.has(entryId)) next.delete(entryId);
                          else next.add(entryId);
                          return next;
                        })
                      }
                    />
                  ))
                )}
              </div>
            </section>

            <section
              className={`surface-panel p-4 sm:p-6 ${isDraggingMainboard ? "border-white/30" : ""} ${mobileDeckTab === "deck" ? "" : "hidden xl:block"}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingMainboard(true);
              }}
              onDragLeave={() => setIsDraggingMainboard(false)}
              onDrop={(event) => handleDrop(event, "mainboard", setIsDraggingMainboard)}
            >
              <p className="type-label">Mainboard</p>
              <div className="mt-3 space-y-2">
                {filteredMainboardEntries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-sm text-zinc-400">
                    Drag cards here to build your 99.
                  </div>
                ) : (
                  filteredMainboardEntries.map((entry) => (
                    <DeckCardRow
                      key={entry.id}
                      entry={entry}
                      onAdjust={adjustCard}
                      selected={selectedDeck.has(entry.id)}
                      onToggleSelect={(entryId) =>
                        setSelectedDeck((current) => {
                          const next = new Set(current);
                          if (next.has(entryId)) next.delete(entryId);
                          else next.add(entryId);
                          return next;
                        })
                      }
                    />
                  ))
                )}
              </div>
            </section>
          </section>
        </div>
      </div>

      <div className={`${mobileDeckTab === "suggestions" || mobileDeckTab === "stats" ? "" : "hidden"} xl:block`}>
        <DeckReviewPanel
          analytics={analytics}
          validation={validation}
          intelligence={intelligence}
          playtest={playtest}
          isRunningPlaytest={isRunningPlaytest}
          onRunPlaytest={runPlaytest}
          upgrades={upgrades}
          upgradeMode={upgradeMode}
          isLoadingUpgrades={isLoadingUpgrades}
          onLoadUpgrades={loadUpgrades}
          activeTab={reviewTab}
          onChangeTab={handleReviewTabChange}
        />
      </div>

      {showSourceFilters ? (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden">
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-[color:var(--surface-border)] bg-[#090b13] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="type-label">Source Filters</p>
              <button type="button" className="nav-link" onClick={() => setShowSourceFilters(false)}>Done</button>
            </div>
            <div className="grid gap-2">
              <select
                value={sourceFilters.type}
                onChange={(event) => setSourceFilters((current) => ({ ...current, type: event.target.value as PanelFilters["type"] }))}
                className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100"
              >
                {TYPE_FILTERS.map((type) => <option key={type} value={type} className="bg-zinc-900">{type}</option>)}
              </select>
              <input
                placeholder="Max CMC"
                type="number"
                min={0}
                max={20}
                value={sourceFilters.maxCmc ?? ""}
                onChange={(event) =>
                  setSourceFilters((current) => ({
                    ...current,
                    maxCmc: event.target.value ? Math.max(0, Math.min(20, Number(event.target.value) || 0)) : null,
                  }))
                }
                className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100"
              />
              <select
                value={sourceFilters.color ?? ""}
                onChange={(event) => setSourceFilters((current) => ({ ...current, color: (event.target.value || null) as CardColor | null }))}
                className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100"
              >
                <option value="" className="bg-zinc-900">Any Color</option>
                {["W", "U", "B", "R", "G"].map((color) => <option key={color} value={color} className="bg-zinc-900">{color}</option>)}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {showDeckFilters ? (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden">
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-[color:var(--surface-border)] bg-[#090b13] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="type-label">Deck Filters</p>
              <button type="button" className="nav-link" onClick={() => setShowDeckFilters(false)}>Done</button>
            </div>
            <div className="grid gap-2">
              <select
                value={deckFilters.type}
                onChange={(event) => setDeckFilters((current) => ({ ...current, type: event.target.value as PanelFilters["type"] }))}
                className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100"
              >
                {TYPE_FILTERS.map((type) => <option key={type} value={type} className="bg-zinc-900">{type}</option>)}
              </select>
              <input
                placeholder="Max CMC"
                type="number"
                min={0}
                max={20}
                value={deckFilters.maxCmc ?? ""}
                onChange={(event) =>
                  setDeckFilters((current) => ({
                    ...current,
                    maxCmc: event.target.value ? Math.max(0, Math.min(20, Number(event.target.value) || 0)) : null,
                  }))
                }
                className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100"
              />
              <select
                value={deckFilters.color ?? ""}
                onChange={(event) => setDeckFilters((current) => ({ ...current, color: (event.target.value || null) as CardColor | null }))}
                className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-xs text-zinc-100"
              >
                <option value="" className="bg-zinc-900">Any Color</option>
                {["W", "U", "B", "R", "G"].map((color) => <option key={color} value={color} className="bg-zinc-900">{color}</option>)}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--surface-border)] bg-[#090b13]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden">
        <div className="grid grid-cols-5 gap-1">
          <button type="button" className={`nav-link justify-center whitespace-nowrap text-[11px] ${mobileDeckTab === "deck" ? "nav-link-active" : ""}`} onClick={() => switchMobileDeckTab("deck")}>Deck</button>
          <button type="button" className={`nav-link justify-center whitespace-nowrap text-[11px] ${mobileDeckTab === "add" ? "nav-link-active" : ""}`} onClick={() => switchMobileDeckTab("add")}>Add</button>
          <button type="button" className={`nav-link justify-center whitespace-nowrap text-[11px] ${mobileDeckTab === "suggestions" ? "nav-link-active" : ""}`} onClick={() => switchMobileDeckTab("suggestions")}>Suggestions</button>
          <button type="button" className={`nav-link justify-center whitespace-nowrap text-[11px] ${mobileDeckTab === "stats" ? "nav-link-active" : ""}`} onClick={() => switchMobileDeckTab("stats")}>Stats</button>
          <button type="button" className={`nav-link justify-center whitespace-nowrap text-[11px] ${mobileDeckTab === "settings" ? "nav-link-active" : ""}`} onClick={() => switchMobileDeckTab("settings")}>Settings</button>
        </div>
      </nav>
    </div>
  );
}

function DeckMetadataEditor({
  deck,
  onSave,
}: {
  deck: DeckRecord;
  onSave: (input: { name?: string; description?: string; notes?: string; tags?: string[] }) => Promise<void>;
}) {
  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description ?? "");
  const [notes, setNotes] = useState(deck.notes ?? "");
  const [tags, setTags] = useState(deck.tags.join(", "));

  return (
    <div className="mt-3 grid gap-2.5">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
      />
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Short description"
        className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
      />
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Deck notes"
        rows={3}
        className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
      />
      <input
        value={tags}
        onChange={(event) => setTags(event.target.value)}
        placeholder="Tags (comma separated)"
        className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
      />
      <div className="flex justify-end">
        <button
          type="button"
          className="nav-link nav-link-active"
          onClick={() =>
            onSave({
              name,
              description,
              notes,
              tags: tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
        >
          Save Metadata
        </button>
      </div>
    </div>
  );
}
