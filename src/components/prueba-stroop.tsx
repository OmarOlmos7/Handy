"use client";

// Prueba de Stroop de lectura de colores: primero una práctica corta (no se guarda) y luego la
// prueba. En cada ensayo aparece el nombre de un color escrito con tinta de color y el alumno
// elige el color de la tinta. Se mide el tiempo de cada respuesta; el resumen lo calcula el servidor.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { guardarStroop } from "@/app/acciones-perfil";
import { formato } from "@/lib/i18n/idiomas";
import { COLORES_STROOP, ENSAYOS_PRACTICA, ENSAYOS_PRUEBA, TINTA_STROOP, generarEnsayos } from "@/lib/perfil/stroop";
import type { ColorStroop, EnsayoStroop } from "@/lib/tipos";
import { Boton } from "./ui";
import { useTextos } from "./proveedor-textos";

type Fase = "intro" | "practica" | "listo" | "prueba" | "guardando" | "hecho";
/** Pausa con una cruz al centro antes de cada palabra, en ms. */
const PAUSA = 500;

export function PruebaStroop({ grupoId, volver, pendiente }: { grupoId: string; volver: string; pendiente: boolean }) {
  const { t } = useTextos();
  const ts = t.perfil.stroop;
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("intro");
  const [lista, setLista] = useState<{ palabra: ColorStroop; tinta: ColorStroop }[]>([]);
  const [indice, setIndice] = useState(0);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const respuestas = useRef<EnsayoStroop[]>([]);
  const inicio = useRef(0);
  const [, iniciar] = useTransition();

  const empezar = (f: "practica" | "prueba") => {
    respuestas.current = [];
    setLista(generarEnsayos(f === "practica" ? ENSAYOS_PRACTICA : ENSAYOS_PRUEBA));
    setIndice(0);
    setVisible(false);
    setFase(f);
  };

  // Cada ensayo: una pausa con la cruz y luego la palabra; el tiempo corre desde que aparece.
  useEffect(() => {
    if (fase !== "practica" && fase !== "prueba") return;
    const id = window.setTimeout(() => {
      setVisible(true);
      inicio.current = performance.now();
    }, PAUSA);
    return () => window.clearTimeout(id);
  }, [fase, indice]);

  const enviar = useCallback(
    (entrada: { ensayos?: EnsayoStroop[]; omitir?: boolean }) => {
      setFase("guardando");
      setError("");
      iniciar(async () => {
        const r = await guardarStroop(grupoId, entrada);
        if ("error" in r) {
          setError(r.error === "noToca" ? ts.noToca : ts.error);
          setFase("intro");
          return;
        }
        // Al guardar, el perfil muestra los resultados (esta página ya no tiene prueba pendiente).
        setFase("hecho");
        router.push(volver);
      });
    },
    [grupoId, router, volver, ts.error, ts.noToca],
  );

  const responder = useCallback(
    (color: ColorStroop) => {
      if (!visible || (fase !== "practica" && fase !== "prueba")) return;
      const actual = lista[indice];
      respuestas.current.push({ ...actual, respuesta: color, ms: Math.round(performance.now() - inicio.current) });
      setVisible(false);
      if (indice + 1 < lista.length) return setIndice(indice + 1);
      if (fase === "practica") return setFase("listo");
      enviar({ ensayos: respuestas.current });
    },
    [visible, fase, lista, indice, enviar],
  );

  // Teclas 1 a 4, en el orden de los botones.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= COLORES_STROOP.length) responder(COLORES_STROOP[n - 1]);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [responder]);

  if (fase === "hecho") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-semibold text-slate-900">{ts.guardada}</p>
        <Boton type="button" onClick={() => router.push(volver)}>
          {ts.volver}
        </Boton>
      </div>
    );
  }

  // Sin prueba pendiente (ya la presentó este semestre o aún no se abre la de cierre).
  if (!pendiente && fase === "intro") return <p className="text-sm text-slate-600">{ts.noToca}</p>;

  if (fase === "intro" || fase === "listo" || fase === "guardando") {
    const [antes, despues] = formato(ts.ejemplo, { palabra: "\u0000", tinta: ts.botones.verde }).split("\u0000");
    return (
      <div className="space-y-4">
        {fase === "listo" ? (
          <p className="text-[15px] font-medium text-slate-900">{ts.finPractica}</p>
        ) : (
          <>
            <p className="text-[15px] text-slate-800">{ts.intro}</p>
            <p className="text-sm text-slate-700">
              {antes}
              <strong className="rounded bg-slate-900 px-1.5 py-0.5 font-bold" style={{ color: TINTA_STROOP.verde }}>
                {ts.colores.rojo}
              </strong>
              {despues}
            </p>
            <p className="text-sm text-slate-600">{formato(ts.duracion, { n: ENSAYOS_PRUEBA })}</p>
            <p className="text-sm text-slate-600">{ts.unaVez}</p>
          </>
        )}
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {fase !== "listo" && (
            <Boton type="button" variante="secundario" disabled={fase === "guardando"} onClick={() => empezar("practica")}>
              {formato(ts.practicar, { n: ENSAYOS_PRACTICA })}
            </Boton>
          )}
          <Boton type="button" disabled={fase === "guardando"} onClick={() => empezar("prueba")}>
            {fase === "guardando" ? ts.guardando : ts.empezar}
          </Boton>
        </div>
        <p className="text-xs text-slate-500">{ts.nota}</p>
        {fase === "intro" && (
          <button
            type="button"
            className="text-xs text-slate-500 underline hover:text-slate-700"
            onClick={() => {
              if (window.confirm(ts.omitirConfirma)) enviar({ omitir: true });
            }}
          >
            {ts.omitir}
          </button>
        )}
      </div>
    );
  }

  const actual = lista[indice];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{fase === "practica" ? ts.practica : ts.titulo}</span>
        <span>{formato(ts.ensayo, { n: indice + 1, total: lista.length })}</span>
      </div>
      <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-900 select-none sm:h-56" aria-live="polite">
        {visible && actual ? (
          <span className="text-5xl font-extrabold tracking-wide sm:text-6xl" style={{ color: TINTA_STROOP[actual.tinta] }}>
            {ts.colores[actual.palabra]}
          </span>
        ) : (
          <span className="text-4xl font-light text-slate-500">+</span>
        )}
      </div>
      <p className="text-center text-sm font-medium text-slate-700">{ts.pregunta}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COLORES_STROOP.map((c, i) => (
          <button
            key={c}
            type="button"
            disabled={!visible}
            onClick={() => responder(c)}
            className="rounded-xl bg-white px-3 py-4 text-base font-semibold text-slate-900 ring-1 ring-slate-300 transition hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60"
          >
            <span className="mr-1.5 hidden text-xs text-slate-400 sm:inline">{i + 1}</span>
            {ts.botones[c]}
          </button>
        ))}
      </div>
    </div>
  );
}
