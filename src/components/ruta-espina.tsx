// Diagrama de la ruta de aprendizaje, tipo espina de pescado: de "Inicio" a "Completado" pasando
// por las unidades del curso; de cada unidad salen en diagonal los temas a repasar o practicar.
// La unidad es azul con paloma si está certificada, amarilla si tiene actividades sin certificar y
// blanca (con el borde de su color) si aún no empieza.
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import { AMARILLO_PROGRESO, AZUL_CERTIFICADA, acomodoEspina, colorRuta, renglones, type RutaAprendizaje, type TemaRuta } from "@/lib/ruta-aprendizaje";

const LINEA = "#cbd5e1";

/** Paloma centrada en (x, y) para un círculo de radio r. */
function Paloma({ x, y, r, color = "#fff" }: { x: number; y: number; r: number; color?: string }) {
  const s = r / 10;
  return (
    <path
      d={`M${x - 4.6 * s} ${y + 0.2 * s} L${x - 1.4 * s} ${y + 3.6 * s} L${x + 5 * s} ${y - 3.6 * s}`}
      fill="none"
      stroke={color}
      strokeWidth={Math.max(2, 2.4 * s)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Flechita (chevrón) en (x, y) apuntando en la dirección del ángulo, como en las espinas. */
function Flecha({ x, y, angulo }: { x: number; y: number; angulo: number }) {
  return <path d="M-5 -6 L3 0 L-5 6" transform={`translate(${x} ${y}) rotate(${angulo})`} fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />;
}

function Etiqueta({ x, y, lineas, ancla = "start", clase = "fill-slate-600", tam = 11, peso = 400 }: { x: number; y: number; lineas: string[]; ancla?: "start" | "middle" | "end"; clase?: string; tam?: number; peso?: number }) {
  return (
    <text x={x} y={y} textAnchor={ancla} className={clase} style={{ fontSize: tam, fontWeight: peso }}>
      {lineas.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : tam + 2}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

export function RutaEspina({
  ruta,
  t,
  enlaceTema,
  enlaceUnidad,
}: {
  ruta: RutaAprendizaje;
  t: Diccionario;
  enlaceTema?: (unidad: number, tema: TemaRuta) => string;
  /** Al tocar una unidad se abre su vista (actividades, autoestudio y tablero). */
  enlaceUnidad?: (unidad: number) => string;
}) {
  const tr = t.ruta;
  const ac = acomodoEspina(ruta.unidades.map((u) => u.temas.length), 56);
  const puntosEspina = [ac.inicio, ...ac.unidades, ac.fin];

  return (
    <svg width={ac.ancho} height={ac.alto} viewBox={`0 0 ${ac.ancho} ${ac.alto}`} role="img" aria-label={tr.diagrama} className="block max-w-none font-sans">
      {/* Espina: línea central con flechitas entre nodos. */}
      <line x1={ac.inicio.x} y1={ac.y} x2={ac.fin.x} y2={ac.y} stroke={LINEA} strokeWidth={3} strokeLinecap="round" />
      {puntosEspina.slice(1).map((p, i) => {
        const prev = puntosEspina[i];
        return <Flecha key={i} x={(prev.x + p.x) / 2 - (i === 0 ? 0 : 18)} y={ac.y} angulo={0} />;
      })}

      {/* Espinas de los temas. */}
      {ruta.unidades.map((u, ui) => {
        const ramas = ac.ramas.filter((r) => r.unidad === ui);
        const arriba = ramas.filter((r) => r.arriba);
        const abajo = ramas.filter((r) => !r.arriba);
        return [arriba, abajo].map((lado, li) => {
          if (!lado.length) return null;
          const ultimo = lado[lado.length - 1].nodo;
          const desde = lado[0].desde;
          const angulo = li === 0 ? -45 : 45;
          return (
            <g key={`${ui}-${li}`}>
              <line x1={desde.x} y1={desde.y} x2={ultimo.x} y2={ultimo.y} stroke={LINEA} strokeWidth={2.5} strokeLinecap="round" />
              {lado.map((r, k) => {
                const antes = k === 0 ? r.desde : lado[k - 1].nodo;
                return <Flecha key={k} x={(antes.x + r.nodo.x) / 2} y={(antes.y + r.nodo.y) / 2} angulo={angulo} />;
              })}
            </g>
          );
        });
      })}

      {/* Nodos de los temas. */}
      {ac.ramas.map((r) => {
        const u = ruta.unidades[r.unidad];
        const tema = u.temas[r.tema];
        const color = colorRuta(r.unidad);
        const dominado = tema.estado === "dominado";
        const opcional = !tema.recomendado && !dominado;
        const lineas = renglones(tema.nombre.replace(/^\s*\d+(\.\d+)*[.)]?\s+/, ""), 22, 2);
        const titulo = [
          tema.nombre,
          dominado ? formato(tr.dominado, { p: Math.round(tema.porcentaje ?? 0) }) : opcional ? tr.leyenda.opcional : tr.acciones[tema.accion],
          !dominado && tema.porcentaje !== null ? formato(tr.avance, { p: Math.round(tema.porcentaje) }) : "",
        ]
          .filter(Boolean)
          .join(" · ");
        const nodo = (
          <g>
            <title>{titulo}</title>
            {/* Área de toque más grande que el nodo. */}
            <circle cx={r.nodo.x} cy={r.nodo.y} r={18} fill="transparent" />
            <circle
              cx={r.nodo.x}
              cy={r.nodo.y}
              r={11}
              fill={opcional ? "#fff" : color}
              fillOpacity={dominado ? 0.55 : 1}
              stroke={color}
              strokeWidth={opcional ? 2.5 : 0}
              strokeDasharray={opcional ? "3 2.5" : undefined}
            />
            {dominado && <Paloma x={r.nodo.x} y={r.nodo.y} r={8} />}
            {tema.recomendado && tema.estado === "en_progreso" && <circle cx={r.nodo.x + 8} cy={r.nodo.y - 8} r={4} fill={AMARILLO_PROGRESO} stroke="#fff" strokeWidth={1.5} />}
            <Etiqueta
              x={r.nodo.x + 16}
              y={r.nodo.y + (lineas.length > 1 ? -2 : 4)}
              lineas={lineas}
              clase={opcional || dominado ? "fill-slate-400" : "fill-slate-700"}
              peso={tema.recomendado ? 500 : 400}
            />
          </g>
        );
        const href = enlaceTema && !dominado ? enlaceTema(r.unidad, tema) : undefined;
        return href ? (
          <a key={`${r.unidad}-${r.tema}`} href={href} className="cursor-pointer [&:focus-visible_circle:nth-of-type(2)]:stroke-slate-900 [&:hover_circle:nth-of-type(2)]:opacity-80">
            {nodo}
          </a>
        ) : (
          <g key={`${r.unidad}-${r.tema}`}>{nodo}</g>
        );
      })}

      {/* Inicio. */}
      <circle cx={ac.inicio.x} cy={ac.y} r={16} fill="#334155" />
      <path d={`M${ac.inicio.x - 4} ${ac.y - 6} L${ac.inicio.x + 6} ${ac.y} L${ac.inicio.x - 4} ${ac.y + 6} Z`} fill="#fff" />
      <Etiqueta x={ac.inicio.x} y={ac.y - 26} lineas={[tr.inicio]} ancla="middle" clase="fill-slate-800" tam={13} peso={700} />

      {/* Unidades. */}
      {ruta.unidades.map((u, i) => {
        const p = ac.unidades[i];
        const color = colorRuta(i);
        const relleno = u.estado === "certificada" ? AZUL_CERTIFICADA : u.estado === "en_progreso" ? AMARILLO_PROGRESO : "#fff";
        const borde = u.estado === "certificada" ? AZUL_CERTIFICADA : color;
        const contenido = (
          <>
            <title>{`${formato(tr.unidad, { n: i + 1 })} · ${u.nombre} · ${tr.estados[u.estado]}${enlaceUnidad ? ` · ${tr.verUnidad}` : ""}`}</title>
            {/* Área de toque que incluye el nombre de la unidad. */}
            {enlaceUnidad && <rect x={p.x - 60} y={p.y - 46} width={120} height={120} fill="transparent" />}
            {/* Anillo exterior con el color de la unidad, para no perder su identidad. */}
            <circle cx={p.x} cy={p.y} r={25} fill="#fff" stroke={color} strokeWidth={3} />
            <circle cx={p.x} cy={p.y} r={19} fill={relleno} stroke={borde} strokeWidth={u.estado === "sin_iniciar" ? 3 : 0} />
            {u.estado === "certificada" ? (
              <Paloma x={p.x} y={p.y} r={15} />
            ) : (
              <text x={p.x} y={p.y + 5} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700 }} fill={u.estado === "en_progreso" ? "#713f12" : color}>
                {i + 1}
              </text>
            )}
            <Etiqueta x={p.x} y={p.y - 34} lineas={[formato(tr.unidad, { n: i + 1 })]} ancla="middle" clase="fill-slate-500" tam={10} peso={600} />
            <Etiqueta x={p.x} y={p.y + 44} lineas={renglones(u.nombre.replace(/^(unidad|unit)\s*\d+[.:)\-–]?\s*/i, ""), 20, 2)} ancla="middle" clase="fill-slate-800" tam={12} peso={600} />
          </>
        );
        return enlaceUnidad ? (
          <a key={u.nombre} href={enlaceUnidad(i)} className="cursor-pointer outline-none [&:focus-visible_circle:first-of-type]:stroke-slate-900 [&:hover_circle:first-of-type]:stroke-[5px]">
            {contenido}
          </a>
        ) : (
          <g key={u.nombre}>{contenido}</g>
        );
      })}

      {/* Completado. */}
      <circle cx={ac.fin.x} cy={ac.y} r={24} fill={ruta.completada ? AZUL_CERTIFICADA : "#fff"} stroke={ruta.completada ? AZUL_CERTIFICADA : "#334155"} strokeWidth={3} />
      {ruta.completada ? (
        <Paloma x={ac.fin.x} y={ac.y} r={18} />
      ) : (
        <path d={`M${ac.fin.x - 6} ${ac.y + 10} V${ac.y - 10} L${ac.fin.x + 8} ${ac.y - 5} L${ac.fin.x - 6} ${ac.y}`} fill="#334155" stroke="#334155" strokeWidth={2} strokeLinejoin="round" />
      )}
      <Etiqueta x={ac.fin.x} y={ac.y - 34} lineas={[tr.completado]} ancla="middle" clase="fill-slate-800" tam={13} peso={700} />
    </svg>
  );
}

/** Leyenda de colores y símbolos del diagrama. */
export function LeyendaRuta({ t }: { t: Diccionario }) {
  const tl = t.ruta.leyenda;
  const item = "flex items-center gap-2";
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
      <li className={item}>
        <svg width="22" height="22" aria-hidden>
          <circle cx="11" cy="11" r="10" fill={AZUL_CERTIFICADA} />
          <Paloma x={11} y={11} r={8} />
        </svg>
        {tl.certificada}
      </li>
      <li className={item}>
        <svg width="22" height="22" aria-hidden>
          <circle cx="11" cy="11" r="10" fill={AMARILLO_PROGRESO} />
        </svg>
        {tl.progreso}
      </li>
      <li className={item}>
        <svg width="22" height="22" aria-hidden>
          <circle cx="11" cy="11" r="8.5" fill="#fff" stroke={colorRuta(0)} strokeWidth="3" />
        </svg>
        {tl.sinIniciar}
      </li>
      <li className={item}>
        <svg width="16" height="16" aria-hidden>
          <circle cx="8" cy="8" r="7" fill={colorRuta(1)} />
        </svg>
        {tl.tema}
      </li>
      <li className={item}>
        <svg width="16" height="16" aria-hidden>
          <circle cx="8" cy="8" r="7" fill={colorRuta(1)} fillOpacity={0.55} />
          <Paloma x={8} y={8} r={5.5} />
        </svg>
        {tl.dominado}
      </li>
      <li className={item}>
        <svg width="16" height="16" aria-hidden>
          <circle cx="8" cy="8" r="6" fill="#fff" stroke={colorRuta(1)} strokeWidth="2" strokeDasharray="3 2.5" />
        </svg>
        {tl.opcional}
      </li>
    </ul>
  );
}
