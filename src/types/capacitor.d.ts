declare global {
  interface Window {
    Capacitor?: {
      Plugins?: any;
      isNative?: boolean;
    };
    cordova?: any;
  }
}

export {};
