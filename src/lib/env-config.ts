// Configuración de variables de entorno que se compila durante el build
// Esto asegura que las variables estén disponibles en la aplicación móvil

export const envConfig = {
  // OpenAI: la API key NO vive en el cliente. La generación de planes se hace
  // desde la Edge Function `generate-plan`, que tiene OPENAI_API_KEY como secret.

  // Supabase
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '',
  
  // App
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Detectar si estamos en desarrollo
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  // Detectar si estamos en aplicación móvil
  IS_MOBILE: typeof window !== 'undefined' && (
    !!(window as any).Capacitor || 
    !!(window as any).cordova || 
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  ),
};

// Función para obtener la configuración según el entorno
export const getEnvConfig = () => {
  return envConfig;
};

// Función para validar que la configuración esté completa
export const validateEnvConfig = (): { isValid: boolean; errors: string[] } => {
  const config = getEnvConfig();
  const errors: string[] = [];

  if (!config.SUPABASE_URL) {
    errors.push('Supabase URL no configurada');
  }
  
  if (!config.SUPABASE_ANON_KEY) {
    errors.push('Supabase Anon Key no configurada');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Función para mostrar el estado de la configuración
export const logEnvConfigStatus = (): void => {
  const config = getEnvConfig();
  const validation = validateEnvConfig();
  
  console.log('🔧 [ENV CONFIG] Environment configuration status:');
  console.log('Environment:', config.IS_DEVELOPMENT ? 'Development' : 'Production');
  console.log('Mobile App:', config.IS_MOBILE ? 'Yes' : 'No');
  console.log('Supabase URL:', config.SUPABASE_URL ? '✅ Configurada' : '❌ No configurada');
  console.log('Supabase Anon Key:', config.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada');
  console.log('Supabase Service Role Key:', config.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ No configurada');
  
  if (!validation.isValid) {
    console.error('❌ [ENV CONFIG] Configuration errors:', validation.errors);
  } else {
    console.log('✅ [ENV CONFIG] Configuration is valid');
  }
};
