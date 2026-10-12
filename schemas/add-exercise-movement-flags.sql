-- Marca cada ejercicio con los patrones de movimiento que un usuario puede
-- pedir evitar en el cuestionario (restricciones fisicas):
--   jumps          saltos y pliometria
--   high_impact    alto impacto (incluye todos los saltos, carrera, golpes)
--   heavy_lifting  levantamientos pesados (peso muerto, olimpicos, barra cargada)
--
-- La clasificacion sale del nombre del ejercicio, con reglas fijas y revisables.
-- generate-plan excluye del catalogo los ejercicios marcados con una restriccion
-- activa, asi el modelo no puede elegirlos. Un trigger clasifica los ejercicios
-- nuevos o renombrados; para reclasificar todo tras cambiar las reglas basta con
-- volver a ejecutar este archivo.

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS movement_flags text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.exercise_movement_flags(p_name text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  WITH f AS (
    SELECT
      (
        p_name ~* '\m(jumps?|jumping|hops?|hopping|leaps?|bounds?|bounding|plyo|plyometrics?|burpees?|skips?|skipping|skaters?|bunny)\M'
        AND p_name !~* '\mskater squat\M'
      ) AS j,
      (
        p_name ~* '\m(run|running|sprints?|sprinter|sprinting|high knees|butt kicks?|mountain climbers?|slams?|shuffle|jog|jogging|drills?|fast feet|battle rope)\M'
        AND p_name !~* '\m(bike|wheel run)\M'
      ) AS i,
      (
        (
          p_name ~* '\m(deadlifts?|clean|snatch|jerk|good mornings?|rack pull|thrusters?|zercher|farmers?|hack squat|leg press|t-bar|trap bar)\M'
          OR p_name ~* '\mbarbell\M.*\m(squat|lunge|row|press|thrusts?|step-up|shrug|bridge)\M'
          OR p_name ~* '^(bench press|back squat|front squat|military press|overhead press|close grip bench press)$'
        )
        AND p_name !~* '\m(bodyweight|band|banded|stretch|stick|pvc|kettlebell swing)\M'
      ) AS h
  )
  SELECT array_remove(
    ARRAY[
      CASE WHEN j THEN 'jumps' END,
      CASE WHEN j OR i THEN 'high_impact' END,
      CASE WHEN h THEN 'heavy_lifting' END
    ],
    NULL
  )
  FROM f;
$$;

CREATE OR REPLACE FUNCTION public.set_exercise_movement_flags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.movement_flags := public.exercise_movement_flags(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exercises_movement_flags ON public.exercises;
CREATE TRIGGER exercises_movement_flags
  BEFORE INSERT OR UPDATE OF name ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_exercise_movement_flags();

UPDATE public.exercises
SET movement_flags = public.exercise_movement_flags(name)
WHERE movement_flags IS DISTINCT FROM public.exercise_movement_flags(name);
