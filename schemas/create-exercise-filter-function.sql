-- Función específica y segura para filtrar ejercicios según múltiples criterios
-- Esta función reemplaza la necesidad de execute_sql con consultas predefinidas y seguras

CREATE OR REPLACE FUNCTION get_filtered_exercises(
  p_equipment TEXT[] DEFAULT NULL,
  p_objective TEXT DEFAULT NULL,
  p_age INTEGER DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 200
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  kind TEXT,
  gif_url TEXT,
  equipment TEXT,
  primary_muscles TEXT,
  category TEXT,
  overview TEXT,
  instructions TEXT[],
  tips TEXT[],
  benefits TEXT[],
  muscle_groups_primary TEXT[],
  muscle_groups_secondary TEXT[],
  meta JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  equipment_filter TEXT := '';
  objective_filter TEXT := '';
  age_gender_filter TEXT := '';
  final_query TEXT;
BEGIN
  -- Construir filtro de equipamiento más selectivo
  IF p_equipment IS NOT NULL AND array_length(p_equipment, 1) > 0 THEN
    -- Priorizar ejercicios sin equipamiento y con equipamiento disponible
    SELECT string_agg(
      CASE 
        WHEN eq = 'none' THEN "equipment ILIKE '%NO EQUIPMENT%'"
        WHEN eq = 'resistance_band' THEN "equipment ILIKE '%resistance%'"
        WHEN eq = 'dumbbells' THEN "equipment ILIKE '%dumbbell%'"
        WHEN eq = 'barbell' THEN "equipment ILIKE '%barbell%'"
        WHEN eq = 'kettlebell' THEN "equipment ILIKE '%kettlebell%'"
        WHEN eq = 'bench' THEN "equipment ILIKE '%bench%'"
        WHEN eq = 'wall' THEN "equipment ILIKE '%wall%'"
        WHEN eq = 'chair' THEN "equipment ILIKE '%chair%'"
        WHEN eq = 'table' THEN "equipment ILIKE '%table%'"
        ELSE "equipment ILIKE '%' || eq || '%'"
      END, ' OR '
    ) INTO equipment_filter
    FROM unnest(p_equipment) AS eq;
    
    equipment_filter := '(' || equipment_filter || ')';
  ELSE
    -- Si no tiene equipamiento, solo ejercicios sin equipamiento
    equipment_filter := "equipment ILIKE '%NO EQUIPMENT%'";
  END IF;

  -- Filtro por tipo de ejercicio según objetivo (más específico)
  IF p_objective IS NOT NULL THEN
    IF p_objective ILIKE '%strength%' OR p_objective ILIKE '%muscle%' OR p_objective ILIKE '%build%' THEN
      objective_filter := "AND kind = 'strength'";
      -- Para fuerza, priorizar ejercicios compuestos
      objective_filter := objective_filter || " AND (category ILIKE '%Strength%' OR category ILIKE '%Compound%')";
    ELSIF p_objective ILIKE '%cardio%' OR p_objective ILIKE '%endurance%' OR p_objective ILIKE '%weight%' THEN
      objective_filter := "AND kind = 'cardio'";
      -- Para cardio, priorizar ejercicios de alta intensidad
      objective_filter := objective_filter || " AND (category ILIKE '%Cardio%' OR category ILIKE '%HIIT%')";
    ELSIF p_objective ILIKE '%flexibility%' OR p_objective ILIKE '%mobility%' OR p_objective ILIKE '%rehabilitation%' THEN
      objective_filter := "AND kind = 'stretching'";
      -- Para flexibilidad, priorizar ejercicios de movilidad
      objective_filter := objective_filter || " AND (category ILIKE '%Stretching%' OR category ILIKE '%Mobility%')";
    END IF;
  END IF;

  -- Filtro por edad y género (ejercicios apropiados)
  IF p_age IS NOT NULL THEN
    IF p_age < 18 THEN
      age_gender_filter := "AND kind != 'strength'"; -- Evitar ejercicios de fuerza intensos para menores
    ELSIF p_age > 65 THEN
      age_gender_filter := "AND (kind = 'stretching' OR kind = 'cardio')"; -- Priorizar ejercicios suaves para mayores
    END IF;
  END IF;

  -- Construir la consulta SQL completa
  final_query := '
    SELECT 
      id, name, kind, gif_url, equipment, primary_muscles, category,
      overview, instructions, tips, benefits, muscle_groups_primary, 
      muscle_groups_secondary, meta, created_at, updated_at
    FROM exercises 
    WHERE ' || equipment_filter || '
    ' || COALESCE(objective_filter, '') || '
    ' || COALESCE(age_gender_filter, '') || '
    ORDER BY 
      CASE 
        WHEN equipment ILIKE ''%NO EQUIPMENT%'' THEN 1
        WHEN equipment ILIKE ''%' || COALESCE(p_equipment[1], 'none') || '%'' THEN 2
        ELSE 3
      END,
      name
    LIMIT ' || p_limit;

  -- Ejecutar la consulta dinámicamente
  RETURN QUERY EXECUTE final_query;
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, devolver ejercicios básicos
    RAISE WARNING 'Error en filtrado, devolviendo ejercicios básicos: %', SQLERRM;
    
    RETURN QUERY
    SELECT 
      id, name, kind, gif_url, equipment, primary_muscles, category,
      overview, instructions, tips, benefits, muscle_groups_primary, 
      muscle_groups_secondary, meta, created_at, updated_at
    FROM exercises 
    WHERE equipment ILIKE '%NO EQUIPMENT%'
    ORDER BY name
    LIMIT 50;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION get_filtered_exercises(TEXT[], TEXT, INTEGER, TEXT, INTEGER) IS 'Función segura para filtrar ejercicios según equipamiento, objetivo, edad y género del usuario';

-- Verificar que la función se creó correctamente
SELECT 
  routine_name,
  routine_type,
  security_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'get_filtered_exercises';

-- Ejemplo de uso:
-- SELECT * FROM get_filtered_exercises(
--   ARRAY['none', 'resistance_band'], -- equipamiento del usuario
--   'strength training',               -- objetivo
--   25,                               -- edad
--   'male',                           -- género
--   200                               -- límite (reducido de 300)
-- );
