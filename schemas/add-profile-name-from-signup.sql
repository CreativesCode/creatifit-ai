-- El alta envia el nombre en los metadatos del usuario (full_name), pero el
-- trigger que crea el perfil solo copiaba el correo: profiles.name quedaba
-- vacio y el panel de administracion no podia mostrar nombres.
-- Este archivo hace que el trigger copie el nombre y rellena los perfiles
-- existentes que lo tienen en los metadatos.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(left(btrim(NEW.raw_user_meta_data->>'full_name'), 80), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

UPDATE public.profiles p
SET name = NULLIF(left(btrim(u.raw_user_meta_data->>'full_name'), 80), '')
FROM auth.users u
WHERE u.id = p.id
  AND (p.name IS NULL OR p.name = '')
  AND NULLIF(btrim(u.raw_user_meta_data->>'full_name'), '') IS NOT NULL;
