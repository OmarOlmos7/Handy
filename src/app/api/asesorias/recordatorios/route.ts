import { timingSafeEqual } from "node:crypto";
import { enviarRecordatorios } from "@/lib/asesorias-avisos";

export const maxDuration = 120;

function igual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Recordatorios de asesoría del día (centro de avisos y correo del alumno). Lo llama el reloj interno
// del servidor (src/instrumentation.ts) cada pocos minutos con su clave; también puede llamarlo un
// cron externo con RECORDATORIOS_TOKEN.
export async function POST(req: Request) {
  const clave = process.env.RECORDATORIOS_TOKEN;
  const recibida = req.headers.get("x-recordatorios") ?? "";
  if (!clave || !recibida || !igual(clave, recibida)) return Response.json({ error: "No autorizado" }, { status: 401 });
  const enviados = await enviarRecordatorios();
  return Response.json({ ok: true, enviados });
}
