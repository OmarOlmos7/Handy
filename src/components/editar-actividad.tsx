"use client";

import { leerFechas } from "@/lib/periodo";
import { FechasActividad } from "./fechas-actividad";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { modificarActividad } from "@/app/acciones";
import type { EsfuerzoIA, EstiloCorreccion, MotorIA, TemarioActividad, TipoReactivo } from "@/lib/tipos";
import { LARGO_ETIQUETA } from "@/lib/etiquetas";
import { DeslizadorPrecision } from "./precision-ia";
import { SelectorTemario, type AsignaturaParaAlta } from "./selector-temario";
import { IDIOMAS, NOMBRE_IDIOMA, formato, type Idioma } from "@/lib/i18n/idiomas";
import { OpcionEstilo, OpcionSolucion } from "./opcion-solucion";
import { useTextos } from "./proveedor-textos";
import { Boton, BotonLink, campo } from "./ui";

interface ReactivoEditable {
  numero: number;
  tipo: TipoReactivo;
  enunciado: string;
  tema: string;
  puntos: number;
  opciones?: string[];
}

/** Formulario para modificar una actividad ya creada. */
export function EditarActividad({
  id,
  recibidas,
  escaneada = false,
  tiposSugeridos = [],
  asignaturas = [],
  materia,
  esfuerzos,
  noCambia,
  inicial,
}: {
  id: string;
  /** Entregas que ya llegaron: se avisa que la hoja impresa ya está en manos de los alumnos. */
  recibidas: number;
  /** Actividad hecha con un escaneo: al cambiar el texto, el PDF se reemplaza por una hoja nueva. */
  escaneada?: boolean;
  /** Tipos de actividad que ya usa el curso y los de siempre, para elegir uno. */
  tiposSugeridos?: string[];
  /** Asignaturas del profesor, para cambiar la unidad y los temas. */
  asignaturas?: AsignaturaParaAlta[];
  materia?: string;
  esfuerzos: Record<MotorIA, EsfuerzoIA>;
  /** Lo que no se cambia al reeditar (formato, cómo se creó y curso), ya escrito. */
  noCambia: string;
  inicial: {
    titulo: string;
    fecha: string;
    visibleDesde: string;
    envioDesde: string;
    envioHasta: string;
    resultadosDesde: string;
    escala: 10 | 100;
    sinPuntaje: boolean;
    sinSolucion: boolean;
    estiloCorreccion: EstiloCorreccion;
    idioma?: Idioma;
    instruccionesAlumno?: string[];
    etiqueta: string;
    temario?: TemarioActividad;
    motor: MotorIA;
    esfuerzo: EsfuerzoIA;
    reactivos: ReactivoEditable[];
  };
}) {
  const router = useRouter();
  const { t } = useTextos();
  const te = t.profesor.editarActividad;
  const tn = t.profesor.nuevaActividad;
  const nombreTipo: Record<string, string> = t.profesor.tipos;
  const [sinSolucion, setSinSolucion] = useState(inicial.sinSolucion);
  const [estilo, setEstilo] = useState(inicial.estiloCorreccion);
  const [reactivos, setReactivos] = useState(inicial.reactivos);
  const [etiqueta, setEtiqueta] = useState(inicial.etiqueta);
  // Con entregas, los alumnos ya contestaron sobre el texto: enunciados, opciones e instrucciones quedan fijos.
  const fijo = recibidas > 0;
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  const cambiar = (numero: number, cambio: Partial<ReactivoEditable>) =>
    setReactivos((rs) => rs.map((r) => (r.numero === numero ? { ...r, ...cambio } : r)));

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setError("");
    // Revisa el orden de las fechas aquí: en producción el mensaje de un error del servidor no llega.
    try {
      leerFechas({
        visibleDesde: String(d.get("visibleDesde") ?? ""),
        envioDesde: String(d.get("envioDesde") ?? ""),
        envioHasta: String(d.get("envioHasta") ?? ""),
        resultadosDesde: String(d.get("resultadosDesde") ?? ""),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    iniciar(async () => {
      try {
        await modificarActividad(id, {
          titulo: String(d.get("titulo") ?? ""),
          fecha: String(d.get("fecha") ?? ""),
          visibleDesde: String(d.get("visibleDesde") ?? ""),
          envioDesde: String(d.get("envioDesde") ?? ""),
          envioHasta: String(d.get("envioHasta") ?? ""),
          resultadosDesde: String(d.get("resultadosDesde") ?? ""),
          escala: d.get("escala") === "10" ? 10 : 100,
          sinPuntaje: d.get("escala") === "sin",
          sinSolucion,
          estiloCorreccion: estilo,
          idioma: String(d.get("idioma") ?? ""),
          instruccionesAlumno: inicial.instruccionesAlumno && !fijo ? String(d.get("instrucciones") ?? "").split("\n") : undefined,
          etiqueta,
          // Sin asignaturas no hay selector de temario: se deja el que tenía.
          temario: d.has("temario") ? String(d.get("temario") ?? "") : undefined,
          motor: String(d.get("motor") ?? ""),
          esfuerzo: String(d.get("esfuerzo") ?? ""),
          reactivos,
        });
        router.push(`/profesor/actividades/${id}/hoja`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : te.noSeGuardo);
      }
    });
  }

  return (
    <form onSubmit={guardar} className="mx-auto max-w-3xl space-y-5">
      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">{noCambia}</p>
      {escaneada && (
        <p className="rounded-lg bg-tinta-50 p-3 text-sm text-tinta-900 ring-1 ring-tinta-200">{te.avisoEscaneada}</p>
      )}
      {recibidas > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          {formato(te.avisoEntregas, { n: recibidas })}
        </p>
      )}
      <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <label className="block text-sm font-medium text-slate-700">
          {tn.tituloActividad}
          <input name="titulo" required defaultValue={inicial.titulo} className={campo} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {tn.idiomaActividad}
          <select name="idioma" className={campo} defaultValue={inicial.idioma ?? ""}>
            {!inicial.idioma && <option value="">—</option>}
            {IDIOMAS.map((i) => (
              <option key={i} value={i}>
                {NOMBRE_IDIOMA[i]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-500">{tn.idiomaActividadTexto}</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            {tn.fecha}
            <input name="fecha" type="date" required defaultValue={inicial.fecha} className={campo} />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {tn.tipoActividad}
            <input
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              maxLength={LARGO_ETIQUETA}
              list="tipos-actividad"
              className={campo}
              placeholder={tn.ejemploTipo}
            />
          </label>
          <datalist id="tipos-actividad">
            {tiposSugeridos.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tiposSugeridos.map((e) => {
              const activo = etiqueta.trim().toLowerCase() === e.toLowerCase();
              return (
                <button
                  key={e}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setEtiqueta(activo ? "" : e)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    activo ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </div>
        <SelectorTemario asignaturas={asignaturas} materia={materia} inicial={inicial.temario} />
        <FechasActividad inicial={inicial} />
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">{tn.calificarSobre}</legend>
          <div className="mt-1 inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {([100, 10, "sin"] as const).map((n) => (
              <label
                key={n}
                className="cursor-pointer rounded-lg px-4 py-1.5 text-sm font-medium text-slate-600 has-[:checked]:bg-white has-[:checked]:text-tinta-700 has-[:checked]:shadow-sm has-[:checked]:ring-1 has-[:checked]:ring-slate-200"
              >
                <input type="radio" name="escala" value={n} defaultChecked={n === (inicial.sinPuntaje ? "sin" : inicial.escala)} className="sr-only" />
                {n === "sin" ? tn.sinPuntos : formato(tn.puntos, { n })}
              </label>
            ))}
          </div>
        </fieldset>
        <OpcionSolucion
          sinSolucion={sinSolucion}
          onCambio={(v) => {
            setSinSolucion(v);
            // Sugerencia: sin solución (producciones escritas) se suele subrayar; se puede cambiar abajo.
            setEstilo(v ? "subrayado" : "margen");
          }}
        />
        <OpcionEstilo estilo={estilo} onCambio={setEstilo} />
        <DeslizadorPrecision inicial={inicial.motor} esfuerzoInicial={inicial.esfuerzo} esfuerzos={esfuerzos} />
        {inicial.instruccionesAlumno && (
          <label className="block text-sm font-medium text-slate-700">
            {te.instrucciones}
            <textarea name="instrucciones" rows={4} readOnly={fijo} defaultValue={inicial.instruccionesAlumno.join("\n")} className={`${campo} ${fijo ? "bg-slate-50 text-slate-500" : ""}`} />
            <span className="mt-1 block text-xs font-normal text-slate-500">{te.instruccionesAyuda}</span>
          </label>
        )}
      </div>

      {reactivos.length > 0 && (
        <div className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold">{te.reactivos}</h2>
          <p className="text-xs text-slate-500">{fijo ? te.reactivosAyudaFijo : te.reactivosAyuda}</p>
          {reactivos.map((r) => (
            <div key={r.numero} className="space-y-2 rounded-lg p-4 ring-1 ring-slate-200">
              <p className="text-xs font-medium text-slate-500">
                {formato(te.reactivo, { n: r.numero })} · {nombreTipo[r.tipo]}
              </p>
              <textarea
                aria-label={formato(te.enunciadoDe, { n: r.numero })}
                rows={3}
                value={r.enunciado}
                readOnly={fijo}
                onChange={(e) => cambiar(r.numero, { enunciado: e.target.value })}
                className={`${campo} ${fijo ? "bg-slate-50 text-slate-500" : ""}`}
              />
              {r.opciones && (
                <label className="block text-xs font-medium text-slate-500">
                  {te.opciones}
                  <textarea
                    rows={Math.max(3, r.opciones.length)}
                    value={r.opciones.join("\n")}
                    readOnly={fijo}
                    onChange={(e) => cambiar(r.numero, { opciones: e.target.value.split("\n") })}
                    className={`${campo} ${fijo ? "bg-slate-50 text-slate-500" : ""}`}
                  />
                </label>
              )}
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <label className="block text-xs font-medium text-slate-500">
                  {te.tema}
                  <input value={r.tema} onChange={(e) => cambiar(r.numero, { tema: e.target.value })} className={campo} />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  {te.puntos}
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={r.puntos}
                    onChange={(e) => cambiar(r.numero, { puntos: Number(e.target.value) })}
                    className={campo}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <BotonLink href={`/profesor/actividades/${id}/hoja`} variante="secundario">
          {te.cancelar}
        </BotonLink>
        <Boton type="submit" disabled={guardando}>
          {guardando ? te.guardando : te.guardar}
        </Boton>
      </div>
    </form>
  );
}
