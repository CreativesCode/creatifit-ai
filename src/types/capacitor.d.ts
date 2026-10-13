declare global {
  interface Window {
    Capacitor?: {
      Plugins?: Record<string, unknown>;
      isNative?: boolean;
    };
    cordova?: unknown;
  }
}

export {};
