"use client";

import { useMemo, useState } from "react";
import type { CardDetailRecord } from "@/modules/catalog";
import { buildCardImageGallery } from "@/modules/catalog";
import { DetailPanel } from "@/components/cards/detail-panel";

type CardGalleryPanelProps = {
  card: CardDetailRecord;
  selectedPrintingId: string | null;
};

export function CardGalleryPanel({ card, selectedPrintingId }: CardGalleryPanelProps) {
  const [activeImage, setActiveImage] = useState<{ src: string; label: string } | null>(null);
  const items = useMemo(
    () => buildCardImageGallery(card, selectedPrintingId),
    [card, selectedPrintingId],
  );

  return (
    <>
      <DetailPanel title="Image Gallery" subtitle="Normal, art crop, border crop, and face imagery in one view">
        {items.length === 0 ? (
          <p className="type-body-muted">No gallery images available.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="group overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] text-left transition-colors hover:border-[color:var(--surface-border-strong)]"
                onClick={() => setActiveImage({ src: item.src, label: item.label })}
              >
                <div className="aspect-[4/3] bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.src}
                    alt={item.label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <p className="px-3 py-2 text-xs text-[color:var(--text-subtle)]">{item.label}</p>
              </button>
            ))}
          </div>
        )}
      </DetailPanel>

      {activeImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setActiveImage(null)}
        >
          <div className="max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <p className="mb-3 text-sm text-zinc-200">{activeImage.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage.src}
              alt={activeImage.label}
              className="max-h-[84vh] w-auto rounded-xl border border-white/20"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

