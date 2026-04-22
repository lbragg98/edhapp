"use client";

import { useState } from "react";
import type { ReactNode } from "react";

/**
 * Card Preview Component System
 *
 * Three variants for different contexts:
 *
 * 1. **CardPreviewThumbnail** (compact)
 *    - Use in: deck lists, search results within panels, printing selectors, quick pickers
 *    - Size: 40x56px (w-10 h-14) - fits in a row alongside text
 *    - Shows: art crop only, no metadata overlay
 *
 * 2. **CardPreviewStandard** (standard)
 *    - Use in: grid browsing, library view, card selection grids
 *    - Size: Constrained aspect-[5/4] with max-h for predictable layout
 *    - Shows: art crop with subtle gradient overlay for text readability
 *
 * 3. **CardPreviewExpanded** (expanded)
 *    - Use in: hover cards, side panels, modals, detail views, focus states
 *    - Size: Up to 220px wide, maintains card aspect ratio
 *    - Shows: full card image or art crop, allows interaction
 */

type CardPreviewBaseProps = {
  /** Scryfall art_crop URL preferred for visual browsing */
  artCropUri?: string | null;
  /** Scryfall normal image URL for full card display */
  normalUri?: string | null;
  /** Card name for alt text */
  name: string;
  /** Additional class names */
  className?: string;
};

// ────────────────────────────────────────────────────────────────────────────
// Thumbnail Variant
// ────────────────────────────────────────────────────────────────────────────

type CardPreviewThumbnailProps = CardPreviewBaseProps;

/**
 * Compact thumbnail for row-based layouts (deck lists, printings, pickers).
 * Fixed 40x56px size, uses art crop, prioritizes space efficiency.
 */
export function CardPreviewThumbnail({
  artCropUri,
  normalUri,
  name,
  className = "",
}: CardPreviewThumbnailProps) {
  const src = artCropUri ?? normalUri;

  return (
    <div
      className={`h-14 w-10 shrink-0 overflow-hidden rounded border border-white/10 bg-zinc-900 ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[8px] text-zinc-600">
          ?
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Standard Variant
// ────────────────────────────────────────────────────────────────────────────

type CardPreviewStandardProps = CardPreviewBaseProps & {
  /** Optional overlay content (metadata, badges) positioned at bottom */
  overlay?: ReactNode;
  /** Enable subtle hover effect */
  interactive?: boolean;
};

/**
 * Standard preview for grid browsing and card selection.
 * Constrained 5:4 aspect ratio with max height, uses art crop.
 * Typography and metadata should remain primary - image is atmosphere.
 */
export function CardPreviewStandard({
  artCropUri,
  normalUri,
  name,
  className = "",
  overlay,
  interactive = false,
}: CardPreviewStandardProps) {
  const src = artCropUri ?? normalUri;

  return (
    <div
      className={`relative aspect-[5/4] max-h-44 w-full overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 ${
        interactive ? "group" : ""
      } ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={`h-full w-full object-cover opacity-75 ${
            interactive
              ? "transition-opacity duration-300 group-hover:opacity-90"
              : ""
          }`}
          loading="lazy"
        />
      ) : null}

      {/* Subtle gradient for text readability if overlay present */}
      {overlay ? (
        <>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">{overlay}</div>
        </>
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Expanded Variant
// ────────────────────────────────────────────────────────────────────────────

type CardPreviewExpandedProps = CardPreviewBaseProps & {
  /** Show full card image instead of art crop */
  showFullCard?: boolean;
  /** Max width constraint */
  maxWidth?: number;
  /** Enable click to view full size in modal */
  enableLightbox?: boolean;
};

/**
 * Expanded preview for detail views, side panels, modals, hover states.
 * Constrained max-width (default 220px), shows either art crop or full card.
 * Reserved for focused attention contexts, not browsing.
 */
export function CardPreviewExpanded({
  artCropUri,
  normalUri,
  name,
  className = "",
  showFullCard = false,
  maxWidth = 220,
  enableLightbox = false,
}: CardPreviewExpandedProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const src = showFullCard ? (normalUri ?? artCropUri) : (artCropUri ?? normalUri);

  const imageElement = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className="h-full w-full object-cover"
      loading="lazy"
    />
  ) : (
    <div className="flex aspect-[2/3] items-center justify-center text-sm text-zinc-600">
      No image
    </div>
  );

  return (
    <>
      <div
        className={`overflow-hidden rounded-xl border border-white/10 bg-zinc-900 ${
          enableLightbox ? "cursor-pointer transition-transform hover:scale-[1.02]" : ""
        } ${className}`}
        style={{ maxWidth }}
        onClick={enableLightbox ? () => setLightboxOpen(true) : undefined}
        role={enableLightbox ? "button" : undefined}
        tabIndex={enableLightbox ? 0 : undefined}
        onKeyDown={
          enableLightbox
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") setLightboxOpen(true);
              }
            : undefined
        }
      >
        {imageElement}
      </div>

      {/* Lightbox modal */}
      {enableLightbox && lightboxOpen && normalUri ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="max-h-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm text-zinc-200">{name}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={normalUri}
              alt={name}
              className="max-h-[84vh] w-auto rounded-xl border border-white/20"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Utility: Select best image source
// ────────────────────────────────────────────────────────────────────────────

/**
 * Helper to select the appropriate image URI based on context.
 * Prefers art crop for browsing, normal for detail views.
 */
export function selectCardImageUri(
  imageUris: { artCrop?: string | null; normal?: string | null } | null | undefined,
  preferArtCrop = true,
): string | null {
  if (!imageUris) return null;
  if (preferArtCrop) {
    return imageUris.artCrop ?? imageUris.normal ?? null;
  }
  return imageUris.normal ?? imageUris.artCrop ?? null;
}
