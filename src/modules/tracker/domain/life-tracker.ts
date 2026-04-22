import { z } from "zod";

export const TRACKER_PLAYER_MIN = 2;
export const TRACKER_PLAYER_MAX = 6;
const TRACKER_HISTORY_LIMIT = 80;

export const COMMANDER_LIFE_PRESETS = [40, 30, 20] as const;
export type CommanderLifePreset = (typeof COMMANDER_LIFE_PRESETS)[number];

export type TrackerPlayer = {
  id: string;
  name: string;
  life: number;
  poison: number;
  themeKey: string;
  backgroundImageUri: string | null;
  backgroundImageCardName: string | null;
  customCounters: Record<string, number>;
  commanderDamageTaken: Record<string, number>;
};

export type TrackerGameState = {
  playerCount: number;
  startingLife: CommanderLifePreset;
  players: TrackerPlayer[];
  monarchPlayerId: string | null;
  initiativePlayerId: string | null;
};

export type TrackerState = {
  past: TrackerGameState[];
  present: TrackerGameState;
};

export type TrackerAction =
  | { type: "set_player_count"; count: number }
  | { type: "set_starting_life"; life: CommanderLifePreset }
  | { type: "set_player_name"; playerId: string; name: string }
  | { type: "set_player_theme"; playerId: string; themeKey: string }
  | { type: "set_player_background_image"; playerId: string; imageUri: string | null; cardName: string | null }
  | { type: "adjust_life"; playerId: string; delta: number }
  | { type: "adjust_poison"; playerId: string; delta: number }
  | { type: "adjust_commander_damage"; targetPlayerId: string; sourcePlayerId: string; delta: number }
  | { type: "toggle_monarch"; playerId: string }
  | { type: "toggle_initiative"; playerId: string }
  | { type: "add_custom_counter"; name: string }
  | { type: "adjust_custom_counter"; playerId: string; name: string; delta: number }
  | { type: "quick_reset" }
  | { type: "new_game" }
  | { type: "undo" }
  | { type: "hydrate"; state: TrackerGameState };

const trackerPlayerSchema: z.ZodType<TrackerPlayer> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  life: z.number().int(),
  poison: z.number().int(),
  themeKey: z.string().min(1).default("graphite"),
  backgroundImageUri: z.string().url().nullable().default(null),
  backgroundImageCardName: z.string().min(1).nullable().default(null),
  customCounters: z.record(z.string(), z.number().int()),
  commanderDamageTaken: z.record(z.string(), z.number().int()),
});

const trackerGameStateSchema: z.ZodType<TrackerGameState> = z.object({
  playerCount: z.number().int().min(TRACKER_PLAYER_MIN).max(TRACKER_PLAYER_MAX),
  startingLife: z.union([z.literal(40), z.literal(30), z.literal(20)]),
  players: z.array(trackerPlayerSchema),
  monarchPlayerId: z.string().nullable(),
  initiativePlayerId: z.string().nullable(),
});

function clampPlayerCount(value: number): number {
  return Math.max(TRACKER_PLAYER_MIN, Math.min(TRACKER_PLAYER_MAX, Math.trunc(value)));
}

function sanitizeCounterName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function buildPlayerIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `p${index + 1}`);
}

function defaultThemeForIndex(index: number): string {
  const fallbackThemes = ["graphite", "ocean", "forest", "crimson", "violet", "gold"];
  return fallbackThemes[index % fallbackThemes.length] ?? fallbackThemes[0]!;
}

function createPlayerFromId(id: string, index: number, allIds: string[], life: number): TrackerPlayer {
  const commanderDamageTaken: Record<string, number> = {};
  for (const sourceId of allIds) {
    if (sourceId !== id) {
      commanderDamageTaken[sourceId] = 0;
    }
  }

  return {
    id,
    name: `Player ${index + 1}`,
    life,
    poison: 0,
    themeKey: defaultThemeForIndex(index),
    backgroundImageUri: null,
    backgroundImageCardName: null,
    customCounters: {},
    commanderDamageTaken,
  };
}

function createFreshGameState(playerCount = 4, startingLife: CommanderLifePreset = 40): TrackerGameState {
  const count = clampPlayerCount(playerCount);
  const ids = buildPlayerIds(count);

  return {
    playerCount: count,
    startingLife,
    players: ids.map((id, index) => createPlayerFromId(id, index, ids, startingLife)),
    monarchPlayerId: null,
    initiativePlayerId: null,
  };
}

