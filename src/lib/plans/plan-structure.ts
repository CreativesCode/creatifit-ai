// Operaciones puras sobre la estructura de un plan (días y ejercicios). Las usa
// el editor sobre su borrador; nada de aquí toca la red.

// Mismos topes que valida la función SQL save_plan_structure
// (schemas/add-save-plan-structure.sql): cambiar uno obliga a cambiar el otro.
export const PLAN_LIMITS = {
  days: { min: 1, max: 7 },
  blocks: { min: 1, max: 15 },
  sets: { min: 1, max: 10 },
  reps: { min: 1, max: 100 },
  rest: { min: 0, max: 600, step: 15 },
  weeks: { min: 1, max: 52 },
  name: 60,
  focus: 80,
} as const;

export const DEFAULT_BLOCK = { sets: 3, reps: [8, 12] as [number, number], rest_sec: 60 };
export const DEFAULT_WEEKS = 8;

export interface EditableBlock {
  exercise_id?: string;
  name: string;
  sets: number;
  reps: [number, number];
  rest_sec: number;
  cues?: string[];
}

export interface EditableDay {
  day: string;
  focus: string;
  blocks: EditableBlock[];
}

export interface CatalogExercise {
  id: string;
  name: string;
}

export const dayLetter = (index: number) => String.fromCharCode(65 + index);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));

/** Los días se etiquetan A, B, C… por posición, igual que al guardar. */
export const relabelDays = (days: EditableDay[]): EditableDay[] =>
  days.map((d, i) => (d.day === dayLetter(i) ? d : { ...d, day: dayLetter(i) }));

export const canAddDay = (days: EditableDay[]) => days.length < PLAN_LIMITS.days.max;

export function addDay(days: EditableDay[]): EditableDay[] {
  if (!canAddDay(days)) return days;
  return relabelDays([...days, { day: "", focus: "", blocks: [] }]);
}

export function removeDay(days: EditableDay[], index: number): EditableDay[] {
  return relabelDays(days.filter((_, i) => i !== index));
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const moveDay = (days: EditableDay[], from: number, to: number) =>
  relabelDays(move(days, from, to));

const withDay = (
  days: EditableDay[],
  index: number,
  change: (day: EditableDay) => EditableDay
) => days.map((d, i) => (i === index ? change(d) : d));

export const setDayFocus = (days: EditableDay[], index: number, focus: string) =>
  withDay(days, index, (d) => ({ ...d, focus: focus.slice(0, PLAN_LIMITS.focus) }));

/** Sitio libre en el día para más ejercicios. */
export const freeBlocks = (day: EditableDay) =>
  Math.max(0, PLAN_LIMITS.blocks.max - day.blocks.length);

/** Añade ejercicios del catálogo al final del día, con los valores por defecto. */
export function addBlocks(
  days: EditableDay[],
  index: number,
  exercises: CatalogExercise[]
): EditableDay[] {
  return withDay(days, index, (d) => {
    const present = new Set(d.blocks.map((b) => b.exercise_id));
    const fresh = exercises
      .filter((ex) => !present.has(ex.id))
      .slice(0, freeBlocks(d))
      .map((ex) => ({
        exercise_id: ex.id,
        name: ex.name,
        ...DEFAULT_BLOCK,
        reps: [...DEFAULT_BLOCK.reps] as [number, number],
        cues: [],
      }));
    return { ...d, blocks: [...d.blocks, ...fresh] };
  });
}

export const removeBlock = (days: EditableDay[], dayIndex: number, blockIndex: number) =>
  withDay(days, dayIndex, (d) => ({
    ...d,
    blocks: d.blocks.filter((_, i) => i !== blockIndex),
  }));

export const moveBlock = (
  days: EditableDay[],
  dayIndex: number,
  from: number,
  to: number
) => withDay(days, dayIndex, (d) => ({ ...d, blocks: move(d.blocks, from, to) }));

/** Cambia series, repeticiones o descanso de un bloque, dentro de los topes. */
export function updateBlock(
  days: EditableDay[],
  dayIndex: number,
  blockIndex: number,
  patch: Partial<Pick<EditableBlock, "sets" | "reps" | "rest_sec">>
): EditableDay[] {
  return withDay(days, dayIndex, (d) => ({
    ...d,
    blocks: d.blocks.map((b, i) => {
      if (i !== blockIndex) return b;
      const sets = clamp(patch.sets ?? b.sets, PLAN_LIMITS.sets.min, PLAN_LIMITS.sets.max);
      const rest_sec = clamp(
        patch.rest_sec ?? b.rest_sec,
        PLAN_LIMITS.rest.min,
        PLAN_LIMITS.rest.max
      );
      let [lo, hi] = patch.reps ?? b.reps;
      lo = clamp(lo, PLAN_LIMITS.reps.min, PLAN_LIMITS.reps.max);
      hi = clamp(hi, PLAN_LIMITS.reps.min, PLAN_LIMITS.reps.max);
      // Al cruzarse, manda el extremo que el usuario acaba de mover.
      if (lo > hi) {
        if (patch.reps && patch.reps[0] !== b.reps[0]) hi = lo;
        else lo = hi;
      }
      return { ...b, sets, rest_sec, reps: [lo, hi] as [number, number] };
    }),
  }));
}

/** Motivo por el que el plan aún no se puede guardar, o null si está listo. */
export function saveBlocker(days: EditableDay[]): "no_days" | "empty_day" | null {
  if (days.length < PLAN_LIMITS.days.min) return "no_days";
  if (days.some((d) => d.blocks.length < PLAN_LIMITS.blocks.min)) return "empty_day";
  return null;
}
