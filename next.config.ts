import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  output: "export",
  // `out` es lo que empaqueta Capacitor. En desarrollo se usa otra carpeta para
  // que `next dev` no la pise con archivos que no son un build de verdad.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : "out",
  // Una sola fuente para la versión que muestra Ajustes: package.json. Debe
  // coincidir con versionName en android/app/build.gradle.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
