import { useEffect, useState } from 'react';

export function useMobileApp() {
  const [isMobileApp, setIsMobileApp] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);

  useEffect(() => {
    // Detectar si estamos en Capacitor
    const checkCapacitor = () => {
      const hasCapacitor = typeof window !== 'undefined' && 
        (('Capacitor' in window) || ('cordova' in window));
      
      setIsCapacitor(!!hasCapacitor);
      
      // Detectar si es una app móvil
      const isMobile = typeof window !== 'undefined' && (
        hasCapacitor ||
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform))
      );
      
      setIsMobileApp(Boolean(isMobile));
    };

    checkCapacitor();
    
    // Escuchar cambios en el estado de la app
    if (typeof window !== 'undefined' && 'Capacitor' in window) {
      window.addEventListener('resize', checkCapacitor);
      return () => window.removeEventListener('resize', checkCapacitor);
    }
  }, []);

  return {
    isMobileApp,
    isCapacitor,
    isNative: isCapacitor,
    isWeb: !isCapacitor,
  };
}
