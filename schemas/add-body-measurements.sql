-- =====================================================
-- Feature: Seguimiento corporal (peso, medidas y fotos de progreso)
-- Tabla owner-only + bucket privado de Storage con RLS por carpeta de usuario.
-- Idempotente: se puede re-ejecutar sin error.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.body_measurements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  weight      NUMERIC,        -- kg
  body_fat    NUMERIC,        -- % opcional
  chest       NUMERIC,        -- cm
  waist       NUMERIC,        -- cm
  hips        NUMERIC,        -- cm
  arms        NUMERIC,        -- cm
  thighs      NUMERIC,        -- cm
  photo_path  TEXT,           -- ruta en el bucket 'progress-photos' ({user_id}/...)
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date
  ON public.body_measurements(user_id, date DESC);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- Policies owner-only (cada usuario solo ve/edita lo suyo)
DROP POLICY IF EXISTS "bm_select_own" ON public.body_measurements;
CREATE POLICY "bm_select_own" ON public.body_measurements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bm_insert_own" ON public.body_measurements;
CREATE POLICY "bm_insert_own" ON public.body_measurements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bm_update_own" ON public.body_measurements;
CREATE POLICY "bm_update_own" ON public.body_measurements
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bm_delete_own" ON public.body_measurements;
CREATE POLICY "bm_delete_own" ON public.body_measurements
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Storage: bucket privado para fotos de progreso
-- Cada usuario guarda en {auth.uid()}/archivo.jpg → la 1ª carpeta debe ser su id.
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pp_select_own" ON storage.objects;
CREATE POLICY "pp_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "pp_insert_own" ON storage.objects;
CREATE POLICY "pp_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "pp_delete_own" ON storage.objects;
CREATE POLICY "pp_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- Fix pendiente (memoria): workout_logs.user_id sin DEFAULT hacía fallar el
-- guardado por RLS. Lo aplicamos aquí porque rachas/historial dependen de ello.
-- =====================================================
ALTER TABLE public.workout_logs ALTER COLUMN user_id SET DEFAULT auth.uid();