function remapForPlayerCount(
  state: TrackerGameState,
  targetCount: number,
  options: { resetStats: boolean; resetNames: boolean },
): TrackerGameState {
  const nextCount = clampPlayerCount(targetCount);
  const nextIds = buildPlayerIds(nextCount);

  const existingById = new Map(state.players.map((player) => [player.id, player]));
  const allCounterNames = new Set<string>();
  for (const player of state.players) {
    for (const name of Object.keys(player.customCounters)) {
      allCounterNames.add(name);
    }
  }

  const players = nextIds.map((id, index) => {
    const existing = existingById.get(id);

    if (!existing) {
      const fresh = createPlayerFromId(id, index, nextIds, state.startingLife);
      for (const name of allCounterNames) {
        fresh.customCounters[name] = 0;
      }
      return fresh;
    }

    const customCounters: Record<string, number> = {};
    for (const name of allCounterNames) {
      customCounters[name] = options.resetStats ? 0 : existing.customCounters[name] ?? 0;
    }

    const commanderDamageTaken: Record<string, number> = {};
    for (const sourceId of nextIds) {
      if (sourceId !== id) {
        const prev = existing.commanderDamageTaken[sourceId] ?? 0;
        commanderDamageTaken[sourceId] = options.resetStats ? 0 : prev;
      }
    }

    return {
      id,
      name: options.resetNames ? `Player ${index + 1}` : existing.name,
      life: options.resetStats ? state.startingLife : existing.life,
      poison: options.resetStats ? 0 : existing.poison,
      themeKey: existing.themeKey || defaultThemeForIndex(index),
      backgroundImageUri: existing.backgroundImageUri ?? null,
      backgroundImageCardName: existing.backgroundImageCardName ?? null,
      customCounters,
      commanderDamageTaken,
    };
  });

  const validIds = new Set(players.map((player) => player.id));

  return {
    ...state,
    playerCount: nextCount,
    players,
    monarchPlayerId: state.monarchPlayerId && validIds.has(state.monarchPlayerId) ? state.monarchPlayerId : null,
    initiativePlayerId:
      state.initiativePlayerId && validIds.has(state.initiativePlayerId) ? state.initiativePlayerId : null,
  };
}

