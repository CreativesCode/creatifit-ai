-- Función para ejecutar SQL personalizado en Supabase
-- Esta función permite ejecutar consultas SQL dinámicas para filtrado avanzado
-- IMPORTANTE: Solo para uso interno de la API, no exponer a usuarios finales

CREATE OR REPLACE FUNCTION execute_sql(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  query_result RECORD;
  exercises_array JSONB[] := ARRAY[]::JSONB[];
BEGIN
  -- Validar que la consulta sea segura (solo SELECT)
  IF NOT (query_text ILIKE 'SELECT%' AND query_text NOT ILIKE '%INSERT%' AND query_text NOT ILIKE '%UPDATE%' AND query_text NOT ILIKE '%DELETE%' AND query_text NOT ILIKE '%DROP%' AND query_text NOT ILIKE '%CREATE%' AND query_text NOT ILIKE '%ALTER%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Ejecutar la consulta dinámicamente
  FOR query_result IN EXECUTE query_text
  LOOP
    exercises_array := array_append(exercises_array, to_jsonb(query_result));
  END LOOP;

  -- Convertir el array a JSONB
  result := to_jsonb(exercises_array);
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Devolver error en formato JSON
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION execute_sql(TEXT) IS 'Función para ejecutar consultas SQL personalizadas de solo lectura para filtrado de ejercicios';

-- Verificar que la función se creó correctamente
SELECT 
  routine_name,
  routine_type,
  security_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'execute_sql';
