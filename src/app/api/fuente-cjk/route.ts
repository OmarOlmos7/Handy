import { leerFuenteCjk } from "@/lib/pdf-fuente-cjk";
import { profesorActual } from "@/lib/sesion";

// Fuente japonesa y china para los PDF que el navegador del profesor arma (analíticas y cuaderno).
// Solo se pide cuando el PDF lleva esos caracteres.
export async function GET() {
  if (!(await profesorActual())) return new Response(null, { status: 403 });
  const datos = await leerFuenteCjk();
  if (!datos) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(datos), {
    headers: { "Content-Type": "font/collection", "Cache-Control": "private, max-age=604800" },
  });
}
