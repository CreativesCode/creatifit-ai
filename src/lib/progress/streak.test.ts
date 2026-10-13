import { describe, expect, it } from "vitest";
import { localDay, parseLocalDay } from "./streak";

describe("día local", () => {
  it("usa la fecha local, no la UTC", () => {
    // 23:30 hora local: sigue siendo el mismo día aunque en UTC ya sea el siguiente.
    expect(localDay(new Date(2026, 9, 12, 23, 30))).toBe("2026-10-12");
    expect(localDay(new Date(2026, 0, 5, 0, 10))).toBe("2026-01-05");
  });

  it("interpreta YYYY-MM-DD como medianoche local y vuelve al mismo día", () => {
    const d = parseLocalDay("2026-03-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 1, 0]);
    expect(localDay(d)).toBe("2026-03-01");
  });
});
