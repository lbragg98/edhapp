import { describe, expect, it } from "vitest";
import {
  createInitialTrackerState,
  isPlayerEliminated,
  lifeTrackerReducer,
} from "@/modules/tracker/domain/life-tracker";

describe("lifeTrackerReducer", () => {
  it("supports life updates and undo", () => {
    const initial = createInitialTrackerState();
    const player = initial.present.players[0];

    const updated = lifeTrackerReducer(initial, {
      type: "adjust_life",
      playerId: player.id,
      delta: -3,
    });

    expect(updated.present.players[0].life).toBe(initial.present.startingLife - 3);
    expect(updated.past).toHaveLength(1);

    const undone = lifeTrackerReducer(updated, { type: "undo" });

    expect(undone.present.players[0].life).toBe(initial.present.startingLife);
    expect(undone.past).toHaveLength(0);
  });

  it("tracks commander damage by opponent", () => {
    const initial = createInitialTrackerState();
    const target = initial.present.players[0];
    const source = initial.present.players[1];
    const unaffected = initial.present.players[2];

    const next = lifeTrackerReducer(initial, {
      type: "adjust_commander_damage",
      targetPlayerId: target.id,
      sourcePlayerId: source.id,
      delta: 5,
    });

    expect(next.present.players[0].commanderDamageTaken[source.id]).toBe(5);
    expect(next.present.players[2].commanderDamageTaken[source.id]).toBe(
      unaffected.commanderDamageTaken[source.id],
    );
  });

  it("resets values while keeping names on quick reset", () => {
    const initial = createInitialTrackerState();
    const player = initial.present.players[0];

    const withChanges = lifeTrackerReducer(
      lifeTrackerReducer(initial, { type: "set_player_name", playerId: player.id, name: "Logan" }),
      { type: "adjust_poison", playerId: player.id, delta: 3 },
    );

    const reset = lifeTrackerReducer(withChanges, { type: "quick_reset" });
    const resetPlayer = reset.present.players[0];

    expect(resetPlayer.name).toBe("Logan");
    expect(resetPlayer.life).toBe(reset.present.startingLife);
    expect(resetPlayer.poison).toBe(0);
    expect(reset.present.monarchPlayerId).toBeNull();
    expect(reset.present.initiativePlayerId).toBeNull();
  });

  it("stores per-player appearance settings", () => {
    const initial = createInitialTrackerState();
    const player = initial.present.players[0];

    const themed = lifeTrackerReducer(initial, {
      type: "set_player_theme",
      playerId: player.id,
      themeKey: "ocean",
    });

    const withBackground = lifeTrackerReducer(themed, {
      type: "set_player_background_image",
      playerId: player.id,
      imageUri: "https://cards.scryfall.io/normal/front/a/b/example.jpg",
      cardName: "Test Card",
    });

    expect(withBackground.present.players[0].themeKey).toBe("ocean");
    expect(withBackground.present.players[0].backgroundImageUri).toContain("scryfall.io");
    expect(withBackground.present.players[0].backgroundImageCardName).toBe("Test Card");
  });

  it("eliminates players at lethal thresholds and allows temporary revive override", () => {
    const initial = createInitialTrackerState();
    const target = initial.present.players[0];
    const source = initial.present.players[1];

    const lethalCommanderDamage = lifeTrackerReducer(initial, {
      type: "adjust_commander_damage",
      targetPlayerId: target.id,
      sourcePlayerId: source.id,
      delta: 21,
    });

    expect(isPlayerEliminated(lethalCommanderDamage.present.players[0])).toBe(true);

    const revived = lifeTrackerReducer(lethalCommanderDamage, {
      type: "set_player_loss_override",
      playerId: target.id,
      suppressAutoLoss: true,
    });

    expect(isPlayerEliminated(revived.present.players[0])).toBe(false);

    const afterStateChange = lifeTrackerReducer(revived, {
      type: "adjust_life",
      playerId: target.id,
      delta: 1,
    });

    // Any life/poison/commander damage change removes the override and re-evaluates lethal state.
    expect(isPlayerEliminated(afterStateChange.present.players[0])).toBe(true);
  });
});
