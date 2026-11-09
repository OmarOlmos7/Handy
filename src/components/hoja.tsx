// Vista de una página de la actividad como hoja tamaño carta (SVG).
// Tres modos:
//  - "en_blanco": hoja imprimible con QR y marcas de esquina.
//  - "solucion": la hoja resuelta por el profesor.
//  - "alumno": la hoja del alumno; con `anotada` se dibujan palomas, taches y comentarios.
// En producción la imagen de fondo es la foto escaneada y las marcas se dibujan
// encima en el PDF (PyMuPDF). Aquí se simula la escritura con una fuente manuscrita.
import type { Actividad, Alumno, Entrega, Reactivo, ResultadoReactivo } from "@/lib/tipos";
import { calificacion } from "@/lib/estadisticas";

const ANCHO = 850;
const ALTO = 1100;
const LAPIZ = "#334155";
const ROJO = "#dc2626";
const VERDE = "#15803d";
const MANO = "var(--font-caveat), cursive";

type Modo = "en_blanco" | "solucion" | "alumno";

function envolver(texto: string, max = 68) {
  const palabras = texto.split(" ");
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    if ((actual + " " + p).trim().length > max) {
      lineas.push(actual.trim());
      actual = p;
    } else actual += " " + p;
  }
  if (actual.trim()) lineas.push(actual.trim());
  return lineas;
}

/** Patrón tipo QR determinista a partir de un texto (solo visual en la demo). */
function QR({ x, y, texto, tam = 96 }: { x: number; y: number; texto: string; tam?: number }) {
  const n = 21;
  const c = tam / n;
  let h = 0;
  for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const celdas: [number, number][] = [];
  const esBuscador = (i: number, j: number) =>
    (i < 7 && j < 7) || (i < 7 && j >= n - 7) || (i >= n - 7 && j < 7);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (esBuscador(i, j)) continue;
      h = (h * 1103515245 + 12345) >>> 0;
      if ((h >>> 16) & 1) celdas.push([i, j]);
    }
  const buscador = (bx: number, by: number) => (
    <g>
      <rect x={bx} y={by} width={7 * c} height={7 * c} fill="#111" />
      <rect x={bx + c} y={by + c} width={5 * c} height={5 * c} fill="#fff" />
      <rect x={bx + 2 * c} y={by + 2 * c} width={3 * c} height={3 * c} fill="#111" />
    </g>
  );
  return (
    <g aria-label="Código QR de la página">
      <rect x={x - 4} y={y - 4} width={tam + 8} height={tam + 8} fill="#fff" />
      {celdas.map(([i, j]) => (
        <rect key={`${i}-${j}`} x={x + j * c} y={y + i * c} width={c} height={c} fill="#111" />
      ))}
      {buscador(x, y)}
      {buscador(x + (n - 7) * c, y)}
      {buscador(x, y + (n - 7) * c)}
    </g>
  );
}

