import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.creatifit.ai",
  appName: "CreatiFit AI",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    // Configuración para inyectar variables de entorno
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#08060F",
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#08060F",
      // Edge-to-edge: la webview ocupa toda la pantalla (obligatorio en Android 15
      // / targetSdk 35) y el inset de la barra de estado lo gestiona el CSS vía
      // `env(safe-area-inset-top)` (.safe-top). Con `false` se duplicaba el espacio
      // superior: el sistema reservaba la barra Y el CSS añadía el inset.
      overlaysWebView: true,
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keystoreAliasPassword: undefined,
    },
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
