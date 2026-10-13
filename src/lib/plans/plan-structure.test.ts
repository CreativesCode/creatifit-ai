import { describe, expect, it } from "vitest";
import {
  PLAN_LIMITS,
  addBlocks,
  addDay,
  moveDay,
  removeDay,
  saveBlocker,
  updateBlock,
  type EditableDay,
} from "./plan-structure";

const block = (id: string) => ({
  exercise_id: id,
  name: id,
  sets: 3,
  reps: [8, 12] as [number, number],
  rest_sec: 60,
});

const day = (letter: string, ids: string[] = []): EditableDay => ({
  day: letter,
  focus: "",
  blocks: ids.map(block),
});

describe("días", () => {
  it("etiqueta los días A, B, C… por posición al añadir, quitar y mover", () => {
    let days = addDay(addDay(addDay([])));
    expect(days.map((d) => d.day)).toEqual(["A", "B", "C"]);

    days = removeDay(days, 0);
    expect(days.map((d) => d.day)).toEqual(["A", "B"]);

    const moved = moveDay([day("A", ["x"]), day("B", ["y"])], 0, 1);
    expect(moved.map((d) => [d.day, d.blocks[0].exercise_id])).toEqual([
      ["A", "y"],
      ["B", "x"],
    ]);
  });

  it("no pasa del máximo de días", () => {
    let days: EditableDay[] = [];
    for (let i = 0; i < PLAN_LIMITS.days.max + 3; i++) days = addDay(days);
    expect(days).toHaveLength(PLAN_LIMITS.days.max);
  });
});

describe("ejercicios de un día", () => {
  it("no repite un ejercicio que el día ya tiene", () => {
    const days = addBlocks([day("A", ["x"])], 0, [
      { id: "x", name: "x" },
      { id: "y", name: "y" },
    ]);
    expect(days[0].blocks.map((b) => b.exercise_id)).toEqual(["x", "y"]);
  });

  it("no pasa del máximo de ejercicios por día", () => {
    const many = Array.from({ length: PLAN_LIMITS.blocks.max + 5 }, (_, i) => ({
      id: `e${i}`,
      name: `e${i}`,
    }));
    const days = addBlocks([day("A")], 0, many);
    expect(days[0].blocks).toHaveLength(PLAN_LIMITS.blocks.max);
  });

  it("acota series, repeticiones y descanso", () => {
    const days = updateBlock([day("A", ["x"])], 0, 0, {
      sets: 99,
      reps: [0, 500],
      rest_sec: -5,
    });
    expect(days[0].blocks[0]).toMatchObject({
      sets: PLAN_LIMITS.sets.max,
      reps: [PLAN_LIMITS.reps.min, PLAN_LIMITS.reps.max],
      rest_sec: PLAN_LIMITS.rest.min,
    });
  });

  it("al cruzarse las repeticiones manda el extremo que se movió", () => {
    const raisedMin = updateBlock([day("A", ["x"])], 0, 0, { reps: [15, 12] });
    expect(raisedMin[0].blocks[0].reps).toEqual([15, 15]);

    const loweredMax = updateBlock([day("A", ["x"])], 0, 0, { reps: [8, 5] });
    expect(loweredMax[0].blocks[0].reps).toEqual([5, 5]);
  });
});

describe("saveBlocker", () => {
  it("explica por qué no se puede guardar", () => {
    expect(saveBlocker([])).toBe("no_days");
    expect(saveBlocker([day("A", ["x"]), day("B")])).toBe("empty_day");
    expect(saveBlocker([day("A", ["x"])])).toBeNull();
  });
});