function Paloma({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x} ${y} l${10 * s} ${12 * s} l${22 * s} ${-28 * s}`}
      fill="none"
      stroke={VERDE}
      strokeWidth={4 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Tache({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const d = 13 * s;
  return (
    <g stroke={ROJO} strokeWidth={4 * s} strokeLinecap="round">
      <path d={`M${x - d} ${y - d} L${x + d} ${y + d}`} />
      <path d={`M${x + d} ${y - d} L${x - d} ${y + d}`} />
    </g>
  );
}

/** Cómo escribió el alumno una línea de su desarrollo, según qué tan bien hizo el paso. */
function lineaAlumno(linea: string, fraccion: number, esResultado: boolean) {
  if (fraccion === 1) return linea;
  if (esResultado) return linea.replace(/\s*[a-zA-Z/²]+$/, "") || "?";
  if (fraccion === 0) return "";
  return linea;
}

function textoAbierto(fraccion: number) {
  if (fraccion === 1)
    return [
      "En el MRU la velocidad no cambia, va igual",
      "todo el tiempo. En el MRUA la velocidad cambia",
      "porque hay aceleración constante, ej. caída libre.",
    ];
  if (fraccion >= 0.5)
    return ["En el MRU la velocidad es constante y en el", "MRUA va más rápido o más lento.", ""];
  return ["El MRUA es cuando se mueve más rápido", "", ""];
}

function lineasComentario(res: ResultadoReactivo | undefined, r: Reactivo, anotada: boolean) {
  if (!anotada || !res || res.puntosObtenidos >= r.puntos) return [];
  return envolver(res.comentario, 56);
}

function altoReactivo(r: Reactivo, comentario: string[], avisoConfianza = false) {
  const enun = envolver(`${r.numero}. ${r.enunciado}`).length * 24;
  const cuerpo = r.tipo === "desarrollo" ? 5 * 38 + 24 : r.tipo === "abierto" ? 3 * 36 + 16 : 46;
  return enun + cuerpo + comentario.length * 30 + (comentario.length ? 6 : 0) + (avisoConfianza ? 24 : 0) + 26;
}

function BloqueReactivo({
  r,
  y,
  modo,
  res,
  anotada,
  modoProfesor,
}: {
  r: Reactivo;
  y: number;
  modo: Modo;
  res?: ResultadoReactivo;
  anotada: boolean;
  modoProfesor: boolean;
}) {
  const lineasEnun = envolver(`${r.numero}. ${r.enunciado}`);
  const fraccion = res ? res.puntosObtenidos / r.puntos : 1;
  const comentario = lineasComentario(res, r, anotada);
  const yCuerpo = y + lineasEnun.length * 24 + 12;
  const alto = altoReactivo(r, comentario, modoProfesor && res?.confianza === "baja");
  const yComentario = yCuerpo + (r.tipo === "desarrollo" ? 5 * 38 + 24 : r.tipo === "abierto" ? 3 * 36 + 16 : 46) + 22;
  const margen = 760;

  let cuerpo: React.ReactNode = null;
  if (r.tipo === "desarrollo") {
    const lineas = r.solucionPasos ?? [];
    cuerpo = (
      <g>
        <rect x={70} y={yCuerpo - 6} width={480} height={5 * 38 + 14} rx={6} fill="none" stroke="#cbd5e1" strokeDasharray="5 5" />
        {lineas.map((l, i) => {
          const fr = res?.pasos?.[i] ?? 1;
          const texto =
            modo === "en_blanco" ? "" : modo === "solucion" ? l : lineaAlumno(l, fr, i === lineas.length - 1);
          const yl = yCuerpo + 30 + i * 38;
          return (
            <g key={i}>
              <text x={90} y={yl} fontFamily={MANO} fontSize={30} fill={LAPIZ}>
                {texto}
              </text>
              {anotada && res && fr < 1 && texto && (
                <path d={`M90 ${yl + 6} q 40 6 80 0 t 80 0 t 80 0`} fill="none" stroke={ROJO} strokeWidth={2} />
              )}
              {anotada && res && !texto && modo === "alumno" && (
                <text x={90} y={yl} fontFamily={MANO} fontSize={26} fill={ROJO}>
                  falta este paso
                </text>
              )}
              {anotada && res && (
                <g>
                  {fr === 1 ? <Paloma x={512} y={yl - 4} s={0.55} /> : <Tache x={530} y={yl - 10} s={0.55} />}
                  <text x={566} y={yl} fontSize={13} fill={fr === 1 ? VERDE : ROJO}>
                    {r.pasos?.[i]?.nombre}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    );
  } else if (r.tipo === "abierto") {
    const lineas = modo === "solucion" ? envolver(r.respuesta, 46) : modo === "alumno" ? textoAbierto(fraccion) : [];
    cuerpo = (
      <g>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line x1={70} x2={670} y1={yCuerpo + 32 + i * 36} y2={yCuerpo + 32 + i * 36} stroke="#e2e8f0" />
            <text x={74} y={yCuerpo + 26 + i * 36} fontFamily={MANO} fontSize={28} fill={LAPIZ}>
              {lineas[i] ?? ""}
            </text>
          </g>
        ))}
      </g>
    );
  } else {
    const respuesta = modo === "solucion" ? r.respuesta : modo === "alumno" ? (res?.respuestaLeida ?? "") : "";
    cuerpo = (
      <g>
        <text x={90} y={yCuerpo + 26} fontSize={16} fill="#64748b">
          Respuesta:
        </text>
        <line x1={180} x2={460} y1={yCuerpo + 32} y2={yCuerpo + 32} stroke="#cbd5e1" />
        <text x={190} y={yCuerpo + 26} fontFamily={MANO} fontSize={32} fill={LAPIZ}>
          {respuesta}
        </text>
      </g>
    );
  }

  const yMarca = yCuerpo + 18;
  return (
    <g>
      {lineasEnun.map((l, i) => (
        <text key={i} x={60} y={y + 18 + i * 24} fontSize={18} fill="#0f172a" fontWeight={i === 0 ? 500 : 400}>
          {l}
        </text>
      ))}
      <text x={margen + 40} y={y + 18} fontSize={13} fill="#94a3b8" textAnchor="end">
        {r.puntos} pt{r.puntos === 1 ? "" : "s"}
      </text>
      {cuerpo}
      {anotada && res && (
        <g>
          {fraccion === 1 ? <Paloma x={margen - 20} y={yMarca} /> : <Tache x={margen} y={yMarca - 10} />}
          <text x={margen + 40} y={yMarca + 30} fontFamily={MANO} fontSize={26} fill={fraccion === 1 ? VERDE : ROJO} textAnchor="end">
            {res.puntosObtenidos}/{r.puntos}
          </text>
        </g>
      )}
      {comentario.map((l, i) => (
        <text key={i} x={90} y={yComentario + i * 30} fontFamily={MANO} fontSize={27} fill={ROJO}>
          {l}
        </text>
      ))}
      {modoProfesor && res?.confianza === "baja" && (
        <g>
          <rect x={44} y={y - 8} width={772} height={alto - 6} rx={8} fill="#fef3c7" fillOpacity={0.35} stroke="#b45309" strokeDasharray="6 4" />
          <text x={56} y={y + alto - 22} fontSize={13} fill="#b45309" fontWeight={600}>
            Baja confianza: la IA no pudo leer bien este reactivo. Verifica.
          </text>
        </g>
      )}
    </g>
  );
}

export function Hoja({
  actividad,
  pagina,
  modo,
  alumno,
  entrega,
  grupoTexto,
  anotada = false,
  modoProfesor = false,
}: {
  actividad: Actividad;
  pagina: number;
  modo: Modo;
  alumno?: Alumno;
  entrega?: Entrega;
  grupoTexto: string;
  anotada?: boolean;
  modoProfesor?: boolean;
}) {
  const reactivos = actividad.reactivos.filter((r) => r.pagina === pagina);
  // Posición vertical de cada reactivo: se acumulan las alturas de los anteriores.
  const conResultado = reactivos.map((r) => ({
    r,
    res: entrega?.resultados.find((x) => x.numero === r.numero),
  }));
  const alturas = conResultado.map(({ r, res }) =>
    altoReactivo(r, lineasComentario(res, r, anotada), modoProfesor && res?.confianza === "baja"),
  );
  const bloques = conResultado.map(({ r, res }, i) => (
    <BloqueReactivo
      key={r.numero}
      r={r}
      y={230 + alturas.slice(0, i).reduce((s, h) => s + h, 0)}
      modo={modo}
      res={res}
      anotada={anotada}
      modoProfesor={modoProfesor}
    />
  ));

  const nombre = modo === "solucion" ? "SOLUCIÓN DEL PROFESOR" : modo === "alumno" ? alumno?.nombre : "";
  const cal = anotada && entrega ? calificacion(actividad, entrega) : null;

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="h-auto w-full rounded-md bg-papel shadow-md ring-1 ring-slate-200"
      role="img"
      aria-label={`Página ${pagina} de ${actividad.titulo}${alumno ? `, ${alumno.nombre}` : ""}`}
    >
      <rect width={ANCHO} height={ALTO} fill={modo === "en_blanco" ? "#fff" : "#fbfaf7"} />
      {/* Marcas de alineación en las esquinas */}
      {[
        [24, 24],
        [ANCHO - 54, 24],
        [24, ALTO - 54],
        [ANCHO - 54, ALTO - 54],
      ].map(([x, yy]) => (
        <rect key={`${x}-${yy}`} x={x} y={yy} width={30} height={30} fill="#111" />
      ))}
      <QR x={ANCHO - 170} y={70} texto={`${actividad.id}:${pagina}`} />
      <text x={60} y={90} fontSize={14} fill="#64748b" letterSpacing={1}>
        {grupoTexto.toUpperCase()}
      </text>
      <text x={60} y={120} fontSize={24} fontWeight={600} fill="#0f172a">
        {actividad.titulo}
      </text>
      <text x={60} y={170} fontSize={17} fill="#475569">
        Nombre:
      </text>
      <line x1={130} x2={560} y1={176} y2={176} stroke="#cbd5e1" />
      <text x={140} y={170} fontFamily={MANO} fontSize={modo === "solucion" ? 24 : 34} fill={modo === "solucion" ? "#1d43c9" : LAPIZ}>
        {nombre}
      </text>
      <text x={60} y={200} fontSize={13} fill="#94a3b8">
        Página {pagina} de {actividad.paginas}
      </text>
      {cal !== null && pagina === 1 && (
        <g>
          <circle cx={600} cy={145} r={44} fill="none" stroke={ROJO} strokeWidth={3} />
          <text x={600} y={158} textAnchor="middle" fontFamily={MANO} fontSize={40} fill={ROJO}>
            {cal.toFixed(1)}
          </text>
        </g>
      )}
      <line x1={60} x2={ANCHO - 60} y1={212} y2={212} stroke="#e2e8f0" />
      {bloques}
      {reactivos.length === 0 && (
        <text x={ANCHO / 2} y={500} textAnchor="middle" fontSize={18} fill="#94a3b8">
          Espacio para la actividad
        </text>
      )}
    </svg>
  );
}
