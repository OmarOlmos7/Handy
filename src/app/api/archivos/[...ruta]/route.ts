import { leerArchivo } from "@/lib/almacen";

const tipos: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" };

// Sirve las fotos y archivos subidos. En producción: enlaces firmados que expiran.
export async function GET(_req: Request, ctx: RouteContext<"/api/archivos/[...ruta]">) {
  const { ruta } = await ctx.params;
  try {
    const datos = leerArchivo(ruta.join("/"));
    const ext = ruta.at(-1)?.split(".").pop()?.toLowerCase() ?? "";
    return new Response(new Uint8Array(datos), {
      headers: { "Content-Type": tipos[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
