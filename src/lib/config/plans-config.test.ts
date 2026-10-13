import { describe, expect, it } from "vitest";
import { canGenerate, remainingGenerations } from "./plans-config";

describe("cupo de generaciones con IA", () => {
  it("Free tiene una sola generación", () => {
    expect(canGenerate("free", 0)).toBe(true);
    expect(canGenerate("free", 1)).toBe(false);
    expect(remainingGenerations("free", 1)).toBe(0);
  });

  it("Pro tiene 30 por periodo, mensual y anual", () => {
    expect(canGenerate("pro_monthly", 29)).toBe(true);
    expect(canGenerate("pro_monthly", 30)).toBe(false);
    expect(canGenerate("pro_annual", 29)).toBe(true);
    expect(remainingGenerations("pro_annual", 40)).toBe(0);
  });
});
