"use client";

// Lista de asistencia de una sesión: a mano (punto verde, amarillo o rojo por alumno, o a todos a
// la vez) o con la foto del grupo, que marca a los alumnos reconocidos para que el profesor revise.
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { borrarAsistencia, guardarAsistencia } from "@/app/acciones-asistencia";
import { ESTADOS_ASISTENCIA, horaCampo, idSesion, marcarTodos } from "@/lib/asistencia";
import { formato } from "@/lib/i18n/idiomas";
import type { EstadoAsistencia } from "@/lib/tipos";
import { FotoAsistencia } from "./asistencia-foto";
import { useTextos } from "./proveedor-textos";
import { Boton, campo } from "./ui";

const COLOR: Record<EstadoAsistencia, { lleno: string; suave: string }> = {
  asistencia: { lleno: "bg-emerald-500 ring-emerald-600", suave: "bg-emerald-100 ring-emerald-200 hover:bg-emerald-200" },
  retardo: { lleno: "bg-amber-400 ring-amber-500", suave: "bg-amber-100 ring-amber-200 hover:bg-amber-200" },
  falta: { lleno: "bg-red-500 ring-red-600", suave: "bg-red-100 ring-red-200 hover:bg-red-200" },
};

/** Punto de color de un estado (verde, amarillo o rojo). */
export function PuntoEstado({ estado, grande = false }: { estado: EstadoAsistencia; grande?: boolean }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ring-1 ${COLOR[estado].lleno} ${grande ? "h-4 w-4" : "h-2.5 w-2.5"}`} />;
}

/** Tomar lista en una fecha u hora que no está en el horario (sesión extra o de reposición). */
export function ListaFueraHorario({ base, hoy }: { base: string; hoy: string }) {
  const router = useRouter();
  const ts = useTextos().t.asistencia;
  const [abierto, setAbierto] = useState(false);

  function abrir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const fecha = String(d.get("fecha") ?? "");
    const [hi, mi] = String(d.get("inicio") ?? "").split(":").map(Number);
    const [hf, mf] = String(d.get("fin") ?? "").split(":").map(Number);
    if (!fecha || [hi, mi, hf, mf].some((x) => !Number.isFinite(x))) return;
    router.push(`${base}/${idSesion(fecha, hi * 60 + mi)}?fin=${hf * 60 + mf}`);
  }

  if (!abierto)
    return (
      <button type="button" onClick={() => setAbierto(true)} className="mt-3 text-sm font-medium text-tinta-700 hover:underline">
        + {ts.curso.tomarOtra}
      </button>
    );
  return (
    <form onSubmit={abrir} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200">
      <label className="text-xs font-medium text-slate-500">
        {ts.sesion.otraFecha}
        <input type="date" name="fecha" defaultValue={hoy} required className={`${campo} !py-1.5`} />
      </label>
      <label className="text-xs font-medium text-slate-500">
        {ts.sesion.inicio}
        <input type="time" name="inicio" defaultValue="08:00" required className={`${campo} !py-1.5`} />
      </label>
      <label className="text-xs font-medium text-slate-500">
        {ts.sesion.fin}
        <input type="time" name="fin" defaultValue="09:00" required className={`${campo} !py-1.5`} />
      </label>
      <Boton type="submit" className="!py-1.5">
        {ts.sesion.irSesion}
      </Boton>
    </form>
  );
}

export interface AlumnoLista {
  matricula: string;
  nombre: string;
}

export function TomarAsistencia({
  grupoId,
  sesion,
  inicio,
  fin: finInicial,
  editarHoras,
  alumnos,
  marcas: iniciales,
  guardado,
  hayRostros,
  consentidos,
  rutaRostros,
  rutaVolver,
}: {
  grupoId: string;
  sesion: string;
  inicio: number;
  fin: number;
  /** Sesión fuera del horario: el profesor puede ajustar a qué hora termina. */
  editarHoras: boolean;
  alumnos: AlumnoLista[];
  marcas: Record<string, EstadoAsistencia>;
  /** Fecha ya formateada y método de la última vez que se guardó, si ya hay lista. */
  guardado?: { fecha: string; metodo: "manual" | "foto" };
  /** ¿Hay alumnos con rostro registrado? (sin ellos la foto no reconoce a nadie). */
  hayRostros: boolean;
  /** Alumnos con consentimiento, para guardar también los rostros de la foto. */
  consentidos: string[];
  rutaRostros: string;
  rutaVolver: string;
}) {
  const router = useRouter();
  const { t } = useTextos();
  const ta = t.asistencia;
  const ts = ta.sesion;
  const [marcas, setMarcas] = useState<Record<string, EstadoAsistencia | undefined>>(iniciales);
  const [modo, setModo] = useState<"manual" | "foto">("manual");
  const [metodo, setMetodo] = useState<"manual" | "foto">(guardado?.metodo ?? "manual");
  const [fin, setFin] = useState(horaCampo(finInicial));
  const [sucio, setSucio] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const matriculas = alumnos.map((a) => a.matricula);

  useEffect(() => {
    if (!sucio) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  function cambiar(nuevas: Record<string, EstadoAsistencia | undefined>) {
    setMarcas(nuevas);
    setSucio(true);
    setMensaje("");
  }

  function marcar(matricula: string, estado: EstadoAsistencia) {
    cambiar({ ...marcas, [matricula]: marcas[matricula] === estado ? undefined : estado });
  }

  const conteo = { asistencia: 0, retardo: 0, falta: 0, sin: 0 };
  for (const m of matriculas) {
    const e = marcas[m];
    if (e) conteo[e]++;
    else conteo.sin++;
  }

  function guardar() {
    setError("");
    const [h, m] = fin.split(":").map(Number);
    iniciar(async () => {
      const r = await guardarAsistencia(grupoId, sesion, {
        marcas: matriculas.filter((x) => marcas[x]).map((x) => ({ matricula: x, estado: marcas[x] })),
        fin: h * 60 + m,
        metodo,
      });
      if ("error" in r) setError(r.error);
      else {
        setSucio(false);
        setMensaje(ts.guardada);
        router.refresh();
      }
    });
  }

  function borrar() {
    if (!confirm(ts.confirmarBorrar)) return;
    iniciar(async () => {
      const r = await borrarAsistencia(grupoId, sesion);
      if ("error" in r) setError(r.error);
      else {
        setSucio(false);
        router.push(rutaVolver);
        router.refresh();
      }
    });
  }

  /** Lo que reconoció la foto: asistencia a los reconocidos y, si se pide, falta a los demás. */
  function aplicarFoto(reconocidos: string[], faltaALosDemas: boolean) {
    const nuevas = { ...marcas };
    for (const m of reconocidos) nuevas[m] = nuevas[m] === "retardo" ? "retardo" : "asistencia";
    if (faltaALosDemas) for (const m of matriculas) if (!reconocidos.includes(m) && !nuevas[m]) nuevas[m] = "falta";
    cambiar(nuevas);
    setMetodo("foto");
    setModo("manual");
    setMensaje(formato(ta.foto.aplicado, { n: reconocidos.length }));
  }

  const pestana = (m: "manual" | "foto", texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={modo === m}
      onClick={() => setModo(m)}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none ${modo === m ? "bg-white text-tinta-800 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900"}`}
    >
      {texto}
    </button>
  );

  return (
    <div className="space-y-4">
      {editarHoras && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-aviso-suave px-3 py-2 text-sm text-aviso">
          {ts.fueraHorario}
          <label className="inline-flex items-center gap-1 text-xs font-medium">
            {ts.fin}
            <input type="time" value={fin} onChange={(e) => (setFin(e.target.value), setSucio(true))} min={horaCampo(inicio + 5)} className={`${campo} !mt-0 !w-auto !py-1`} />
          </label>
        </p>
      )}
      <div role="tablist" className="flex gap-1 rounded-xl bg-slate-100 p-1 sm:inline-flex">
        {pestana("manual", `✍️ ${ts.manual}`)}
        {pestana("foto", `📷 ${ts.foto}`)}
      </div>

      {modo === "foto" ? (
        <FotoAsistencia
          grupoId={grupoId}
          alumnos={alumnos}
          hayRostros={hayRostros}
          consentidos={consentidos}
          rutaRostros={rutaRostros}
          onAplicar={aplicarFoto}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200">
            <span className="font-medium text-slate-700">{ts.todos}</span>
            {ESTADOS_ASISTENCIA.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => cambiar(marcarTodos(matriculas, marcas, e))}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                <PuntoEstado estado={e} grande /> {ta.estados[e]}
              </button>
            ))}
            {conteo.sin > 0 && conteo.sin < matriculas.length && (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="text-slate-500">{ts.sinMarcaA}</span>
                {ESTADOS_ASISTENCIA.map((e) => (
                  <button
                    key={e}
                    type="button"
                    title={ta.estados[e]}
                    aria-label={`${ts.sinMarcaA} ${ta.estados[e]}`}
                    onClick={() => cambiar(marcarTodos(matriculas, marcas, e, true))}
                    className="inline-flex items-center rounded-lg p-1.5 ring-1 ring-slate-300 hover:bg-slate-50"
                  >
                    <PuntoEstado estado={e} grande />
                  </button>
                ))}
              </span>
            )}
          </div>

          <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            {alumnos.map((a, i) => {
              const actual = marcas[a.matricula];
              return (
                <li key={a.matricula} className="flex items-center gap-3 px-3 py-2 sm:px-4">
                  <span className="w-6 text-right text-xs text-slate-400">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{a.nombre}</span>
                    <span className={`text-xs ${actual ? "text-slate-500" : "text-slate-400"}`}>{actual ? ta.estados[actual] : ta.estados.sinMarca}</span>
                  </span>
                  <span role="radiogroup" aria-label={a.nombre} className="flex items-center gap-2">
                    {ESTADOS_ASISTENCIA.map((e) => (
                      <button
                        key={e}
                        type="button"
                        role="radio"
                        aria-checked={actual === e}
                        aria-label={ta.estados[e]}
                        title={ta.estados[e]}
                        onClick={() => marcar(a.matricula, e)}
                        className={`h-9 w-9 rounded-full ring-1 transition sm:h-8 sm:w-8 ${actual === e ? `${COLOR[e].lleno} ring-2 ring-offset-2` : COLOR[e].suave}`}
                      />
                    ))}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-xl bg-white/95 px-3 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 backdrop-blur">
        <span className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span className="inline-flex items-center gap-1">
            <PuntoEstado estado="asistencia" /> {conteo.asistencia}
          </span>
          <span className="inline-flex items-center gap-1">
            <PuntoEstado estado="retardo" /> {conteo.retardo}
          </span>
          <span className="inline-flex items-center gap-1">
            <PuntoEstado estado="falta" /> {conteo.falta}
          </span>
          {conteo.sin > 0 && <span className="text-slate-400">{formato(ts.sinMarcaN, { n: conteo.sin })}</span>}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {error && <span className="text-sm text-error">{error}</span>}
          {!error && mensaje && <span className="text-sm text-acierto">{mensaje}</span>}
          {!error && !mensaje && sucio && <span className="text-sm text-aviso">{ts.sinGuardar}</span>}
          {guardado && (
            <Boton type="button" variante="secundario" onClick={borrar} disabled={pendiente} className="!py-2">
              {ts.borrar}
            </Boton>
          )}
          <Boton type="button" onClick={guardar} disabled={pendiente || alumnos.length === 0}>
            {pendiente ? ts.guardando : ts.guardar}
          </Boton>
        </span>
      </div>
      {guardado && (
        <p className="text-xs text-slate-500">{formato(ts.tomadaCon, { fecha: guardado.fecha, metodo: guardado.metodo === "foto" ? ts.metodoFoto : ts.metodoManual })}</p>
      )}
    </div>
  );
}
