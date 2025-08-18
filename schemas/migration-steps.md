# 🚀 Guía de Migración: Nueva Estructura de Ejercicios

## **📋 PASOS PARA IMPLEMENTAR LA NUEVA ESTRUCTURA**

### **PASO 1: Ejecutar Script SQL en Supabase**
```sql
-- Ejecutar en Supabase SQL Editor:
-- 1. update-exercises-table-structure.sql
-- 2. example-exercise-insert.sql (opcional, para probar)
```

### **PASO 2: Actualizar Esquemas de Validación**

#### **2.1 Actualizar `src/lib/validators/schemas.ts`**
```typescript
// Agregar nuevo esquema para ejercicios completos
export const ExerciseCompleteSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  kind: z.string(),
  gif_url: z.string().url().optional(),
  equipment: z.string(),
  primary_muscles: z.string(),
  detail_url: z.string().url().optional(),
  category: z.string(),
  page_url: z.string().url().optional(),
  page_number: z.number().optional(),
  page_title: z.string().optional(),
  overview: z.string().optional(),
  instructions: z.array(z.string()).optional(),
  tips: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  muscle_groups_primary: z.array(z.string()).optional(),
  muscle_groups_secondary: z.array(z.string()).optional(),
  meta: z.record(z.any()).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
});

export type ExerciseComplete = z.infer<typeof ExerciseCompleteSchema>;
```

#### **2.2 Crear `src/lib/types/exercise.ts`**
```typescript
export interface ExerciseMuscleDetail {
  primary: string[];
  secondary: string[];
}

export interface ExerciseComplete {
  id: string;
  name: string;
  kind: string;
  gif_url?: string;
  equipment: string;
  primary_muscles: string;
  detail_url?: string;
  category: string;
  page_url?: string;
  page_number?: number;
  page_title?: string;
  overview?: string;
  instructions?: string[];
  tips?: string[];
  benefits?: string[];
  muscle_groups_primary?: string[];
  muscle_groups_secondary?: string[];
  meta?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ExerciseFilters {
  search?: string;
  category?: string;
  equipment?: string;
  difficulty?: string;
  muscle_group?: string;
  kind?: string;
}
```

### **PASO 3: Actualizar API de Ejercicios**

