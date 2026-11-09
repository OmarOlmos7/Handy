// Foto real de la hoja del alumno con las correcciones encima (palomas, taches,
// puntos y comentarios en rojo), en la posición que indicó la IA.
import type { Actividad, Entrega } from "@/lib/tipos";

export function HojaFoto({
  actividad,
  entrega,
  pagina,
  anotada = true,
  modoProfesor = false,
}: {
  actividad: Actividad;
  entrega: Entrega;
  pagina: number;
  anotada?: boolean;
  modoProfesor?: boolean;
}) {
  const ruta = entrega.imagenes?.[pagina - 1];
  if (!ruta) return null;
  const marcas = anotada ? entrega.resultados.filter((r) => (r.ubicacion?.pagina ?? 1) === pagina) : [];
  return (
    <div className="relative overflow-hidden rounded-md bg-white shadow-md ring-1 ring-slate-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/archivos/${ruta}`} alt={`Página ${pagina} de la entrega`} className="block h-auto w-full" />
      {marcas.map((res) => {
        const r = actividad.reactivos.find((x) => x.numero === res.numero);
        if (!r) return null;
        const completo = res.puntosObtenidos >= r.puntos;
        return (
          <div
            key={res.numero}
            className="absolute right-2 flex max-w-[55%] -translate-y-1/2 items-start gap-2"
            style={{ top: `${Math.min(96, Math.max(4, (res.ubicacion?.y ?? 0.5) * 100))}%` }}
          >
            {!completo && res.comentario && (
              <span className="font-mano rounded border border-error/60 bg-white/85 px-1.5 py-0.5 text-base leading-tight text-error shadow-sm sm:text-lg">
                {res.comentario}
              </span>
            )}
            <span className="flex flex-col items-center">
              <span className={`text-2xl font-bold leading-none sm:text-3xl ${completo ? "text-acierto" : "text-error"}`}>
                {completo ? "✓" : "✗"}
              </span>
              <span className={`font-mano text-base leading-none sm:text-lg ${completo ? "text-acierto" : "text-error"}`}>
                {res.puntosObtenidos}/{r.puntos}
              </span>
              {modoProfesor && res.confianza === "baja" && (
                <span className="mt-0.5 rounded bg-aviso px-1 text-[10px] font-semibold text-white">Revisar</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
