export type DeckAnalyticsExtension = {
  computeManaCurve: (deckId: string) => Promise<unknown>;
};

export type DeckRecommendationExtension = {
  suggestAdds: (deckId: string, analytics: unknown) => Promise<unknown>;
};

export type DeckPricingOverlayExtension = {
  annotateDeckPrices: (deckId: string) => Promise<unknown>;
};
