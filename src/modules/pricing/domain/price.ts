export type PriceSource = "scryfall";

export type PriceSnapshot = {
  source: PriceSource;
  capturedAt: string | null;
  usd: number | null;
  usdFoil: number | null;
  usdEtched: number | null;
  eur: number | null;
  eurFoil: number | null;
  tix: number | null;
};

export type PriceFinish = "NONFOIL" | "FOIL" | "ETCHED";

export type PricedLineItem = {
  quantity: number;
  finish: PriceFinish;
  price: PriceSnapshot | null;
};

export type ValuationEstimate = {
  totalUsd: number;
  pricedQuantity: number;
  missingQuantity: number;
  coverageRatio: number;
};

function normalizeCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function selectUsdPrice(price: PriceSnapshot | null, finish: PriceFinish): number | null {
  if (!price) {
    return null;
  }

  if (finish === "FOIL") {
    return price.usdFoil ?? price.usd ?? null;
  }

  if (finish === "ETCHED") {
    return price.usdEtched ?? price.usdFoil ?? price.usd ?? null;
  }

  return price.usd ?? null;
}

export function estimateValuation(items: PricedLineItem[]): ValuationEstimate {
  let totalUsd = 0;
  let pricedQuantity = 0;
  let missingQuantity = 0;

  for (const item of items) {
    const unit = selectUsdPrice(item.price, item.finish);

    if (unit === null) {
      missingQuantity += item.quantity;
      continue;
    }

    totalUsd += unit * item.quantity;
    pricedQuantity += item.quantity;
  }

  const totalQuantity = pricedQuantity + missingQuantity;

  return {
    totalUsd: normalizeCurrency(totalUsd),
    pricedQuantity,
    missingQuantity,
    coverageRatio: totalQuantity > 0 ? Number((pricedQuantity / totalQuantity).toFixed(4)) : 0,
  };
}

