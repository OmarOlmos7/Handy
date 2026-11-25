import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Carpeta autocontenida (.next/standalone) para el contenedor de Docker en el VPS.
  output: "standalone",
  // La demo lee datos del disco en cada petición; se desactiva el prerender parcial.
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["sharp"],
  experimental: {
    // El proxy (src/proxy.ts) guarda en memoria el cuerpo de cada petición; por omisión solo 10 MB,
    // y lo demás se corta sin aviso. Se iguala al límite de Caddy (60 MB) para que lleguen completos
    // el material de las actividades de contenido (audio y video) y la evidencia de los alumnos.
    proxyClientMaxBodySize: "60mb",
  },
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
