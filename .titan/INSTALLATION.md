# Titan Factory Codex en Creatifit

Instalado el 2026-09-10, versión 0.1.0, solo para este repositorio.

## Ubicación y uso

- `.agents/skills/tf-*/SKILL.md`: 29 entradas que Codex descubre directamente. Cada entrada carga las instrucciones completas del paquete; no duplica las recetas.
- `.agents/skills/titan-factory-codex/`: copia íntegra administrada del toolkit, con skills, referencias, scripts, plantillas, diseños y manifiesto de propiedad SHA-256.
- `.codex/agents/tf-*.toml`: siete perfiles nativos; no se ejecutan automáticamente.
- `AGENTS.md`: instrucciones de Creatifit y bloque de integración Titan.
- `.titan/memory/`, `.titan/plans/`, `.titan/qa/`: conocimiento y trabajo de este proyecto.

En un nuevo hilo de este proyecto, escribe `$tf-primer revisa el estado actual de Creatifit sin modificar archivos`. En interfaces con selector `@`, busca `tf-primer`. Si la interfaz no refresca la lista, reinicia Codex. También puedes pedir en lenguaje natural que use esa skill. Referencia oficial: https://learn.chatgpt.com/docs/build-skills.

Esta instalación usa el descubrimiento de skills del repositorio, no una instalación global de marketplace. La prueba con `skills/list` del app-server local devuelve 29/29 habilitadas, alcance `repo`, sin errores. El descubrimiento del paquete anidado por sí solo devolvió cero; las entradas directas resuelven ese problema sin enlaces simbólicos que requieren privilegios adicionales en este Windows.

## Verificar

Desde la raíz:

```powershell
python .titan/verify-installation.py
python .titan/verify-installation.py --codex 'RUTA/AL/codex.exe'
python .agents/skills/titan-factory-codex/scripts/validate.py
```

El primer comando verifica integridad y perfiles; el segundo además consulta el registro real de skills sin iniciar una tarea de modelo. No prueba conexiones a Supabase, Vercel, EasyPanel, n8n ni otros servicios. Los perfiles se validaron como TOML; no se lanzaron subagentes.

TypeScript y ESLint excluyen `.agents/` para que las plantillas no entren en la aplicación. Las dependencias, archivos fuente y credenciales de Creatifit no se modificaron. Se mantuvo la exportación estática y Capacitor. El documento de contexto identifica referencias antiguas a Prisma que requieren contrastarse con el código.

## Actualizar y retirar

Desde una versión revisada del proyecto fuente `titan-factory-codex`, ejecutar su `scripts/titan.py install-toolkit --target '<creatifit-ai>/.agents/skills/titan-factory-codex'` primero en vista previa y luego con `--apply`. Ese manifiesto administra únicamente el paquete; las entradas directas y los perfiles del proyecto se revisan aparte si cambia su catálogo o contenido. No editar el manifiesto para forzar actualizaciones. Repetir la verificación después de actualizar.

`detach-project --project '<creatifit-ai>'` retira únicamente el bloque Titan de AGENTS.md. No desactiva las entradas ni elimina la memoria. Para desactivar todas las skills de esta instalación, retirar explícitamente las 29 carpetas de entrada `.agents/skills/tf-*` verificando primero que son las de este paquete. Para retirar los recursos, usar `eject-toolkit --target '<creatifit-ai>/.agents/skills/titan-factory-codex'` en vista previa y después con `--apply`: conserva cambios locales y respalda archivos propios. Los siete perfiles y la memoria se conservan hasta que se solicite retirarlos. No borrar `.agents`, `.codex` ni `.titan` completas.

La instalación quedó sin commit para revisión. El manifiesto de propiedad contiene la ruta absoluta local; una copia del repositorio a otra ruta requiere volver a preparar la propiedad de la instalación antes de usar update/eject, no reemplazar esa ruta a mano.
