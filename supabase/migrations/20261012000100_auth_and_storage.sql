-- Lo que CreatiFit AI tiene fuera del esquema public, tal como estaba en el
-- proyecto real el 2026-10-12: el trigger que crea el perfil al registrarse, los
-- dos buckets de Storage y las politicas de las fotos de progreso.
-- Idempotente.

-- Perfil automatico al crear una cuenta (la funcion esta en la linea base).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Buckets: imagenes de ejercicios (publico) y fotos de progreso (privado).
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('CreatiFit AI', 'CreatiFit AI', true),
  ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Fotos de progreso: cada usuario solo ve, sube y borra las de su carpeta
-- ({user_id}/...). No hay politica de UPDATE: una foto no se reemplaza.
DROP POLICY IF EXISTS pp_select_own ON storage.objects;
CREATE POLICY pp_select_own ON storage.objects FOR SELECT
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS pp_insert_own ON storage.objects;
CREATE POLICY pp_insert_own ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS pp_delete_own ON storage.objects;
CREATE POLICY pp_delete_own ON storage.objects FOR DELETE
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
