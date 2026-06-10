import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export function useMobileApp() {
  // Detección oficial vía API de Capacitor (D-PERF-6). Sustituye el regex de
  // userAgent y el listener `resize`. Se calcula una sola vez en el cliente:
  // la plataforma de Capacitor no cambia en runtime.
  const [isCapacitor, setIsCapacitor] = useState(false);

  useEffect(() => {
    setIsCapacitor(Capacitor.isNativePlatform());
  }, []);

  return {
    isMobileApp: isCapacitor,
    isCapacitor,
    isNative: isCapacitor,
    isWeb: !isCapacitor,
  };
}