function snapshotEquals(a: TrackerGameState, b: TrackerGameState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function commit(state: TrackerState, nextPresent: TrackerGameState): TrackerState {
  if (snapshotEquals(state.present, nextPresent)) {
    return state;
  }

  const past = [...state.past, state.present];
  const trimmedPast = past.slice(Math.max(0, past.length - TRACKER_HISTORY_LIMIT));

  return {
    past: trimmedPast,
    present: nextPresent,
  };
}

function updatePlayer(
  state: TrackerGameState,
  playerId: string,
  update: (player: TrackerPlayer) => TrackerPlayer,
): TrackerGameState {
  return {
    ...state,
    players: state.players.map((player) => (player.id === playerId ? update(player) : player)),
  };
}

function clampAtLeastZero(value: number): number {
  return Math.max(0, value);
}

function normalizeHydratedPlayer(player: z.infer<typeof trackerPlayerSchema>, index: number): TrackerPlayer {
  return {
    ...player,
    themeKey: player.themeKey?.trim() || defaultThemeForIndex(index),
    backgroundImageUri: player.backgroundImageUri ?? null,
    backgroundImageCardName: player.backgroundImageCardName ?? null,
  };
}

function normalizeHydratedState(input: TrackerGameState): TrackerGameState {
  const parsed = trackerGameStateSchema.parse(input);
  const normalizedPlayers = parsed.players.map((player, index) => normalizeHydratedPlayer(player, index));
  const next = remapForPlayerCount(
    {
      ...parsed,
      players: normalizedPlayers,
    },
    parsed.playerCount,
    { resetNames: false, resetStats: false },
  );

  return {
    ...next,
    startingLife: parsed.startingLife,
  };
}

export function createInitialTrackerState(): TrackerState {
  return {
    past: [],
    present: createFreshGameState(4, 40),
  };
}

export function lifeTrackerReducer(state: TrackerState, action: TrackerAction): TrackerState {
  switch (action.type) {
    case "set_player_count": {
      const next = remapForPlayerCount(state.present, action.count, { resetStats: false, resetNames: false });
      return commit(state, next);
    }
    case "set_starting_life": {
      if (state.present.startingLife === action.life) {
        return state;
      }

      return commit(state, {
        ...state.present,
        startingLife: action.life,
      });
    }
    case "set_player_name": {
      const name = action.name.trim() || "Unnamed";
      return commit(
        state,
        updatePlayer(state.present, action.playerId, (player) => ({
          ...player,
          name,
        })),
      );
    }
    case "set_player_theme": {
      const themeKey = action.themeKey.trim();
      if (!themeKey) {
        return state;
      }

      return commit(
        state,
        updatePlayer(state.present, action.playerId, (player) => ({
          ...player,
          themeKey,
        })),
      );
    }
    case "set_player_background_image": {
      return commit(
        state,
        updatePlayer(state.present, action.playerId, (player) => ({
          ...player,
          backgroundImageUri: action.imageUri,
          backgroundImageCardName: action.cardName,
        })),
      );
    }
    case "adjust_life": {
      return commit(
        state,
        updatePlayer(state.present, action.playerId, (player) => ({
          ...player,
          life: player.life + action.delta,
        })),
      );
    }
    case "adjust_poison": {
      return commit(
        state,
        updatePlayer(state.present, action.playerId, (player) => ({
          ...player,
          poison: clampAtLeastZero(player.poison + action.delta),
        })),
      );
    }
    case "adjust_commander_damage": {
      return commit(
        state,
        updatePlayer(state.present, action.targetPlayerId, (player) => {
          if (action.targetPlayerId === action.sourcePlayerId) {
            return player;
          }

          return {
            ...player,
            commanderDamageTaken: {
              ...player.commanderDamageTaken,
              [action.sourcePlayerId]: clampAtLeastZero(
                (player.commanderDamageTaken[action.sourcePlayerId] ?? 0) + action.delta,
              ),
            },
          };
        }),
      );
    }
    case "toggle_monarch": {
      const nextMonarch = state.present.monarchPlayerId === action.playerId ? null : action.playerId;
      return commit(state, {
        ...state.present,
        monarchPlayerId: nextMonarch,
      });
    }
    case "toggle_initiative": {
      const nextInitiative = state.present.initiativePlayerId === action.playerId ? null : action.playerId;
      return commit(state, {
        ...state.present,
        initiativePlayerId: nextInitiative,
      });
    }
    case "add_custom_counter": {
      const counterName = sanitizeCounterName(action.name);
      if (!counterName) {
        return state;
      }

      const hasCounter = state.present.players.some((player) => counterName in player.customCounters);
      if (hasCounter) {
        return state;
      }

      return commit(state, {
        ...state.present,
        players: state.present.players.map((player) => ({
          ...player,
          customCounters: {
            ...player.customCounters,
            [counterName]: 0,
          },
        })),
      });
    }
    case "adjust_custom_counter": {
      const counterName = sanitizeCounterName(action.name);
      if (!counterName) {
        return state;
      }

      return commit(
        state,
        updatePlayer(state.present, action.playerId, (player) => ({
          ...player,
          customCounters: {
            ...player.customCounters,
            [counterName]: clampAtLeastZero((player.customCounters[counterName] ?? 0) + action.delta),
          },
        })),
      );
    }
    case "quick_reset": {
      const next = remapForPlayerCount(state.present, state.present.playerCount, {
        resetStats: true,
        resetNames: false,
      });
      return commit(state, {
        ...next,
        monarchPlayerId: null,
        initiativePlayerId: null,
      });
    }
    case "new_game": {
      const next = remapForPlayerCount(state.present, state.present.playerCount, {
        resetStats: true,
        resetNames: true,
      });
      return commit(state, {
        ...next,
        monarchPlayerId: null,
        initiativePlayerId: null,
      });
    }
    case "undo": {
      if (state.past.length === 0) {
        return state;
      }

      const previous = state.past[state.past.length - 1]!;
      return {
        past: state.past.slice(0, -1),
        present: previous,
      };
    }
    case "hydrate": {
      const normalized = normalizeHydratedState(action.state);
      return {
        past: [],
        present: normalized,
      };
    }
    default: {
      return state;
    }
  }
}

export const trackerPersistedSchema = z.object({
  version: z.literal(1),
  present: trackerGameStateSchema,
});

export type TrackerPersisted = z.infer<typeof trackerPersistedSchema>;

export function serializeTrackerState(state: TrackerState): TrackerPersisted {
  return {
    version: 1,
    present: state.present,
  };
}

export function parsePersistedTrackerState(input: unknown): TrackerGameState | null {
  const parsed = trackerPersistedSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return normalizeHydratedState(parsed.data.present);
}
