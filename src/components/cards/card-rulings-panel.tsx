import type { CardRulingRecord } from "@/modules/catalog";
import { DetailPanel } from "@/components/cards/detail-panel";

type CardRulingsPanelProps = {
  rulings: CardRulingRecord[];
};

export function CardRulingsPanel({ rulings }: CardRulingsPanelProps) {
  return (
    <DetailPanel title="Official Rulings" subtitle="Oracle text and rulings are kept separate for clarity">
      <div className="space-y-2">
        {rulings.length === 0 ? (
          <p className="type-body-muted">No rulings returned for this card.</p>
        ) : (
          rulings.map((ruling, index) => (
            <article
              key={`${ruling.publishedAt}-${index}`}
              className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] px-3 py-3"
            >
              <p className="text-xs uppercase tracking-wide text-[color:var(--text-subtle)]">
                {ruling.source} • {ruling.publishedAt}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-zinc-200">{ruling.comment}</p>
            </article>
          ))
        )}
      </div>
    </DetailPanel>
  );
}

