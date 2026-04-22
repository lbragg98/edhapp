import type { CardPrintingRecord } from "@/modules/catalog";
import { DetailPanel } from "@/components/cards/detail-panel";
import { formatUsd, selectUsdPrice } from "@/modules/pricing";
import { CardPreviewThumbnail } from "@/components/cards/card-preview";

type CardPrintingsPanelProps = {
  printings: CardPrintingRecord[];
  activePrintingId: string | null;
  onSelectPrinting: (printingId: string) => void;
};

export function CardPrintingsPanel({ printings, activePrintingId, onSelectPrinting }: CardPrintingsPanelProps) {
  return (
    <DetailPanel title="Printings" subtitle="Set and version structure">
      <div className="space-y-2">
        {printings.length === 0 ? (
          <p className="type-body-muted">No print data returned.</p>
        ) : (
          printings.map((printing) => (
            <article
              key={printing.id}
              className={`grid gap-2 rounded-lg border px-3 py-3 text-sm transition-colors sm:grid-cols-[auto_1fr_auto_auto] sm:items-center ${
                activePrintingId === printing.id
                  ? "border-[color:var(--surface-border-strong)] bg-white/[0.05]"
                  : "border-white/10 bg-white/[0.02] hover:border-[color:var(--surface-border-strong)]"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPrinting(printing.id)}
              >
                <CardPreviewThumbnail
                  artCropUri={printing.imageUris.artCrop}
                  normalUri={printing.imageUris.normal}
                  name={`${printing.setCode} ${printing.collectorNumber}`}
                />
              </button>
              <div>
                <p className="font-medium text-zinc-200">{printing.setName}</p>
                <p className="text-xs text-[color:var(--text-subtle)]">
                  {printing.setCode} #{printing.collectorNumber}
                </p>
              </div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">{printing.rarity}</p>
              <div className="text-right">
                <p className="text-xs text-[color:var(--text-subtle)]">{printing.releasedAt ?? "Unknown"}</p>
                <p className="text-xs text-zinc-200">{formatUsd(selectUsdPrice(printing.price, "NONFOIL"))}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </DetailPanel>
  );
}
