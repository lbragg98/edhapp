import type { CardDetailRecord } from "@/modules/catalog";
import { formatUsd, selectUsdPrice } from "@/modules/pricing";
import { CardPreviewExpanded } from "@/components/cards/card-preview";

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
  return (
    <section className="surface-panel grid gap-6 p-5 sm:grid-cols-[200px_1fr] sm:p-6">
      <CardPreviewExpanded
        artCropUri={card.imageUris.artCrop}
        normalUri={card.imageUris.normal ?? card.imageUri}
        name={card.name}
        showFullCard
        maxWidth={200}
        enableLightbox
      />

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
