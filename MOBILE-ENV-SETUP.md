# Configuración de Variables de Entorno para Aplicación Móvil

## Problema
La aplicación móvil no puede acceder a las variables de entorno del servidor, pero necesitamos que las credenciales de OpenAI y Supabase estén disponibles.

## Solución
Usar variables de entorno con prefijo `NEXT_PUBLIC_` que se compilan durante el build y están disponibles en el cliente.

## Configuración Requerida

### 1. Crear/Actualizar archivo `.env.local`
Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```bash
# OpenAI
NEXT_PUBLIC_OPENAI_API_KEY=sk-tu-api-key-aqui
NEXT_PUBLIC_MODEL_NAME=gpt-4o-mini

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Variables Obligatorias
- ✅ `NEXT_PUBLIC_OPENAI_API_KEY` - Tu clave de API de OpenAI
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clave anónima de Supabase

### 3. Variables Opcionales
- 🔶 `NEXT_PUBLIC_MODEL_NAME` - Modelo de OpenAI (default: gpt-4o-mini)
- 🔶 `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` - Clave de servicio de Supabase
- 🔶 `NEXT_PUBLIC_APP_URL` - URL de la aplicación (default: localhost:3000)

## Cómo Funciona

### En Desarrollo Web
- Las variables se leen directamente del archivo `.env.local`
- Funciona igual que antes

### En Aplicación Móvil
- Las variables se compilan durante el build de Next.js
- Se inyectan en el código JavaScript final
- Están disponibles en el cliente móvil

## Pasos para Configurar

### 1. Configurar Variables de Entorno
```bash
# En la raíz del proyecto
cp env.example .env.local

# Editar .env.local con tus credenciales reales
nano .env.local  # o usar tu editor preferido
```

### 2. Verificar Configuración
```bash
# Construir la aplicación
npm run build

# Verificar que no hay errores de variables faltantes
```

### 3. Sincronizar con Capacitor
```bash
# Después de configurar las variables
npm run cap:sync
```

## Verificación

### En la Consola del Navegador
Deberías ver logs como:
```
🔧 [ENV CONFIG] Environment configuration status:
Environment: Production
Mobile App: Yes
OpenAI API Key: ✅ Configurada
Supabase URL: ✅ Configurada
Supabase Anon Key: ✅ Configurada
```

### En la Aplicación Móvil
- La generación de planes debería funcionar sin errores
- No deberías ver mensajes de "API Key no configurada"

## Solución de Problemas

### Error: "OpenAI API Key no configurada"
1. Verifica que `.env.local` existe y tiene `NEXT_PUBLIC_OPENAI_API_KEY`
2. Asegúrate de que el archivo no esté en `.gitignore`
3. Reinicia el servidor de desarrollo: `npm run dev`

### Error: "Supabase URL no configurada"
1. Verifica que `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL`
2. Asegúrate de que la URL sea correcta
3. Verifica que no haya espacios extra en el archivo

### Variables no se cargan en móvil
1. Asegúrate de que las variables empiecen con `NEXT_PUBLIC_`
2. Ejecuta `npm run build` para verificar que compila
3. Sincroniza con Capacitor: `npm run cap:sync`

## Notas Importantes

- ⚠️ **NUNCA** subas `.env.local` a Git
- ✅ Las variables con `NEXT_PUBLIC_` se compilan en el cliente
- 🔒 Las variables sin `NEXT_PUBLIC_` solo están en el servidor
- 📱 La aplicación móvil necesita las variables compiladas durante el build

## Ejemplo de .env.local
```bash
# Copia este archivo y reemplaza con tus credenciales reales
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-1234567890abcdef
NEXT_PUBLIC_MODEL_NAME=gpt-4o-mini
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Comandos Útiles

```bash
# Verificar configuración
npm run build

# Desarrollo
npm run dev

# Build para producción
npm run build

# Sincronizar con Capacitor
npm run cap:sync

# Abrir Android Studio
npm run cap:open
```
