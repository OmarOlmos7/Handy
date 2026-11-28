import { headers } from "next/headers";
import { climaDeIp } from "@/lib/clima-servidor";
import { ipDeCabeceras, textos } from "@/lib/i18n/servidor";

// Clima del encabezado: ciudad según la IP del visitante (Caddy la pone en X-Forwarded-For) y
// temperatura actual. La IP solo se usa aquí, en el servidor; no se guarda ni se manda fuera.
// Sin datos responde { clima: null } y el encabezado muestra solo la fecha y la hora.
export async function GET() {
  const { idioma } = await textos();
  const clima = (await climaDeIp(ipDeCabeceras(await headers()), idioma)) ?? null;
  return Response.json(
    { clima },
    // Cada visitante tiene su propia ciudad: solo el navegador lo guarda, 10 minutos.
    { headers: { "Cache-Control": "private, max-age=600" } },
  );
}
