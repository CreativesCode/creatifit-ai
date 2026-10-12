// Reexportamos el cliente único (autenticado vía RLS con el JWT del usuario).
import { supabase } from "./supabase-config";
import {
  cached,
  cacheRead,
  cacheRemove,
  cacheWrite,
  getCacheUser,
  isNetworkError,
  OfflineError,
} from "./local-cache";
import { compressPhoto } from "./image-compress";
import {
  pendingWorkoutDeletes,
  pendingWorkoutRows,
  removeWorkoutLog,
  subscribeOutbox,
} from "./workout-outbox";
export { supabase };

// Fotos de progreso: las subidas desde el plan del piloto llevan este prefijo
// y tienen miniatura al lado (mismo nombre con ".thumb.jpg").
const PHOTO_V2_PREFIX = "p2-";
const PHOTO_URL_TTL_SEC = 24 * 3600;
const PHOTO_URL_MARGIN_MS = 10 * 60 * 1000;
interface SignedPhotoUrl {
  url: string;
  exp: number;
}

const LOGS_PAGE = 1000;
const LOG_COLUMNS =
  "id, exercise_name, set_index, target_reps, actual_reps, weight, rpe, notes, plan_day_id, plan_id, session_id, timestamp, created_at";

/** Ruta de la miniatura de una foto, o null si esa foto no tiene (las antiguas). */
export function photoThumbPath(path: string): string | null {
  const name = path.slice(path.lastIndexOf("/") + 1);
  if (!name.startsWith(PHOTO_V2_PREFIX)) return null;
  return path.replace(/\.jpg$/, ".thumb.jpg");
}

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

  // Página del catálogo para el selector del editor de planes. Solo las columnas
  // que pinta la lista y sin recuento exacto (se pide una fila de más para saber
  // si hay otra página): con mala conexión cada kB cuenta. No lleva copia local:
  // elegir ejercicios exige conexión.
  async pickExercises(params: {
    page: number;
    limit?: number;
    search?: string;
    category?: string;
    onlyIds?: string[];
  }): Promise<{
    data: { id: string; name: string; category: string | null; equipment: string | null; gif_url: string | null }[];
    hasMore: boolean;
  }> {
    const { page, limit = 30, search, category, onlyIds } = params;
    if (onlyIds && onlyIds.length === 0) return { data: [], hasMore: false };

    let query = supabase
      .from("exercises")
      .select("id,name,category,equipment,gif_url")
      .order("name", { ascending: true })
      .range((page - 1) * limit, page * limit);
    if (search) query = query.ilike("name", `%${search}%`);
    if (category) query = query.eq("category", category);
    if (onlyIds) query = query.in("id", onlyIds);

    const { data, error } = await query;
    if (error) throw error;
    const rows = data ?? [];
    return { data: rows.slice(0, limit), hasMore: rows.length > limit };
  },

  // Miniaturas de unos ejercicios concretos (exercise_id -> gif_url).
  async getExerciseGifs(ids: string[]): Promise<Record<string, string>> {
    if (ids.length === 0) return {};
    const { data, error } = await supabase.from("exercises").select("id,gif_url").in("id", ids);
    if (error) throw error;
    const map: Record<string, string> = {};
    for (const row of data ?? []) if (row.gif_url) map[String(row.id)] = row.gif_url;
    return map;
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
      // 23505 = el plan ya existe: un intento anterior lo guardó pero su respuesta
      // se perdió por la red. Lo damos por guardado en vez de fallar el reintento.
      if (error.code === "23505" && planData.id) {
        const { data: saved, error: readError } = await supabase
          .from("plans")
          .select()
          .eq("id", planData.id)
          .single();
        if (readError) throw readError;
        return { plan: saved, exercisesInserted: true, exercisesError: null };
      }
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
  // Historial de series. Solo las columnas que usa la app y por páginas: la API
  // corta en 1000 filas por petición y un historial largo se truncaba en silencio.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getLogs(sessionId?: string): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all: any[] = [];
    for (let from = 0; ; from += LOGS_PAGE) {
      let query = supabase
        .from("workout_logs")
        .select(LOG_COLUMNS)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + LOGS_PAGE - 1);
      if (sessionId) query = query.eq("session_id", sessionId);

      const { data, error } = await query;
      if (error) throw error;
      all.push(...(data ?? []));
      if (!data || data.length < LOGS_PAGE) return all;
    }
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
      .order("name")
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

  // Guarda la estructura de un plan (crea o actualiza). Es el ÚNICO camino para
  // escribir días y ejercicios: la función SQL save_plan_structure deja
  // plans.payload y plan_exercises iguales en una sola transacción y devuelve
  // el payload normalizado (días A, B, C… y nombres del catálogo).
  // `weeks` omitido = conservar las del plan. Repetir la llamada con el mismo
  // id es inocuo, así que un reintento tras un corte de red no duplica nada.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async savePlanStructure(params: { id: string; weeks?: number; payload: any }) {
    const { data, error } = await supabase.rpc("save_plan_structure", {
      p_plan_id: params.id,
      p_weeks: params.weeks ?? null,
      p_payload: params.payload,
    });
    if (error) throw error;
    // Las copias locales quedaron viejas: que la próxima lectura las rehaga.
    cacheRemove(`plan:${params.id}`);
    cacheRemove(`plan-exercises:${params.id}`);
    cacheRemove("plans");
    return data;
  },

  // Sustituye un ejercicio del plan por otro y devuelve el payload guardado
  // para refrescar la UI sin recargar.
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

    // 2) Persistir payload y plan_exercises juntos.
    return this.savePlanStructure({ id: planId, payload });
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
      // Borrado best-effort de la foto (y su miniatura); no bloquea el de la fila.
      const thumb = photoThumbPath(photoPath);
      await supabase.storage
        .from("progress-photos")
        .remove(thumb ? [photoPath, thumb] : [photoPath]);
    }
    const { error } = await supabase
      .from("body_measurements")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // Sube una foto al bucket privado bajo {user_id}/... (lo exige la RLS de Storage).
  // Devuelve la ruta guardable en `body_measurements.photo_path`.
  // La foto se reduce en el teléfono antes de subir y se guarda además una
  // miniatura para la lista: la de cámara pesa megas y se pedía entera para
  // pintar un cuadro de 56 px.
  async uploadProgressPhoto(file: File): Promise<string> {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error("No authenticated user");
    const bucket = supabase.storage.from("progress-photos");
    // El nombre no cambia nunca de contenido, así que puede cachearse un año.
    const opts = { upsert: true, cacheControl: "31536000" };
    const small = await compressPhoto(file);

    if (!small) {
      // El navegador no pudo decodificarla: se sube tal cual, sin miniatura.
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/${Date.now()}-${file.size}.${ext}`;
      const { error } = await bucket.upload(path, file, {
        ...opts,
        contentType: file.type || "image/jpeg",
      });
      if (error) throw error;
      return path;
    }

    const path = `${uid}/${PHOTO_V2_PREFIX}${Date.now()}-${small.full.size}.jpg`;
    const { error } = await bucket.upload(path, small.full, {
      ...opts,
      contentType: "image/jpeg",
    });
    if (error) throw error;
    if (small.thumb) {
      // Si la miniatura falla, la lista cae a la foto completa: no es un error.
      await bucket
        .upload(photoThumbPath(path)!, small.thumb, { ...opts, contentType: "image/jpeg" })
        .catch(() => undefined);
    }
    return path;
  },

  // Borra una foto (y su miniatura). Para deshacer una subida cuyo registro no
  // llegó a guardarse; nunca lanza.
  async deleteProgressPhoto(path: string): Promise<void> {
    const thumb = photoThumbPath(path);
    await supabase.storage
      .from("progress-photos")
      .remove(thumb ? [path, thumb] : [path])
      .catch(() => undefined);
  },

  // URLs firmadas para mostrar fotos privadas (bucket no público), en una sola
  // petición. Se reutilizan mientras sigan vigentes: una URL firmada nueva en
  // cada visita es otra dirección y obliga a descargar la foto otra vez.
  async getPhotoUrls(paths: string[]): Promise<Record<string, string>> {
    const now = Date.now();
    const store = cacheRead<Record<string, SignedPhotoUrl>>("photo-urls") ?? {};
    const out: Record<string, string> = {};
    const missing: string[] = [];
    for (const p of paths) {
      const hit = store[p];
      if (hit && hit.exp - now > PHOTO_URL_MARGIN_MS) out[p] = hit.url;
      else missing.push(p);
    }
    if (missing.length > 0) {
      // Sin red no se pueden firmar: se muestran las que ya tenían URL vigente.
      const { data } = await supabase.storage
        .from("progress-photos")
        .createSignedUrls(missing, PHOTO_URL_TTL_SEC)
        .catch(() => ({ data: null }));
      for (const row of data ?? []) {
        if (!row.path || !row.signedUrl || row.error) continue;
        out[row.path] = row.signedUrl;
        store[row.path] = { url: row.signedUrl, exp: now + PHOTO_URL_TTL_SEC * 1000 };
      }
    }
    // Se guardan solo las pedidas ahora: las de fotos borradas desaparecen.
    const kept: Record<string, SignedPhotoUrl> = {};
    for (const p of paths) if (store[p] && out[p]) kept[p] = store[p];
    cacheWrite("photo-urls", kept);
    return out;
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
/** Borra una serie registrada. Va por la cola local (funciona sin conexión y
    se envía al reconectar) y la quita también de la copia local del historial,
    para que no reaparezca si la siguiente lectura sale de esa copia. */
export function deleteWorkoutLog(uid: string, id: string): void {
  removeWorkoutLog(uid, id);
  logsMemo = null;
  const stored = cacheRead<{ id: string }[]>("logs");
  if (Array.isArray(stored)) {
    cacheWrite("logs", stored.filter((l) => l.id !== id));
  }
}

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

/* Historial: una sola descarga compartida.
   Inicio, planes, sesión e historial lo piden cada uno por su cuenta y se llegaba
   a bajar entero 5 veces en una navegación. Ahora:
   - las peticiones simultáneas comparten la misma descarga y el resultado vale
     LOGS_FRESH_MS (se descarta antes si cambia la cola de series);
   - a lo que diga el servidor se le suman las series que siguen en el teléfono
     y se le quitan las borradas pendientes, así el historial cuadra sin red;
   - el detalle de una sesión se saca de esa misma lista, sin otra petición. */
const LOGS_FRESH_MS = 60_000;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogRow = any;
let logsMemo: { uid: string | null; at: number; promise: Promise<LogRow[]> } | null = null;

subscribeOutbox(() => {
  logsMemo = null;
});

function loadServerLogs(): Promise<LogRow[]> {
  const uid = getCacheUser();
  if (logsMemo && logsMemo.uid === uid && Date.now() - logsMemo.at < LOGS_FRESH_MS) {
    return logsMemo.promise;
  }
  const promise = offlineCapable("logs", () => online.getLogs.call(supabaseClient));
  const memo = { uid, at: Date.now(), promise };
  logsMemo = memo;
  // Un fallo no se recuerda: el siguiente intento vuelve a pedirlo.
  promise.catch(() => {
    if (logsMemo === memo) logsMemo = null;
  });
  return promise;
}

function withPendingLogs(server: LogRow[]): LogRow[] {
  const uid = getCacheUser();
  if (!uid) return server;
  const deleted = new Set(pendingWorkoutDeletes(uid));
  const known = new Set(server.map((l) => l.id));
  const pending = pendingWorkoutRows(uid)
    .filter((r) => !known.has(r.id))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .map((r) => ({ ...r, created_at: r.timestamp }));
  if (pending.length === 0 && deleted.size === 0) return server;
  return [...pending, ...server].filter((l) => !deleted.has(l.id));
}

supabaseClient.getLogs = async (sessionId?: string) => {
  const all = withPendingLogs(await loadServerLogs());
  return sessionId ? all.filter((l) => l.session_id === sessionId) : all;
};

supabaseClient.getFavoriteIds = () =>
  offlineCapable("favorites", () => online.getFavoriteIds.call(supabaseClient));

supabaseClient.getMeasurements = () =>
  offlineCapable("measurements", () => online.getMeasurements.call(supabaseClient));
