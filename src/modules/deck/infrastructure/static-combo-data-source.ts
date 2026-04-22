import type { ComboDataSource, KnownComboPattern } from "@/modules/deck/domain/combo-data-source";

const staticCombos: KnownComboPattern[] = [
  {
    id: "combo-exquisite-sanguine",
    label: "Exquisite Blood + Sanguine Bond",
    description: "Life gain and life loss loop that closes the game immediately.",
    pieces: ["Exquisite Blood", "Sanguine Bond"],
    source: "static_combo_seed_v1",
  },
  {
    id: "combo-heliod-ballista",
    label: "Heliod, Sun-Crowned + Walking Ballista",
    description: "Infinite damage once lifelink and +1/+1 counter loop is active.",
    pieces: ["Heliod, Sun-Crowned", "Walking Ballista"],
    source: "static_combo_seed_v1",
  },
  {
    id: "combo-thassa-consult",
    label: "Thassa's Oracle + Demonic Consultation",
    description: "Oracle trigger wins after library is exiled.",
    pieces: ["Thassa's Oracle", "Demonic Consultation"],
    source: "static_combo_seed_v1",
  },
  {
    id: "combo-kiki-conscripts",
    label: "Kiki-Jiki + Zealous Conscripts",
    description: "Infinite hasty attackers through repeated untap copies.",
    pieces: ["Kiki-Jiki, Mirror Breaker", "Zealous Conscripts"],
    source: "static_combo_seed_v1",
  },
  {
    id: "combo-rev-scepter",
    label: "Dramatic Reversal + Isochron Scepter",
    description: "Infinite mana with nonland mana rocks that produce at least three mana total.",
    pieces: ["Dramatic Reversal", "Isochron Scepter"],
    source: "static_combo_seed_v1",
  },
];

export class StaticComboDataSource implements ComboDataSource {
  async listKnownCombos(): Promise<KnownComboPattern[]> {
    return staticCombos;
  }
}

