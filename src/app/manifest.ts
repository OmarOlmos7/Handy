import type { MetadataRoute } from "next";

// Permite instalar la web como app en teléfonos y tabletas (Android, iPhone, iPad)
// y en computadoras con Chrome o Edge. La misma app sirve a profesores y alumnos.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Retroalimenta",
    short_name: "Retroalimenta",
    description: "Evaluación de actividades impresas con apoyo de IA.",
    lang: "es-MX",
    start_url: "/ingresar",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f7f9",
    theme_color: "#2554e8",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Panel del profesor", url: "/profesor" },
      { name: "Mis actividades (alumno)", url: "/alumno" },
    ],
  };
}
