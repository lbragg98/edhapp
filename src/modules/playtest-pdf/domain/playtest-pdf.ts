export type PlaytestPdfImageMode = "full_card" | "art_crop";

export type GeneratePlaytestPdfOptions = {
  includeBasicLands?: boolean;
  selectedEntryIds?: string[];
  imageMode?: PlaytestPdfImageMode;
};

export type PlaytestPrintableCard = {
  id: string;
  name: string;
  imageUri: string | null;
};
