import Link from "next/link";
import type { ReactNode } from "react";
import type { CardSelectionItem } from "@/modules/catalog";
import { toDeckDragCardPayload } from "@/modules/selection";
import { EmptyState } from "@/components/primitives";
import { PriceInline } from "@/components/pricing";
import { CardPreviewStandard } from "@/components/cards/card-preview";

type CardSelectionGridProps = {
  items: CardSelectionItem[];
  emptyIcon?: ReactNode;
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
  emptyIcon,
  emptyTitle,
  emptyDescription,
  getHref,
  renderFooter,
}: CardSelectionGridProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
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
          <CardPreviewStandard
            normalUri={item.imageUri}
            name={item.title}
            interactive
          />
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
