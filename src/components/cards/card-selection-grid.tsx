import Link from "next/link";
import type { ReactNode } from "react";
import type { CardSelectionItem } from "@/modules/catalog";
import { toDeckDragCardPayload } from "@/modules/selection";
import { PriceInline } from "@/components/pricing";

type CardSelectionGridProps = {
  items: CardSelectionItem[];
  emptyTitle: string;
  emptyDescription: string;
  getHref: (item: CardSelectionItem) => string;
  renderFooter?: (item: CardSelectionItem) => ReactNode;
};

function colorBadge(color: string) {
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-2 text-xs font-medium text-zinc-100">
      {color}
    </span>
  );
}

export function CardSelectionGrid({
  items,
  emptyTitle,
  emptyDescription,
  getHref,
  renderFooter,
}: CardSelectionGridProps) {
  if (items.length === 0) {
    return (
      <div className="surface-panel p-8">
        <p className="type-title">{emptyTitle}</p>
        <p className="type-body-muted mt-2">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="surface-card interactive-lift group overflow-hidden"
          data-card-drag-payload={JSON.stringify(toDeckDragCardPayload(item.selection))}
        >
          <Link href={getHref(item)} className="block">
          <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-900 to-zinc-800">
            {item.imageUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={item.title}
                src={item.imageUri}
                className="h-full w-full object-cover opacity-85 transition-opacity duration-300 group-hover:opacity-100"
                loading="lazy"
              />
            ) : null}
          </div>
          <div className="space-y-4 p-5">
            <div>
              <h3 className="type-title">{item.title}</h3>
              <p className="mt-1.5 text-xs text-[color:var(--text-subtle)]">{item.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {item.colorIdentity.length > 0
                ? item.colorIdentity.map((color) => (
                    <span key={`${item.id}-${color}`}>{colorBadge(color)}</span>
                  ))
                : colorBadge("C")}
              {item.manaCost ? (
                <span className="ml-auto text-xs text-[color:var(--text-subtle)]">{item.manaCost}</span>
              ) : null}
            </div>
            <div className="flex items-center justify-end">
              <PriceInline price={item.price} />
            </div>
          </div>
          </Link>
          {renderFooter ? <div className="border-t border-white/10 px-5 py-3">{renderFooter(item)}</div> : null}
        </article>
      ))}
    </div>
  );
}