#### **3.1 Modificar `src/app/api/exercises/route.ts`**
```typescript
// Agregar soporte para nuevos campos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const equipment = searchParams.get("equipment");
    const difficulty = searchParams.get("difficulty");
    const muscle_group = searchParams.get("muscle_group");
    const search = searchParams.get("search");
    const kind = searchParams.get("kind");

    let query = supabase
      .from("exercises")
      .select("*")
      .order("name");

    // Aplicar filtros con nuevos campos
    if (category) {
      query = query.eq("category", category);
    }

    if (equipment) {
      query = query.ilike("equipment", `%${equipment}%`);
    }

    if (difficulty) {
      query = query.eq("meta->difficulty", difficulty);
    }

    if (muscle_group) {
      query = query.or(`muscle_groups_primary.cs.{${muscle_group}},muscle_groups_secondary.cs.{${muscle_group}}`);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,overview.ilike.%${search}%`);
    }

    if (kind) {
      query = query.eq("kind", kind);
    }

    const { data: exercises, error } = await query;

    if (error) {
      console.error("Error fetching exercises:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch exercises" },
        { status: 500 }
      );
    }

    // Transformar datos para mantener compatibilidad
    const transformedExercises = exercises?.map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category || exercise.kind,
      equipment: exercise.equipment ? [exercise.equipment] : [],
      muscle_groups: exercise.muscle_groups_primary || [],
      difficulty: exercise.meta?.difficulty || "beginner",
      description: exercise.overview || exercise.meta?.description || `Ejercicio de ${exercise.category || exercise.kind}`,
      instructions: exercise.instructions || exercise.meta?.instructions || [],
      cues: exercise.tips || exercise.meta?.cues || [],
      variations: exercise.meta?.variations || [],
      gif_url: exercise.gif_url,
      benefits: exercise.benefits || [],
      primary_muscles: exercise.primary_muscles,
      muscle_groups_secondary: exercise.muscle_groups_secondary || []
    })) || [];

    return NextResponse.json({
      success: true,
      exercises: transformedExercises,
    });
  } catch (error) {
    console.error("Error in exercises API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **PASO 4: Actualizar Componentes de UI**

#### **4.1 Modificar `src/components/ui/exercise-details.tsx`**
```typescript
// Agregar soporte para nuevos campos
interface ExerciseDetailsProps {
  exercise: {
    name: string;
    category: string;
    difficulty: string;
    description: string;
    equipment: string[];
    muscle_groups: string[];
    instructions: string[];
    cues: string[];
    variations: string[];
    gif_url?: string;
    benefits?: string[];
    primary_muscles?: string;
    muscle_groups_secondary?: string[];
  };
  onClose: () => void;
}
```

#### **4.2 Actualizar `src/app/(app)/exercises/page.tsx`**
```typescript
// Agregar filtros por nuevos campos
const [filters, setFilters] = useState<ExerciseFilters>({
  search: "",
  category: "",
  equipment: "",
  difficulty: "",
  muscle_group: "",
  kind: ""
});

// Actualizar lógica de filtrado
const filteredExercises = exercises.filter(exercise => {
  // ... lógica existente ...
  
  // Agregar filtros por nuevos campos
  if (filters.kind && exercise.kind !== filters.kind) return false;
  if (filters.primary_muscles && !exercise.primary_muscles?.includes(filters.primary_muscles)) return false;
  
  return true;
});
```

### **PASO 5: Actualizar Generación de Planes**

#### **5.1 Modificar `src/app/api/plan/generate/route.ts`**
```typescript
// Actualizar función de filtrado para usar nuevos campos
const filterExercisesByEquipment = (exercises: any[], userEquipment: Record<string, boolean>) => {
  const userEquipmentArray = Object.keys(userEquipment).filter(key => userEquipment[key]);
  
  return exercises.filter(ex => {
    // Usar nuevo campo equipment en lugar de meta->equipment
    const exEquipment = ex.equipment ? [ex.equipment] : ex.meta?.equipment || [];
    
    if (exEquipment.length === 0 || exEquipment.includes('none')) return true;
    
    return exEquipment.some(eq => userEquipmentArray.includes(eq));
  });
};

// Actualizar función de información esencial
const getEssentialExerciseInfo = (exercises: any[]) => {
  return exercises.map(ex => ({
    name: ex.name,
    kind: ex.kind || ex.category,
    difficulty: ex.meta?.difficulty || 'beginner',
    equipment: ex.equipment ? [ex.equipment] : ex.meta?.equipment || [],
    muscle_groups: ex.muscle_groups_primary || ex.meta?.target || []
  }));
};
```

### **PASO 6: Probar la Migración**

#### **6.1 Verificar en Supabase**
```sql
-- Verificar que los nuevos campos existen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exercises' 
ORDER BY ordinal_position;

-- Probar inserción de ejercicio
-- Ejecutar example-exercise-insert.sql

-- Verificar vista completa
SELECT * FROM exercises_complete LIMIT 1;
```

#### **6.2 Probar en la Aplicación**
1. **Generar un plan** - Verificar que funciona con nueva estructura
2. **Navegar a ejercicios** - Verificar que se muestran correctamente
3. **Filtrar ejercicios** - Probar nuevos filtros
4. **Ver detalles** - Verificar que se muestran todos los campos

### **PASO 7: Optimización y Limpieza**

#### **7.1 Crear índices adicionales si es necesario**
```sql
-- Índices para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_exercises_name_search ON exercises USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_exercises_overview_search ON exercises USING gin(to_tsvector('english', overview));
```

#### **7.2 Actualizar RLS si es necesario**
```sql
-- Verificar políticas de seguridad
SELECT * FROM pg_policies WHERE tablename = 'exercises';
```

## **⚠️ CONSIDERACIONES IMPORTANTES**

### **Compatibilidad hacia atrás:**
- **Mantener campo `meta`** para ejercicios existentes
- **Transformar datos** en la API para mantener compatibilidad
- **Migrar gradualmente** ejercicios existentes

### **Rendimiento:**
- **Índices apropiados** para campos de búsqueda
- **Paginación** para listas grandes de ejercicios
- **Caché** para consultas frecuentes

### **Validación:**
- **Validar URLs** de GIFs y enlaces
- **Sanitizar arrays** de instrucciones y tips
- **Validar formato** de equipamiento y músculos

## **🎯 BENEFICIOS DE LA NUEVA ESTRUCTURA**

1. **Mejor organización** de datos de ejercicios
2. **Búsquedas más eficientes** por múltiples criterios
3. **Información más rica** para la UI
4. **Mejor integración** con GPT para generación de planes
5. **Escalabilidad** para futuras funcionalidades

¡La migración está lista para implementar! 🚀✨
