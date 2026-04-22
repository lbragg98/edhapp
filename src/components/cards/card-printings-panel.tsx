import type { CardPrintingRecord } from "@/modules/catalog";
import { DetailPanel } from "@/components/cards/detail-panel";
import { formatUsd, selectUsdPrice } from "@/modules/pricing";

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
                className="h-14 w-10 overflow-hidden rounded border border-white/10 bg-zinc-900"
                onClick={() => onSelectPrinting(printing.id)}
              >
                {printing.imageUris.normal ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={printing.imageUris.normal}
                    alt={`${printing.setCode} ${printing.collectorNumber}`}
                    className="h-full w-full object-cover"
                  />
                ) : null}
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
