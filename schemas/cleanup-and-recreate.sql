-- Script de limpieza y recreación completa de la tabla exercises
-- ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos existentes

-- 1. Eliminar tablas existentes (si existen) - FORZAR ELIMINACIÓN
DROP TABLE IF EXISTS exercise_muscles_detail CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;

-- Verificar eliminación y forzar si es necesario
DO $$
BEGIN
    -- Intentar eliminar con diferentes esquemas posibles
    BEGIN
        DROP TABLE IF EXISTS public.exercise_muscles_detail CASCADE;
        DROP TABLE IF EXISTS public.exercises CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Advertencia: No se pudieron eliminar algunas tablas del esquema public';
    END;
    
    -- Verificar que las tablas se eliminaron completamente
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercises' AND table_schema = 'public') THEN
        RAISE EXCEPTION '❌ ERROR: No se pudo eliminar la tabla exercises. Verifica permisos.';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_muscles_detail' AND table_schema = 'public') THEN
        RAISE EXCEPTION '❌ ERROR: No se pudo eliminar la tabla exercise_muscles_detail. Verifica permisos.';
    END IF;
    
    RAISE NOTICE '✅ Tablas eliminadas correctamente';
END $$;

-- 2. Eliminar funciones existentes (si existen)
DROP FUNCTION IF EXISTS insert_exercise_muscles(UUID, JSONB);
DROP FUNCTION IF EXISTS get_exercise_muscles_detail(UUID);
DROP FUNCTION IF EXISTS search_exercises(TEXT);
DROP FUNCTION IF EXISTS get_exercises_by_equipment(TEXT[]);
DROP FUNCTION IF EXISTS get_exercises_by_muscles(TEXT[]);
DROP FUNCTION IF EXISTS update_exercises_updated_at();

-- 3. Eliminar triggers existentes (si existen)
DROP TRIGGER IF EXISTS trigger_exercises_updated_at ON exercises;

-- 4. Eliminar vistas existentes (si existen)
DROP VIEW IF EXISTS exercises_complete;

-- 5. Verificar que las tablas se eliminaron
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('exercises', 'exercise_muscles_detail');

-- 6. Verificar que las funciones se eliminaron
SELECT 
    schemaname,
    proname,
    prosrc
FROM pg_proc 
WHERE proname IN (
    'insert_exercise_muscles',
    'get_exercise_muscles_detail',
    'search_exercises',
    'get_exercises_by_equipment',
    'get_exercises_by_muscles',
    'update_exercises_updated_at'
);

-- 7. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Limpieza completada. Las tablas exercises y exercise_muscles_detail han sido eliminadas.';
    RAISE NOTICE '📝 Ahora puedes ejecutar: create-exercises-table-from-scratch.sql';
    RAISE NOTICE '🎯 Y luego: example-exercises-insert.sql para insertar ejercicios de ejemplo';
END $$;
