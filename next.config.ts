import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
