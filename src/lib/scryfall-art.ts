export type ScryfallImageSet = {
  normal?: string | null;
  artCrop?: string | null;
};

export function deriveScryfallArtCropUri(normalUri: string | null | undefined): string | null {
  if (!normalUri) {
    return null;
  }

  if (!normalUri.includes("scryfall.io")) {
    return null;
  }

  return normalUri
    .replace("/normal/", "/art_crop/")
    .replace("/large/", "/art_crop/")
    .replace("/small/", "/art_crop/")
    .replace("/png/", "/art_crop/")
    .replace("/border_crop/", "/art_crop/");
}

export function resolveScryfallArtFocusedUri(images: ScryfallImageSet): string | null {
  return images.artCrop ?? deriveScryfallArtCropUri(images.normal) ?? images.normal ?? null;
}