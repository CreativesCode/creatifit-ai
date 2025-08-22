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
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keystoreAliasPassword: undefined,
    },
  },
};

export default config;
