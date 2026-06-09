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
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#7c3aed",
      overlaysWebView: false,
    },
    SafeArea: {
      enabled: true,
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
