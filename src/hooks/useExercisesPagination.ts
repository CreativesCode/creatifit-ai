import { useCallback, useEffect, useRef, useState } from "react";

export interface Exercise {
  id: string;
  name: string;
  kind: string;
  gif_url?: string;
  equipment: string;
  primary_muscles: string;
  category: string;
  overview?: string;
  instructions: string[];
  tips: string[];
  benefits: string[];
  muscle_groups_primary: string[];
  muscle_groups_secondary: string[];
  created_at: string;
  updated_at: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalExercises: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface Filters {
  category?: string;
  kind?: string;
  equipment?: string;
  search?: string;
}

export interface ExercisesResponse {
  success: boolean;
  data: {
    exercises: Exercise[];
    pagination: PaginationInfo;
    filters: Filters;
  };
}

interface UseExercisesPaginationOptions {
  initialLimit?: number;
  initialFilters?: Filters;
  autoLoad?: boolean;
}

export const useExercisesPagination = (
  options: UseExercisesPaginationOptions = {}
) => {
  const { initialLimit = 10, initialFilters = {} } = options;

  // Estado principal
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Referencias para scroll infinito
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastExerciseRef = useRef<HTMLDivElement | null>(null);

  // Función para cargar ejercicios
  const loadExercises = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          `🔄 [PAGINATION] Cargando página ${page}, append: ${append}`
        );

        const params = new URLSearchParams({
          page: page.toString(),
          limit: initialLimit.toString(),
          ...(filters.category && { category: filters.category }),
          ...(filters.kind && { kind: filters.kind }),
          ...(filters.equipment && { equipment: filters.equipment }),
          ...(filters.search && { search: filters.search }),
        });

        const response = await fetch(`/api/exercises/paginated?${params}`);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result: ExercisesResponse = await response.json();

        if (result.success && result.data) {
          const { exercises: newExercises, pagination } = result.data;

          console.log(`✅ [PAGINATION] Página ${page} cargada:`, {
            ejercicios: newExercises.length,
            total: pagination.totalExercises,
            paginaActual: pagination.currentPage,
            totalPaginas: pagination.totalPages,
          });

          if (append) {
            // Agregar nuevos ejercicios a los existentes
            setExercises((prev) => [...prev, ...newExercises]);
            console.log(
              `📝 [PAGINATION] Agregados ${
                newExercises.length
              } ejercicios. Total: ${exercises.length + newExercises.length}`
            );
          } else {
            // Reemplazar ejercicios existentes
            setExercises(newExercises);
            console.log(
              `🔄 [PAGINATION] Reemplazados ejercicios. Nuevo total: ${newExercises.length}`
            );
          }

          setPagination(pagination);
          setHasMore(pagination.hasNextPage);

          // Solo actualizar hasMore si no estamos en la primera página
          if (page > 1) {
            setHasMore(pagination.hasNextPage);
          }
        } else {
          throw new Error("Error en la respuesta del servidor");
        }
      } catch (error) {
        console.error("❌ [PAGINATION] Error cargando ejercicios:", error);
        setError(error instanceof Error ? error.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    },
    [initialLimit, filters]
  );

  // Función para aplicar filtros
  const applyFilters = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters);
      setExercises([]);
      setHasMore(true);
      loadExercises(1, false);
    },
    [loadExercises]
  );

  // Función para buscar
  const search = useCallback(
    (searchTerm: string) => {
      const newFilters = { ...filters, search: searchTerm };
      applyFilters(newFilters);
    },
    [filters, applyFilters]
  );

  // Función para limpiar filtros
  const clearFilters = useCallback(() => {
    const clearedFilters: Filters = {};
    applyFilters(clearedFilters);
  }, [applyFilters]);

  // Función para cargar más ejercicios (scroll infinito)
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !pagination) return;

    const nextPage = pagination.currentPage + 1;
    console.log(`📥 [PAGINATION] Cargando más ejercicios: página ${nextPage}`);

    await loadExercises(nextPage, true); // true = append
  }, [loading, hasMore, pagination, loadExercises]);

  // Función para recargar ejercicios
  const refresh = useCallback(() => {
    setExercises([]);
    setHasMore(true);
    loadExercises(1, false);
  }, [loadExercises]);

  // Función para ir a una página específica
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && pagination && page <= pagination.totalPages) {
        loadExercises(page, false);
      }
    },
    [pagination, loadExercises]
  );

  // Configurar observer para scroll infinito
  const lastExerciseElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) {
        observerRef.current.observe(node);
        lastExerciseRef.current = node;
      }
    },
    [loading, hasMore, loadMore]
  );

  // Cargar ejercicios iniciales
  useEffect(() => {
    // Solo cargar ejercicios iniciales una vez
    if (exercises.length === 0 && !loading) {
      console.log("🚀 [PAGINATION] Carga inicial de ejercicios");
      loadExercises(1, false);
    }
  }, []); // Solo se ejecuta una vez al montar el componente

  // Cleanup del observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    // Estado
    exercises,
    pagination,
    filters,
    loading,
    error,
    hasMore,

    // Acciones
    loadExercises,
    applyFilters,
    search,
    clearFilters,
    loadMore,
    refresh,
    goToPage,

    // Referencias para scroll infinito
    lastExerciseElementRef,

    // Utilidades
    totalExercises: pagination?.totalExercises || 0,
    currentPage: pagination?.currentPage || 1,
    totalPages: pagination?.totalPages || 0,
    isFirstPage: pagination?.currentPage === 1,
    isLastPage: pagination?.currentPage === pagination?.totalPages,
  };
};
