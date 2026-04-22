"use client";

import { useState } from "react";
import type { CardDetailRecord } from "@/modules/catalog";
import { CardDetailHeader } from "@/components/cards/card-detail-header";
import { CardLegalitiesPanel } from "@/components/cards/card-legalities-panel";
import { CardOraclePanel } from "@/components/cards/card-oracle-panel";
import { CardPrintingsPanel } from "@/components/cards/card-printings-panel";
import { CardRulingsPanel } from "@/components/cards/card-rulings-panel";
import { CardGalleryPanel } from "@/components/cards/card-gallery-panel";

type CardIntelligenceWorkspaceProps = {
  card: CardDetailRecord;
};

type TabId = "overview" | "rulings" | "prints" | "gallery";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "rulings", label: "Rulings" },
  { id: "prints", label: "Print Variants" },
  { id: "gallery", label: "Gallery" },
];

export function CardIntelligenceWorkspace({ card }: CardIntelligenceWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [activePrintingId, setActivePrintingId] = useState<string | null>(card.printings.at(0)?.id ?? null);

  return (
    <div className="space-y-5">
      <CardDetailHeader card={card} />

      <section className="surface-panel p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-link ${activeTab === tab.id ? "nav-link-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "overview" ? (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <CardOraclePanel oracleText={card.oracleText} />
          <CardLegalitiesPanel legalities={card.legalities} />
        </div>
      ) : null}

      {activeTab === "rulings" ? <CardRulingsPanel rulings={card.rulings} /> : null}

      {activeTab === "prints" ? (
        <CardPrintingsPanel
          printings={card.printings}
          activePrintingId={activePrintingId}
          onSelectPrinting={setActivePrintingId}
        />
      ) : null}

      {activeTab === "gallery" ? (
        <CardGalleryPanel card={card} selectedPrintingId={activePrintingId} />
      ) : null}
    </div>
  );
}

