import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Carpeta autocontenida (.next/standalone) para el contenedor de Docker en el VPS.
  output: "standalone",
  // La demo lee datos del disco en cada petición; se desactiva el prerender parcial.
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["sharp"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
