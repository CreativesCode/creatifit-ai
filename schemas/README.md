# 🏋️‍♂️ Scripts SQL para Tabla de Ejercicios

## **📋 ARCHIVOS DISPONIBLES**

### **1. 🗑️ `cleanup-and-recreate.sql`**

- **Propósito**: Limpiar completamente la base de datos de ejercicios
- **⚠️ ADVERTENCIA**: Elimina TODOS los datos existentes
- **Uso**: Ejecutar PRIMERO si quieres empezar desde cero

### **2. 🏗️ `create-exercises-table-from-scratch.sql`**

- **Propósito**: Crear la tabla de ejercicios desde cero con estructura completa
- **Contenido**:
  - Tabla principal `exercises`
  - Tabla secundaria `exercise_muscles_detail`
  - Índices optimizados
  - Funciones helper
  - Vista `exercises_complete`
  - Triggers automáticos

### **3. 📝 `example-exercises-insert.sql`**

- **Propósito**: Insertar ejercicios de ejemplo con la nueva estructura
- **Ejercicios incluidos**:
  - Barbell Bench Press
  - Push-ups (Bodyweight)
  - Bodyweight Squats
  - Plank
  - Pull-ups

## **🚀 ORDEN DE EJECUCIÓN**

### **OPCIÓN A: Empezar desde cero (RECOMENDADO)**

```sql
-- 1. Limpiar todo
-- Ejecutar en Supabase SQL Editor:
cleanup-and-recreate.sql

-- 2. Crear nueva estructura
create-exercises-table-from-scratch.sql

-- 3. Insertar ejercicios de ejemplo
example-exercises-insert.sql
```

### **OPCIÓN B: Modificar tabla existente**

```sql
-- Solo si quieres mantener datos existentes:
update-exercises-table-structure.sql
```

## **🏗️ ESTRUCTURA DE LA TABLA**

### **Campos Principales (🟢 Obligatorios)**

```sql
- id (UUID, PRIMARY KEY)
- name (TEXT, NOT NULL)
- kind (TEXT, NOT NULL) -- strength, cardio, flexibility, etc.
- gif_url (TEXT)
- equipment (TEXT, NOT NULL)
- primary_muscles (TEXT, NOT NULL)
- detail_url (TEXT)
- category (TEXT, NOT NULL) -- Chest, Back, Legs, etc.
- page_url (TEXT)
- page_number (INTEGER)
```

### **Campos Detallados (🟡 Opcionales)**

```sql
- page_title (TEXT)
- overview (TEXT)
- instructions (TEXT[]) -- Array de strings
- tips (TEXT[]) -- Array de strings
- benefits (TEXT[]) -- Array de strings
```

### **Campos de Metadatos (🟠 Opcionales)**

```sql
- muscle_groups_primary (TEXT[]) -- Array de strings
- muscle_groups_secondary (TEXT[]) -- Array de strings
- meta (JSONB) -- Para compatibilidad y datos adicionales
```

### **Timestamps**

```sql
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE) -- Se actualiza automáticamente
```

## **🔧 FUNCIONES DISPONIBLES**

### **1. `insert_exercise_muscles(exercise_id, muscles_detail)`**

- Inserta músculos detallados para un ejercicio
- `muscles_detail` debe ser JSONB con estructura `{"primary": [...], "secondary": [...]}`

### **2. `get_exercise_muscles_detail(exercise_id)`**

- Retorna músculos organizados por grupo (primary/secondary)

### **3. `search_exercises(search_term)`**

- Búsqueda de texto en nombre, descripción, músculos y categoría
- Retorna resultados ordenados por similitud

### **4. `get_exercises_by_equipment(equipment_list)`**

- Filtra ejercicios por equipamiento disponible
- Incluye ejercicios sin equipamiento (bodyweight)

### **5. `get_exercises_by_muscles(muscle_list)`**

- Filtra ejercicios por músculos específicos
- Busca en músculos primarios y secundarios

## **📊 VISTAS DISPONIBLES**

### **`exercises_complete`**

- Vista que combina ejercicios con músculos detallados
- Incluye función `get_exercise_muscles_detail()`

## **🔍 ÍNDICES CREADOS**

### **Índices Básicos**

```sql
- idx_exercises_name
- idx_exercises_kind
- idx_exercises_category
- idx_exercises_equipment
- idx_exercises_primary_muscles
```

### **Índices GIN (para arrays y JSONB)**

```sql
- idx_exercises_muscle_groups_primary
- idx_exercises_muscle_groups_secondary
- idx_exercises_meta_target
```

### **Índices de Búsqueda de Texto**

```sql
- idx_exercises_name_search (tsvector)
- idx_exercises_overview_search (tsvector)
- idx_exercises_instructions_search (tsvector)
```

## **📝 EJEMPLOS DE USO**

### **Insertar un ejercicio**

```sql
INSERT INTO exercises (
    name, kind, equipment, primary_muscles, category,
    overview, instructions, tips, benefits
) VALUES (
    'Ejercicio Ejemplo',
    'strength',
    'Dumbbells',
    'Biceps, Triceps',
    'Arms',
    'Descripción del ejercicio...',
    ARRAY['Instrucción 1', 'Instrucción 2'],
    ARRAY['Tip 1', 'Tip 2'],
    ARRAY['Beneficio 1', 'Beneficio 2']
);
```

### **Buscar ejercicios**

```sql
-- Por texto
SELECT * FROM search_exercises('chest');

-- Por equipamiento
SELECT * FROM get_exercises_by_equipment(ARRAY['Dumbbells', 'Barbell']);

-- Por músculos
SELECT * FROM get_exercises_by_muscles(ARRAY['Chest', 'Back']);
```

### **Consultas personalizadas**

```sql
-- Ejercicios de fuerza para principiantes
SELECT name, category, equipment
FROM exercises
WHERE kind = 'strength'
AND meta->>'difficulty' = 'beginner'
ORDER BY name;

-- Ejercicios que trabajan el pecho
SELECT name, equipment, primary_muscles
FROM exercises
WHERE 'Chest' = ANY(muscle_groups_primary)
OR primary_muscles ILIKE '%Chest%'
ORDER BY name;
```

## **⚠️ CONSIDERACIONES IMPORTANTES**

### **1. Compatibilidad**

- El campo `meta` mantiene compatibilidad con estructura existente
- Las funciones transforman datos entre formatos

### **2. Rendimiento**

- Índices optimizados para consultas comunes
- Búsquedas de texto con tsvector para mejor rendimiento

### **3. Validación**

- Restricciones CHECK en campos críticos
- Triggers automáticos para `updated_at`

### **4. Escalabilidad**

- Estructura preparada para 4000+ ejercicios
- Funciones optimizadas para grandes volúmenes

## **🎯 PRÓXIMOS PASOS**

### **1. Ejecutar scripts en Supabase**

- Usar SQL Editor
- Ejecutar en orden especificado

### **2. Probar la estructura**

- Verificar que las tablas se crearon correctamente
- Probar las funciones de búsqueda
- Verificar la vista completa

### **3. Insertar ejercicios reales**

- Usar la estructura como plantilla
- Adaptar para tu base de datos de 4000+ ejercicios

### **4. Integrar con la aplicación**

- Actualizar API endpoints
- Modificar componentes UI
- Probar generación de planes

¡La nueva estructura de ejercicios está lista para implementar! 🚀✨
