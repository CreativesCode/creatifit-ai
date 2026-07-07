-- Adds plan_id to workout_logs to attribute each logged set to the plan the
-- workout was STARTED from. Enables an accurate "Improve plan": eligibility only
-- counts workouts started from THAT plan, instead of matching by exercise name
-- (ambiguous across plans).
--
-- No FK to plans (on purpose): workout history is preserved even if the plan is
-- deleted, like the rest of workout_logs. plans.id is TEXT, so plan_id is TEXT
-- too. Nullable: logs created before this migration keep plan_id NULL.
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS plan_id TEXT;

CREATE INDEX IF NOT EXISTS idx_workout_logs_plan_id
  ON public.workout_logs(plan_id);
