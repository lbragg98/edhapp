import type { CardDetailRecord } from "@/modules/catalog";
import { formatUsd, selectUsdPrice } from "@/modules/pricing";

function colorBadge(color: string) {
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-2 text-xs font-medium text-zinc-100">
      {color}
    </span>
  );
}

type CardDetailHeaderProps = {
  card: CardDetailRecord;
};

export function CardDetailHeader({ card }: CardDetailHeaderProps) {
  const primaryImage = card.imageUris.normal ?? card.imageUri;

  return (
    <section className="surface-panel grid gap-6 p-5 sm:grid-cols-[220px_1fr] sm:p-6">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={card.name} src={primaryImage} className="h-full w-full object-cover" />
        ) : (
          <div className="aspect-[2/3]" />
        )}
      </div>

      <div className="space-y-5">
        <div>
          <p className="type-eyebrow">Card Detail</p>
          <h1 className="type-display mt-3 text-3xl sm:text-4xl">{card.name}</h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">{card.typeLine}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {card.colorIdentity.length > 0
            ? card.colorIdentity.map((color) => <span key={color}>{colorBadge(color)}</span>)
            : colorBadge("C")}
          {card.manaCost ? <span className="ml-1 text-sm text-zinc-200">{card.manaCost}</span> : null}
          <span className="ml-2 text-xs text-[color:var(--text-subtle)]">CMC {card.cmc.toFixed(1)}</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] px-3 py-2">
            <p className="type-label">Market (Nonfoil)</p>
            <p className="mt-1 text-sm text-zinc-100">{formatUsd(selectUsdPrice(card.price, "NONFOIL"))}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] px-3 py-2">
            <p className="type-label">Foil</p>
            <p className="mt-1 text-sm text-zinc-100">{formatUsd(selectUsdPrice(card.price, "FOIL"))}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] px-3 py-2">
            <p className="type-label">Etched</p>
            <p className="mt-1 text-sm text-zinc-100">{formatUsd(selectUsdPrice(card.price, "ETCHED"))}</p>
          </div>
        </div>

        {card.faces.length > 0 ? (
          <p className="text-xs text-[color:var(--text-subtle)]">
            Double-faced handling active: {card.faces.map((face) => face.name).join(" // ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
