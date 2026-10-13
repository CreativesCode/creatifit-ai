import { describe, expect, it } from "vitest";
import { GeneratedPlanSchema } from "./schemas";

const plan = (reps: unknown) => ({
  weeks: 8,
  days: [
    {
      day: "A",
      focus: "Espalda",
      blocks: [{ name: "Band Seated Row", sets: 3, reps, rest_sec: 60 }],
    },
  ],
});

describe("GeneratedPlanSchema", () => {
  it("acepta un plan con repeticiones [mín, máx]", () => {
    expect(GeneratedPlanSchema.parse(plan([8, 12])).days[0].blocks[0].reps).toEqual([8, 12]);
  });

  it("rechaza repeticiones que no son un par", () => {
    expect(GeneratedPlanSchema.safeParse(plan([8])).success).toBe(false);
    expect(GeneratedPlanSchema.safeParse(plan([8, 10, 12])).success).toBe(false);
    expect(GeneratedPlanSchema.safeParse(plan("8-12")).success).toBe(false);
  });
});
