"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import {
  createInitialTrackerState,
  lifeTrackerReducer,
  parsePersistedTrackerState,
  serializeTrackerState,
} from "@/modules/tracker";
import { TrackerPlayerPanel } from "@/components/tracker/tracker-player-panel";
import { TrackerSettingsSheet } from "@/components/tracker/tracker-settings-sheet";
import { TrackerScreenLayout } from "@/components/tracker/tracker-screen-layout";

const STORAGE_KEY = "command-tower.life-tracker.v1";

export function LifeTrackerWorkspace() {
  const [state, dispatch] = useReducer(lifeTrackerReducer, undefined, createInitialTrackerState);
  const [counterName, setCounterName] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = parsePersistedTrackerState(JSON.parse(raw));
        if (parsed) {
          dispatch({ type: "hydrate", state: parsed });
        }
      }
    } catch {
      // ignore persistence errors
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeTrackerState(state)));
    } catch {
      // ignore persistence errors
    }
  }, [hydrated, state]);

  const allCounterNames = useMemo(() => {
    const names = new Set<string>();
    for (const player of state.present.players) {
      for (const name of Object.keys(player.customCounters)) {
        names.add(name);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [state.present.players]);

  const canUndo = state.past.length > 0;

  function onAddCustomCounter() {
    dispatch({ type: "add_custom_counter", name: counterName });
    setCounterName("");
  }

  function runNewGame() {
    dispatch({ type: "new_game" });
    setIsSettingsOpen(false);
  }

  function runQuickReset() {
    dispatch({ type: "quick_reset" });
    setIsSettingsOpen(false);
  }

  return (
    <>
      <TrackerScreenLayout playerCount={state.present.playerCount} onOpenSettings={() => setIsSettingsOpen(true)}>
        {state.present.players.map((player, index) => {
          const opponents = state.present.players.filter((candidate) => candidate.id !== player.id);

          return (
            <TrackerPlayerPanel
              key={player.id}
              player={player}
              opponents={opponents}
              styleIndex={index}
              isMonarch={state.present.monarchPlayerId === player.id}
              isInitiative={state.present.initiativePlayerId === player.id}
              counterNames={allCounterNames}
              onNameChange={(name) => dispatch({ type: "set_player_name", playerId: player.id, name })}
              onAdjustLife={(delta) => dispatch({ type: "adjust_life", playerId: player.id, delta })}
              onAdjustPoison={(delta) => dispatch({ type: "adjust_poison", playerId: player.id, delta })}
              onToggleMonarch={() => dispatch({ type: "toggle_monarch", playerId: player.id })}
              onToggleInitiative={() => dispatch({ type: "toggle_initiative", playerId: player.id })}
              onAdjustCommanderDamage={(sourcePlayerId, delta) =>
                dispatch({
                  type: "adjust_commander_damage",
                  targetPlayerId: player.id,
                  sourcePlayerId,
                  delta,
                })
              }
              onAdjustCounter={(name, delta) =>
                dispatch({
                  type: "adjust_custom_counter",
                  playerId: player.id,
                  name,
                  delta,
                })
              }
              onThemeChange={(themeKey) =>
                dispatch({
                  type: "set_player_theme",
                  playerId: player.id,
                  themeKey,
                })
              }
              onBackgroundImageChange={(imageUri, cardName) =>
                dispatch({
                  type: "set_player_background_image",
                  playerId: player.id,
                  imageUri,
                  cardName,
                })
              }
            />
          );
        })}
      </TrackerScreenLayout>

      <TrackerSettingsSheet
        isOpen={isSettingsOpen}
        playerCount={state.present.playerCount}
        startingLife={state.present.startingLife}
        canUndo={canUndo}
        counterName={counterName}
        onClose={() => setIsSettingsOpen(false)}
        onPlayerCountChange={(count) => dispatch({ type: "set_player_count", count })}
        onStartingLifeChange={(life) => dispatch({ type: "set_starting_life", life })}
        onUndo={() => dispatch({ type: "undo" })}
        onQuickReset={runQuickReset}
        onNewGame={runNewGame}
        onCounterNameChange={setCounterName}
        onAddCounter={onAddCustomCounter}
      />
    </>
  );
}