// Reexportamos el cliente único (autenticado vía RLS con el JWT del usuario).
import { supabase } from "./supabase-config";
import {
  cached,
  cacheRead,
  cacheRemove,
  isNetworkError,
  OfflineError,
} from "./local-cache";
export { supabase };

// Funciones para reemplazar las APIs de Next.js
export const supabaseClient = {
  // Ejercicios
  async getExercises(
    page: number = 1,
    limit: number = 20,
    search?: string,
    category?: string,
    // Restringe el listado a estos ids (filtro "Favoritos"). Con lista vacía
    // devolvemos vacío sin tocar la red.
    onlyIds?: string[]
  ) {
    if (onlyIds && onlyIds.length === 0) {
      return { data: [], count: 0, hasMore: false };
    }

    let query = supabase
      .from("exercises")
      .select("*", { count: "exact" })
      // Ordenado por categoría (y nombre) para que el listado se agrupe de forma
      // estable y el scroll infinito recorra una categoría tras otra.
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (onlyIds) {
      query = query.in("id", onlyIds);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return { data, count, hasMore: count ? page * limit < count : false };
  },

  async getExerciseById(id: string) {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // ===== Favoritos de ejercicios (tabla exercise_favorites, RLS owner-only) =====

  async getFavoriteIds(): Promise<string[]> {
    const { data, error } = await supabase
      .from("exercise_favorites")
      .select("exercise_id");
    if (error) throw error;
    return (data ?? []).map((r) => String(r.exercise_id));
  },

  async addFavorite(exerciseId: string) {
    // `user_id` lo pone el DEFAULT auth.uid() de la tabla (RLS lo valida).
    const { error } = await supabase
      .from("exercise_favorites")
      .insert([{ exercise_id: exerciseId }]);
    // 23505 = ya era favorito (clave duplicada): lo tratamos como éxito.
    if (error && error.code !== "23505") throw error;
  },

  async removeFavorite(exerciseId: string) {
    const { error } = await supabase
      .from("exercise_favorites")
      .delete()
      .eq("exercise_id", exerciseId);
    if (error) throw error;
  },

  // Planes
  async getPlans() {
    try {
      // RLS devuelve solo los planes del usuario autenticado.
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Parsear el payload JSON string a objeto
      const parsedData =
        data?.map((plan) => ({
          ...plan,
          payload:
            typeof plan.payload === "string"
              ? JSON.parse(plan.payload)
              : plan.payload,
        })) || [];

      return parsedData;
    } catch (error) {
      console.error("Error fetching plans:", error);
      throw error;
    }
  },

  // Cuenta los planes del usuario autenticado (RLS limita al dueño). Se usa para
  // aplicar el límite del tier Free (1 generación). `head: true` no trae filas,
  // solo el conteo — barato.
  async countPlans(): Promise<number> {
    const { count, error } = await supabase
      .from("plans")
      .select("*", { count: "exact", head: true });
    if (error) {
      console.error("Error counting plans:", error);
      return 0;
    }
    return count ?? 0;
  },

  async getPlanById(id: string) {
    try {
      // RLS asegura que solo el dueño pueda leer su plan.
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Parsear el payload JSON string a objeto
      const parsedData = data
        ? {
            ...data,
            payload:
              typeof data.payload === "string"
                ? JSON.parse(data.payload)
                : data.payload,
          }
        : data;

      return parsedData;
    } catch (error) {
      console.error("Error fetching plan by ID:", error);
      throw error;
    }
  },

  // Elimina un plan del usuario. RLS ("Users can delete own plans") garantiza
  // que solo el dueño pueda borrarlo; las tablas hijas (plan_days ->
  // plan_exercises) caen por ON DELETE CASCADE. El historial de entrenamientos
  // (workout_logs) NO referencia el plan por FK, así que se conserva.
  async deletePlan(id: string) {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) throw error;
    // Que un plan borrado no reaparezca desde la copia local sin conexión.
    cacheRemove(`plan:${id}`);
    cacheRemove(`plan-exercises:${id}`);
  },

  async getPlanExercises(planId: string) {
    try {
      // Usar la función RPC get_plan_exercises_with_details
      const { data, error } = await supabase.rpc(
        "get_plan_exercises_with_details",
        {
          p_plan_id: planId,
        }
      );

      if (error) {
        console.error("Error fetching plan exercises:", error);
        throw error;
      }

      // Agrupar ejercicios por día
      const exercisesByDay =
        data?.reduce((acc: any, exercise: any) => {
          const day = exercise.day_letter;
          if (!acc[day]) {
            acc[day] = [];
          }

          // Agregar información del ejercicio con gif_url
          acc[day].push({
            ...exercise,
            gif_url: exercise.gif_url, // Solo el nombre del archivo
            exercise_details: {
              id: exercise.exercise_id,
              name: exercise.exercise_name,
              equipment: exercise.equipment,
              category: exercise.category,
              primary_muscles: exercise.primary_muscles,
              gif_url: exercise.gif_url,
            },
          });

          return acc;
        }, {}) || {};

      return {
        success: true,
        planId,
        exercises: exercisesByDay,
        totalExercises: data?.length || 0,
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching plan exercises:", error);
      throw error;
    }
  },

  // Devuelve { plan, exercisesInserted, exercisesError }.
  // - `plan`: el plan persistido (lanza si la inserción del plan falla).
  // - `exercisesInserted`: true si la RPC insert_plan_exercises tuvo éxito (o no
  //   había ejercicios que insertar); false si la RPC falló.
  // - `exercisesError`: el error de la RPC (si lo hubo), para que el llamador
  //   pueda dar feedback al usuario sin perder el plan ya guardado.
  async savePlan(planData: any): Promise<{
    plan: any;
    exercisesInserted: boolean;
    exercisesError: Error | null;
  }> {
    const { data, error } = await supabase
      .from("plans")
      .insert([planData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Sin días que procesar: el plan se guardó, no hay ejercicios pendientes.
    if (!data || !planData.payload || !planData.payload.days) {
      return { plan: data, exercisesInserted: true, exercisesError: null };
    }

    // Convertir los días del plan a formato para insert_plan_exercises
    const exercises: any[] = [];

    planData.payload.days.forEach((day: any, dayIndex: number) => {
      const dayLetter = String.fromCharCode(65 + dayIndex); // A, B, C, D...

      day.blocks.forEach((block: any, blockIndex: number) => {
        exercises.push({
          name: block.name,
          // id real resuelto por la Edge Function; la RPC lo usa directamente
          // y solo cae al matching por nombre si falta.
          exercise_id: block.exercise_id ?? null,
          day: dayLetter,
          block_index: blockIndex,
          sets: block.sets,
          reps: block.reps, // [min, max]
          rest_sec: block.rest_sec,
          cues: block.cues || [],
        });
      });
    });

    try {
      // Llamar a la función RPC insert_plan_exercises
      const { error: insertError } = await supabase.rpc(
        "insert_plan_exercises",
        {
          p_plan_id: data.id,
          p_exercises: exercises,
        }
      );

      if (insertError) {
        // No tragar en silencio: registrar y propagar al llamador.
        console.error("Error inserting exercises:", insertError);
        return {
          plan: data,
          exercisesInserted: false,
          exercisesError: insertError,
        };
      }

      return { plan: data, exercisesInserted: true, exercisesError: null };
    } catch (exerciseError) {
      console.error("Error processing exercises:", exerciseError);
      return {
        plan: data,
        exercisesInserted: false,
        exercisesError:
          exerciseError instanceof Error
            ? exerciseError
            : new Error(String(exerciseError)),
      };
    }
  },

  // Logs
  async getLogs(sessionId?: string) {
    let query = supabase
      .from("workout_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  // Devuelve ejercicios "similares" para sustituir a uno dado: misma categoría y,
  // si es posible, compatibles con el mismo equipamiento que el ejercicio actual
  // (que ya fue elegido acorde al equipo del plan). Si el filtro por equipo deja
  // la lista vacía, devolvemos todos los de la categoría como respaldo.
  async getAlternativeExercises(exerciseId: string) {
    const current = await this.getExerciseById(exerciseId);
    if (!current?.category) return [];

    const { data, error } = await supabase
      .from("exercises")
      .select("id,name,category,equipment,primary_muscles,gif_url")
      .eq("category", current.category)
      .neq("id", exerciseId)
      .limit(60);

    if (error) {
      console.error("Error fetching alternative exercises:", error);
      throw error;
    }

    const list = Array.isArray(data) ? data : [];

    // Tokens de equipo del ejercicio actual (columna libre: "Full Gym, Dumbbell").
    const tokens = String(current.equipment || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const compatible = list.filter((ex) => {
      const eq = String(ex.equipment || "").toLowerCase();
      if (eq.includes("no equipment")) return true; // peso corporal: siempre vale
      return tokens.some((tk) => eq.includes(tk));
    });

    return compatible.length > 0 ? compatible : list;
  },

  // Sustituye un ejercicio del plan por otro. Persiste en DOS sitios:
  //  - plans.payload (la sesión lee de aquí) -> requiere la política UPDATE de
  //    plans (ver schemas/add-plans-update-policy.sql).
  //  - plan_exercises (lo usan las imágenes/listados) -> permitido por RLS.
  // Devuelve el payload actualizado para refrescar la UI sin recargar.
  async swapPlanExercise(params: {
    planId: string;
    currentPayload: { days: any[] };
    dayLetter: string;
    blockIndex: number;
    newExerciseId: string;
    newName: string;
  }) {
    const { planId, currentPayload, dayLetter, blockIndex, newExerciseId, newName } =
      params;

    // 1) Construir el payload actualizado (copia inmutable).
    const payload = {
      ...currentPayload,
      days: (currentPayload.days || []).map((day: any) => {
        if (day.day !== dayLetter) return day;
        return {
          ...day,
          blocks: (day.blocks || []).map((block: any, i: number) =>
            i === blockIndex
              ? { ...block, name: newName, exercise_id: newExerciseId, cues: [] }
              : block
          ),
        };
      }),
    };

    // 2) Persistir en plans.payload.
    const { error: planError } = await supabase
      .from("plans")
      .update({ payload })
      .eq("id", planId);
    if (planError) {
      console.error("Error updating plan payload:", planError);
      throw planError;
    }

    // 3) Sincronizar la fila de plan_exercises (no bloqueante: si falla, el
    //    payload ya está actualizado y la sesión funcionará igual).
    const { error: peError } = await supabase
      .from("plan_exercises")
      .update({ exercise_name: newName, exercise_id: newExerciseId, cues: [] })
      .eq("plan_id", planId)
      .eq("day_letter", dayLetter)
      .eq("block_index", blockIndex);
    if (peError) {
      console.warn("plan_exercises no se pudo sincronizar (no crítico):", peError);
    }

    return payload;
  },

  // Función de debug para verificar la tabla plans
  async debugPlansTable() {
    // Verificar si la tabla existe y obtener información básica
    const { data, error, count } = await supabase
      .from("plans")
      .select("*", { count: "exact" })
      .limit(5);

    return { data, error, count };
  },

  // ===== Seguimiento corporal (peso, medidas y fotos de progreso) =====
  // Tabla `body_measurements` + bucket privado `progress-photos` (RLS owner-only).

  async getMeasurements() {
    const { data, error } = await supabase
      .from("body_measurements")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async saveMeasurement(entry: Record<string, unknown>) {
    // `user_id` lo pone el DEFAULT auth.uid() de la tabla (RLS lo valida).
    const { data, error } = await supabase
      .from("body_measurements")
      .insert([entry])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteMeasurement(id: string, photoPath?: string | null) {
    if (photoPath) {
      // Borrado best-effort de la foto; no bloquea el borrado de la fila.
      await supabase.storage.from("progress-photos").remove([photoPath]);
    }
    const { error } = await supabase
      .from("body_measurements")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // Sube una foto al bucket privado bajo {user_id}/... (lo exige la RLS de Storage).
  // Devuelve la ruta guardable en `body_measurements.photo_path`.
  async uploadProgressPhoto(file: File): Promise<string> {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error("No authenticated user");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    // Sin Math.random/Date inseguros: el nombre se basa en el id de usuario +
    // marca temporal; colisiones improbables y, si ocurre, upsert lo resuelve.
    const path = `${uid}/${Date.now()}-${file.size}.${ext}`;
    const { error } = await supabase.storage
      .from("progress-photos")
      .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (error) throw error;
    return path;
  },

  // URL firmada temporal para mostrar una foto privada (bucket no público).
  async getPhotoUrl(path: string, expiresInSec = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from("progress-photos")
      .createSignedUrl(path, expiresInSec);
    if (error) return null;
    return data?.signedUrl ?? null;
  },
};

/* ===== Lecturas disponibles sin conexión =====
   Se envuelven con la copia local (red primero, copia si la red falla) las
   lecturas que hacen falta para entrenar y ver el progreso: planes, ejercicios
   del plan, historial, favoritos y medidas. */

// Con el token caducado y sin poder refrescarlo, supabase-js envía la petición
// como anónima y RLS devuelve listas vacías: lo tratamos como falta de conexión
// para no pisar la copia local con datos vacíos.
//
// Con el token caducado getSession() espera al refresh, que sin red reintenta
// durante ~30 s por llamada. No esperamos tanto para enseñar la copia local.
const SESSION_WAIT_MS = 4000;
async function requireSession(): Promise<void> {
  const hasSession = await Promise.race([
    supabase.auth.getSession().then(({ data }) => !!data.session),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), SESSION_WAIT_MS)),
  ]);
  if (!hasSession) throw new OfflineError();
}

const online = {
  getPlans: supabaseClient.getPlans,
  getPlanById: supabaseClient.getPlanById,
  getPlanExercises: supabaseClient.getPlanExercises,
  getLogs: supabaseClient.getLogs,
  getFavoriteIds: supabaseClient.getFavoriteIds,
  getMeasurements: supabaseClient.getMeasurements,
};

const offlineCapable = <T>(name: string, fetcher: () => Promise<T>): Promise<T> =>
  cached(name, async () => {
    await requireSession();
    return fetcher();
  });

supabaseClient.getPlans = () =>
  offlineCapable("plans", () => online.getPlans.call(supabaseClient));

/** Tamaño del catálogo de ejercicios (contador del panel). */
export const getExerciseCount = (): Promise<number> =>
  offlineCapable(
    "exercise-count",
    async () => (await supabaseClient.getExercises(1, 1)).count ?? 0
  );

supabaseClient.getPlanById = async (id: string) => {
  try {
    return await offlineCapable(`plan:${id}`, () =>
      online.getPlanById.call(supabaseClient, id)
    );
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    // Sin copia propia del plan: puede estar en la lista de planes guardada.
    const fromList = cacheRead<{ id: string }[]>("plans")?.find((p) => p.id === id);
    if (!fromList) throw err;
    return fromList as Awaited<ReturnType<typeof online.getPlanById>>;
  }
};

supabaseClient.getPlanExercises = (planId: string) =>
  offlineCapable(`plan-exercises:${planId}`, () =>
    online.getPlanExercises.call(supabaseClient, planId)
  );

supabaseClient.getLogs = (sessionId?: string) =>
  sessionId
    ? online.getLogs.call(supabaseClient, sessionId)
    : offlineCapable("logs", () => online.getLogs.call(supabaseClient));

supabaseClient.getFavoriteIds = () =>
  offlineCapable("favorites", () => online.getFavoriteIds.call(supabaseClient));

supabaseClient.getMeasurements = () =>
  offlineCapable("measurements", () => online.getMeasurements.call(supabaseClient));
