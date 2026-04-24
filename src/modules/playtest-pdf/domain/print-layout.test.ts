import { describe, expect, it } from "vitest";
import { mmToPoints, pageLayoutPoints } from "@/modules/playtest-pdf/domain/print-layout";

describe("print layout card dimensions", () => {
  it("converts 63mm x 88mm to exact proxy point dimensions", () => {
    expect(mmToPoints(63)).toBeCloseTo(178.58, 2);
    expect(mmToPoints(88)).toBeCloseTo(249.45, 2);
    expect(pageLayoutPoints.cardWidth).toBeCloseTo(178.58, 2);
    expect(pageLayoutPoints.cardHeight).toBeCloseTo(249.45, 2);
  });
});

