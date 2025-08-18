# 🏠 CreatiFit AI - Biblioteca de Ejercicios para Casa

## 📋 Archivos de Ejercicios

Hemos creado **3 archivos SQL** con una biblioteca completa de ejercicios para casa:

### 1. `exercises-home.sql` - Ejercicios Básicos

- **45+ ejercicios** sin equipamiento
- **Categorías:** Push, Pull, Squat, Hinge, Core, Cardio
- **Dificultad:** Beginner a Advanced
- **Equipamiento:** Ninguno, pared, silla

### 2. `exercises-equipment.sql` - Con Equipamiento

- **60+ ejercicios** con equipamiento doméstico
- **Equipamiento:** Bandas elásticas, mancuernas, silla, pared, barra fija
- **Variaciones:** Diferentes niveles de resistencia y dificultad

### 3. `exercises-advanced.sql` - Avanzados y Especializados

- **50+ ejercicios** avanzados y funcionales
- **Objetivos:** Pérdida de grasa, ganancia muscular, flexibilidad, equilibrio
- **Tipos:** Movimientos compuestos, coordinación, recuperación

## 🚀 Cómo Usar

### **Paso 1: Ejecutar en Supabase**

1. Ve a tu proyecto Supabase
2. **SQL Editor** → **New query**
3. Copia y pega **UNO** de los archivos
4. **Ejecuta** (botón "Run")
5. Repite para los otros archivos

### **Paso 2: Verificar**

- Ve a **Table Editor** → **exercises**
- Deberías ver **150+ ejercicios** organizados por categorías

## 🎯 Categorías de Ejercicios

### **Por Tipo de Movimiento:**

- **Push:** Empujes (pecho, hombros, tríceps)
- **Pull:** Tirones (espalda, bíceps)
- **Squat:** Sentadillas y variaciones
- **Hinge:** Bisagras (deadlifts, puentes)
- **Core:** Abdominales y estabilidad
- **Cardio:** Cardiovascular y HIIT

### **Por Equipamiento:**

- **Ninguno:** Solo peso corporal
- **Básico:** Pared, silla, mesa
- **Resistencia:** Bandas elásticas
- **Peso:** Mancuernas
- **Especializado:** Barra fija, esterilla, plataforma vibratoria

### **Por Dificultad:**

- **Beginner:** Principiantes
- **Intermediate:** Intermedios
- **Advanced:** Avanzados

## 🧠 Cómo GPT Selecciona Ejercicios

### **Flujo de Selección:**

1. **Usuario llena formulario** con:

   - Objetivo (pérdida de grasa, ganancia muscular, etc.)
   - Nivel (beginner, intermediate, advanced)
   - Equipamiento disponible
   - Preferencias y restricciones

2. **GPT analiza** y selecciona ejercicios de la BD que:

   - Coincidan con el equipamiento disponible
   - Sean apropiados para el nivel del usuario
   - Se alineen con el objetivo
   - Crean un plan balanceado

3. **La app enlaza** los ejercicios por ID desde la BD

### **Ejemplo de Selección:**

```json
{
  "objective": "fat_loss",
  "level": "beginner",
  "equipment": ["resistance band", "chair"],
  "constraints": ["no_jumps", "low_impact"]
}
```

**GPT seleccionaría:**

- Band Rows (pull)
- Band Squats (squat)
- Chair Dips (push)
- Plank (core)
- Mountain Climbers (cardio)

## 📊 Metadatos de Ejercicios

Cada ejercicio incluye metadatos ricos:

```json
{
  "equipment": ["resistance band", "chair"],
  "difficulty": "intermediate",
  "target": ["chest", "triceps", "core"],
  "category": "push",
  "variations": ["easier", "harder"]
}
```

## 🔄 Próximos Pasos

1. **Ejecutar los 3 archivos SQL** en Supabase
2. **Verificar** que se crearon todos los ejercicios
3. **Probar** la generación de planes con GPT
4. **Agregar más ejercicios** según sea necesario

## 💡 Ideas para Futuras Expansiones

- **Ejercicios por edad** (niños, adultos mayores)
- **Ejercicios por condición médica** (lesiones, rehabilitación)
- **Ejercicios por deporte** (fútbol, tenis, etc.)
- **Ejercicios por clima** (interior vs exterior)
- **Ejercicios por tiempo** (5 min, 15 min, 30 min)

---

**¡Con esta biblioteca, GPT podrá crear planes súper variados y personalizados para cualquier persona en casa!** 🎉
