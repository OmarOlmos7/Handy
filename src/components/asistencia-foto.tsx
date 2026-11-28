"use client";

// Foto del grupo con los rostros numerados: en el registro inicial el profesor asigna cada número a
// un alumno; en la toma de asistencia el servidor reconoce a los registrados y el profesor corrige.
// La foto se analiza solo en este dispositivo y no se sube.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { guardarRostros, reconocerRostros } from "@/app/acciones-asistencia";
import { formato } from "@/lib/i18n/idiomas";
import { analizarFoto, cargarMotor, type FotoPreparada } from "./motor-rostros";
import { useTextos } from "./proveedor-textos";
import { Boton } from "./ui";

interface AlumnoFoto {
  matricula: string;
  nombre: string;
}

type Estado = { fase: "inicial" } | { fase: "cargando" } | { fase: "buscando"; avance: number } | { fase: "listo" } | { fase: "error" };

/** Recorte del rostro como miniatura (con la foto reducida de fondo). */
function Miniatura({ foto, i, lado = 56 }: { foto: FotoPreparada; i: number; lado?: number }) {
  const c = foto.rostros[i].caja;
  const ventana = Math.max(c.ancho, c.alto) * 1.35;
  const escala = lado / ventana;
  const x = c.x + c.ancho / 2 - ventana / 2;
  const y = c.y + c.alto / 2 - ventana / 2;
  return (
    <span
      aria-hidden
      className="block shrink-0 rounded-lg bg-slate-200 ring-1 ring-slate-300"
      style={{
        width: lado,
        height: lado,
        backgroundImage: `url(${foto.url})`,
        backgroundSize: `${foto.ancho * escala}px ${foto.alto * escala}px`,
        backgroundPosition: `${-x * escala}px ${-y * escala}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

/**
 * Elegir o tomar la foto, buscar los rostros y mostrarlos numerados sobre ella, con un selector de
 * alumno por rostro. `reconocer` pide al servidor quién es cada rostro (alumnos ya registrados).
 */
function FotoConRostros({
  grupoId,
  alumnos,
  permitidos,
  reconocer,
  asignados,
  setAsignados,
  foto,
  setFoto,
  ayuda,
}: {
  grupoId: string;
  alumnos: AlumnoFoto[];
  /** Alumnos que se pueden asignar (con consentimiento); los demás salen desactivados. Sin valor, todos. */
  permitidos?: Set<string>;
  reconocer: boolean;
  asignados: string[];
  setAsignados: (a: string[]) => void;
  foto: FotoPreparada | null;
  setFoto: (f: FotoPreparada | null) => void;
  ayuda?: string;
}) {
  const tf = useTextos().t.asistencia.foto;
  const tr = useTextos().t.asistencia.rostros;
  const [estado, setEstado] = useState<Estado>({ fase: foto ? "listo" : "inicial" });
  const [reconocidos, setReconocidos] = useState<string[]>([]);
  const entrada = useRef<HTMLInputElement>(null);
  const selectores = useRef<(HTMLSelectElement | null)[]>([]);

  async function elegida(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setFoto(null);
    setAsignados([]);
    setReconocidos([]);
    try {
      setEstado({ fase: "cargando" });
      await cargarMotor();
      setEstado({ fase: "buscando", avance: 0 });
      const lista = await analizarFoto(archivo, (avance) => setEstado({ fase: "buscando", avance }));
      let iniciales = lista.rostros.map(() => "");
      if (reconocer && lista.rostros.length) {
        const r = await reconocerRostros(
          grupoId,
          lista.rostros.map((x) => x.descriptor),
        );
        if ("ok" in r) iniciales = r.coincidencias.map((c) => c.matricula ?? "");
      }
      setFoto(lista);
      setAsignados(iniciales);
      setReconocidos(iniciales);
      setEstado({ fase: "listo" });
    } catch (err) {
      console.error("Rostros", err);
      setEstado({ fase: "error" });
    }
  }

  function asignar(i: number, matricula: string) {
    // Un alumno solo puede estar en un rostro: si ya estaba en otro, se quita de ahí.
    setAsignados(asignados.map((m, j) => (j === i ? matricula : m === matricula && matricula ? "" : m)));
  }

  const nombre = (m: string) => alumnos.find((a) => a.matricula === m)?.nombre ?? "";
  const n = foto?.rostros.length ?? 0;
  const conNombre = asignados.filter(Boolean).length;

  return (
    <div className="space-y-3">
      {ayuda && <p className="text-sm text-slate-600">{ayuda}</p>}
      <p className="rounded-lg bg-tinta-50 px-3 py-2 text-xs text-tinta-800">🔒 {tf.privacidad}</p>
      <input ref={entrada} type="file" accept="image/*" capture="environment" className="sr-only" onChange={elegida} aria-label={tf.tomar} />
      <div className="flex flex-wrap items-center gap-3">
        <Boton type="button" onClick={() => entrada.current?.click()} disabled={estado.fase === "cargando" || estado.fase === "buscando"}>
          {foto ? tf.otra : tf.tomar}
        </Boton>
        {estado.fase === "cargando" && <span className="text-sm text-slate-600">{tf.cargando}</span>}
        {estado.fase === "buscando" && (
          <span className="flex items-center gap-2 text-sm text-slate-600">
            {tf.buscando}
            <span className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
              <span className="block h-full rounded-full bg-tinta-600 transition-all" style={{ width: `${Math.round(estado.avance * 100)}%` }} />
            </span>
          </span>
        )}
        {estado.fase === "error" && <span className="text-sm text-error">{tf.error}</span>}
        {estado.fase === "listo" && foto && (
          <span className="text-sm text-slate-700">{n ? formato(tf.encontrados, { n, r: conNombre }) : tf.ninguno}</span>
        )}
      </div>

      {foto && n > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <figure className="relative overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt="" className="block h-auto w-full" />
            <svg viewBox={`0 0 ${foto.ancho} ${foto.alto}`} className="absolute inset-0 h-full w-full" role="img" aria-label={formato(tf.encontrados, { n, r: conNombre })}>
              {foto.rostros.map((r, i) => {
                const c = r.caja;
                const ok = Boolean(asignados[i]);
                const radio = Math.max(foto.ancho / 70, c.ancho * 0.28);
                const grosor = Math.max(2, foto.ancho / 450);
                return (
                  <g key={i} className="cursor-pointer" onClick={() => selectores.current[i]?.focus()}>
                    <rect x={c.x} y={c.y} width={c.ancho} height={c.alto} rx={grosor * 2} fill="none" stroke={ok ? "#22c55e" : "#f59e0b"} strokeWidth={grosor} />
                    <circle cx={c.x + c.ancho / 2} cy={Math.max(radio, c.y - radio * 0.9)} r={radio} fill={ok ? "#15803d" : "#b45309"} stroke="white" strokeWidth={grosor * 0.8} />
                    <text
                      x={c.x + c.ancho / 2}
                      y={Math.max(radio, c.y - radio * 0.9)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={radio * 1.1}
                      fontWeight={700}
                      fill="white"
                    >
                      {i + 1}
                    </text>
                    {ok && (
                      <text
                        x={c.x + c.ancho / 2}
                        y={c.y + c.alto + radio * 0.9}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={radio * 0.75}
                        fontWeight={600}
                        fill="white"
                        stroke="#0f172a"
                        strokeWidth={radio * 0.16}
                        paintOrder="stroke"
                      >
                        {nombre(asignados[i]).split(" ")[0]}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </figure>
          <ol className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {foto.rostros.map((_, i) => (
              <li key={i} className={`flex items-center gap-2.5 rounded-xl bg-white p-2 ring-1 ${asignados[i] ? "ring-emerald-300" : "ring-amber-300"}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${asignados[i] ? "bg-acierto" : "bg-aviso"}`}>{i + 1}</span>
                <Miniatura foto={foto} i={i} />
                <label className="min-w-0 flex-1 text-xs text-slate-500">
                  <span className="sr-only">{formato(tr.asignar, { n: i + 1 })}</span>
                  {reconocer && (reconocidos[i] ? <span className="text-acierto">✓ {tf.reconocidos}</span> : <span className="text-aviso">{tf.noReconocido}</span>)}
                  <select
                    ref={(el) => {
                      selectores.current[i] = el;
                    }}
                    value={asignados[i] ?? ""}
                    onChange={(e) => asignar(i, e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
                  >
                    <option value="">{reconocer ? tf.nadie : tr.elegir}</option>
                    {alumnos.map((a) => {
                      const libre = !permitidos || permitidos.has(a.matricula);
                      return (
                        <option key={a.matricula} value={a.matricula} disabled={!libre}>
                          {a.nombre}
                          {!libre ? ` ${tr.sinPermiso}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** Pestaña "Tomar con foto" de la lista de asistencia. */
export function FotoAsistencia({
  grupoId,
  alumnos,
  hayRostros,
  consentidos,
  rutaRostros,
  onAplicar,
}: {
  grupoId: string;
  alumnos: AlumnoFoto[];
  hayRostros: boolean;
  consentidos: string[];
  rutaRostros: string;
  onAplicar: (reconocidos: string[], faltaALosDemas: boolean) => void;
}) {
  const tf = useTextos().t.asistencia.foto;
  const [foto, setFoto] = useState<FotoPreparada | null>(null);
  const [asignados, setAsignados] = useState<string[]>([]);
  const [faltas, setFaltas] = useState(false);
  const [mejorar, setMejorar] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  if (!hayRostros)
    return (
      <div className="rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">
        <p className="text-slate-700">{tf.sinRegistro}</p>
        <Link href={rutaRostros} className="mt-2 inline-block font-medium text-tinta-700 hover:underline">
          {tf.irRegistro} →
        </Link>
      </div>
    );

  const consentimiento = new Set(consentidos);

  function aplicar() {
    const elegidos = asignados.filter(Boolean);
    setError("");
    iniciar(async () => {
      if (mejorar && foto) {
        const nuevos = foto.rostros
          .map((r, i) => ({ matricula: asignados[i], descriptor: r.descriptor }))
          .filter((x) => x.matricula && consentimiento.has(x.matricula));
        if (nuevos.length) {
          const r = await guardarRostros(grupoId, nuevos);
          if ("error" in r) {
            setError(r.error);
            return;
          }
        }
      }
      onAplicar(elegidos, faltas);
    });
  }

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <h2 className="font-semibold text-slate-900">{tf.titulo}</h2>
      <FotoConRostros
        grupoId={grupoId}
        alumnos={alumnos}
        permitidos={undefined}
        reconocer
        asignados={asignados}
        setAsignados={setAsignados}
        foto={foto}
        setFoto={setFoto}
        ayuda={tf.ayuda}
      />
      {foto && foto.rostros.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={faltas} onChange={(e) => setFaltas(e.target.checked)} /> {tf.aplicarFaltas}
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={mejorar} onChange={(e) => setMejorar(e.target.checked)} /> {tf.mejorar}
          </label>
          {error && <span className="text-error">{error}</span>}
          <Boton type="button" className="ml-auto" onClick={aplicar} disabled={pendiente}>
            {tf.aplicar}
          </Boton>
        </div>
      )}
    </div>
  );
}

/** Paso 2 del registro de rostros: foto inicial, números y un alumno por número. */
export function RegistroRostros({ grupoId, alumnos, consentidos }: { grupoId: string; alumnos: AlumnoFoto[]; consentidos: string[] }) {
  const router = useRouter();
  const tr = useTextos().t.asistencia.rostros;
  const [foto, setFoto] = useState<FotoPreparada | null>(null);
  const [asignados, setAsignados] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const permitidos = new Set(consentidos);
  const n = asignados.filter(Boolean).length;

  function guardar() {
    setError("");
    setMensaje("");
    if (!foto || !n) return setError(tr.nadaAsignado);
    iniciar(async () => {
      const r = await guardarRostros(
        grupoId,
        foto.rostros.map((x, i) => ({ matricula: asignados[i], descriptor: x.descriptor })).filter((x) => x.matricula),
      );
      if ("error" in r) setError(r.error);
      else {
        setMensaje(tr.guardados);
        setFoto(null);
        setAsignados([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <FotoConRostros
        key={mensaje}
        grupoId={grupoId}
        alumnos={alumnos}
        permitidos={permitidos}
        reconocer={false}
        asignados={asignados}
        setAsignados={setAsignados}
        foto={foto}
        setFoto={setFoto}
      />
      {mensaje && <p className="text-sm text-acierto">{mensaje}</p>}
      {foto && foto.rostros.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {error && <span className="text-sm text-error">{error}</span>}
          <Boton type="button" className="ml-auto" onClick={guardar} disabled={pendiente || !n}>
            {formato(tr.guardar, { n })}
          </Boton>
        </div>
      )}
    </div>
  );
}
