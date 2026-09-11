# Diseño, idiomas y móvil

Revisado: 2026-09-10. Referencia vigente: código; docs/design representa intención y variantes históricas, no estado exacto de cada pantalla.

## Marca implementada

- “Anillos de actividad”, wordmark CreatiFit, estética oscura violeta/fucsia, gradientes, mesh/glow/glass. Primitivas brand, ring, stat-tile, side-nav y bottom-navigation existen: no recrearlas desde cero porque REDESIGN-PLAN diga “no existe”.
- Display/números: Space Grotesk (600/700); cuerpo: Plus Jakarta Sans (400/500/600/700), cargadas con next/font/google. Inter/Violet Nebula original ya no describen toda la UI actual.
- Oscuro: fondo #08060F, primary #8E6BFF, accent #F0469C. Acentos cian #25E0E5, menta #36E5A4, ámbar #FFB23E, coral #FF5D6B. Los tokens completos están en globals.css; reutilizarlos.
- Tailwind 4.1 con @tailwindcss/postcss, import CSS y @config explícito. No copiar sintaxis Tailwind 3 del starter Titan.
- Tema default dark; provider enableSystem=false. No asumir “Auto” operativo porque aparezca en maqueta.
- ES/EN con i18next/react-i18next, localStorage `lang`, preferencia del navegador y fallback en. Revisión estructural: **497 claves hoja en cada idioma, sin diferencias de nombres**. No prueba que todo texto visible use traducción: páginas legales siguen en español.

## Mobile/UX que hay que preservar

- App ID `com.creatifit.ai.app`; Android existente, iOS solo configuración/dependencias referenciadas, sin carpeta nativa.
- Capacitor webDir out, androidScheme https; no server.url de la antigua modalidad WebView remota.
- Android versionName 1.0.4 / code 4; minify/shrink de release habilitados. Estado en tienda no verificado.
- Safe-area aplicada por shells, no duplicar padding en body. viewport permite zoom y usa viewportFit cover; se retiró user-scalable=no.
- Detectar plataforma mediante Capacitor API; preservar back Android, confirmación de salida y reanudación de sesión.
- Listado de ejercicios usa búsqueda/paginación, favoritos e IntersectionObserver. Mantener tarjetas sin blur costoso, lazy-loading y reduced-motion. Virtualización/posters/vídeo siguen como opciones, no requisitos aceptados.
- Biblioteca y planes integran `exercise-detail-view.tsx` desde julio. No restaurar componentes borrados de detalle/listado a partir de links viejos.

## Diseño de referencia

`docs/design/REDESIGN-PLAN.md` inventaría 25 artboards de marca/móvil oscuro/claro/tablet/web. El directorio contiene además screens4 (login/registro), screens5 (landing web), kit, logos, loader y canvas. `Redesign.html` compone el prototipo; no es el entrypoint de producción.

Las capturas incluyen recorridos, imágenes de tienda y tablets 7/10. Se inventariaron como evidencia visual histórica; no se certificó cada píxel ni se ejecutó QA visual de todas ellas en esta revisión. `docs/` está ignorado por Git: conservar decisiones útiles aquí para un clon nuevo, sin incorporar automáticamente todo ese material.

Fuentes: `src/app/{layout.tsx,globals.css}`, `src/app/providers/*`, `src/lib/i18n.ts`, `src/locales/*`, `src/components/ui/*`, `capacitor.config.ts`, `android/app/build.gradle`, `docs/design/*`.
