import type { CardLegalityStatus } from "@/modules/catalog";
import { DetailPanel } from "@/components/cards/detail-panel";

type CardLegalitiesPanelProps = {
  legalities: Record<string, CardLegalityStatus>;
};

const statusClassName: Record<CardLegalityStatus, string> = {
  legal: "text-emerald-300",
  banned: "text-rose-300",
  restricted: "text-amber-300",
  not_legal: "text-zinc-500",
};

function labelForStatus(status: CardLegalityStatus): string {
  return status.replace("_", " ");
}

export function CardLegalitiesPanel({ legalities }: CardLegalitiesPanelProps) {
  const entries = Object.entries(legalities).sort(([left], [right]) => left.localeCompare(right));

  return (
    <DetailPanel title="Legalities" subtitle="Format legality snapshot from Scryfall">
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map(([format, status]) => (
          <div
            key={format}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
          >
            <span className="text-sm capitalize text-zinc-300">{format}</span>
            <span className={`text-xs font-medium uppercase tracking-wide ${statusClassName[status]}`}>
              {labelForStatus(status)}
            </span>
          </div>
        ))}
      </div>
    </DetailPanel>
  );
}
