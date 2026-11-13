import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ajustarCreditos } from "@/app/acciones-admin";
import { Columnas } from "@/components/graficas";
import { Boton, Encabezado, Insignia, Tarjeta, campo } from "@/components/ui";
import { NOMBRE_ESTATUS_PAGO, resumenAdmin, type EstatusPago, type Rol } from "@/lib/admin";
import { leer } from "@/lib/almacen";
import { estadoServidor } from "@/lib/disco";
import { iaDisponible } from "@/lib/ia";
import { fechaHoraLarga } from "@/lib/resultados";
import { requerirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Administración" };

const entero = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
const dolares = (n: number) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD";

function tokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("es-MX", { maximumFractionDigits: 2 })} M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} k`;
  return entero(n);
}

function bytes(n: number) {
  const unidades = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < unidades.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toLocaleString("es-MX", { maximumFractionDigits: i === 0 ? 0 : 1 })} ${unidades[i]}`;
}

const fecha = (iso?: string) => (iso ? fechaHoraLarga(iso) : "—");

const TONO_ESTATUS: Record<EstatusPago, "verde" | "azul" | "rojo"> = { pagando: "verde", prueba: "azul", sin_saldo: "rojo" };
const NOMBRE_ROL: Record<Rol, string> = { administrador: "Administrador", profesor: "Profesor", alumno: "Alumno" };

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: ReactNode; detalle?: ReactNode }) {
  return (
    <Tarjeta>
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>}
    </Tarjeta>
  );
}

function Seccion({ id, titulo, subtitulo, children }: { id?: string; titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {subtitulo && <p className="mb-3 text-sm text-slate-500">{subtitulo}</p>}
      {!subtitulo && <div className="mb-3" />}
      {children}
    </section>
  );
}

const th = "px-3 py-2.5 font-medium";
const td = "px-3 py-2 align-top";

export default async function Administracion({ searchParams }: PageProps<"/admin">) {
  await requerirAdmin();
  const { aviso } = await searchParams;
  const db = await leer();
  const r = resumenAdmin(db);
  const servidor = estadoServidor();
  const maxDia = Math.max(...r.tokensPorDia.map((d) => d.total / 1000), 1);
  const disco = servidor.disco;
  const pctDisco = disco ? Math.round((disco.usado / disco.total) * 100) : 0;

  return (
    <>
      <Encabezado
        titulo="Administración"
        subtitulo={`Operación y consumo de recursos de iEureka-Grader · ${fecha(new Date().toISOString())}`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Cifra
          titulo="Usuarios"
          valor={entero(r.usuarios.profesores + r.usuarios.alumnosConCuenta)}
          detalle={`${r.usuarios.profesores} profesores (${r.usuarios.administradores} admin) · ${r.usuarios.alumnosConCuenta} alumnos con cuenta`}
        />
        <Cifra
          titulo="Sesiones activas"
          valor={entero(r.sesiones.profesores + r.sesiones.alumnos)}
          detalle={`${r.sesiones.profesores} de profesores · ${r.sesiones.alumnos} de alumnos`}
        />
        <Cifra
          titulo="Tokens de IA consumidos"
          valor={tokens(r.tokens.total)}
          detalle={`${entero(r.tokens.llamadas)} llamadas · ${dolares(r.tokens.costo)} estimado`}
        />
        <Cifra
          titulo="Disco del servidor"
          valor={disco ? `${bytes(disco.libre)} libres` : "—"}
          detalle={
            disco
              ? `${pctDisco} % usado de ${bytes(disco.total)} · datos de la app ${bytes(servidor.datos.bytes)}`
              : "No se pudo leer el disco"
          }
        />
        <Cifra
          titulo="Cursos (grupos)"
          valor={entero(r.uso.grupos)}
          detalle={`${entero(r.usuarios.alumnosInscritos)} alumnos inscritos en listas`}
        />
        <Cifra titulo="Actividades" valor={entero(r.uso.actividades)} detalle={`${entero(r.uso.entregas)} entregas recibidas`} />
        <Cifra
          titulo="Entregas evaluadas"
          valor={entero(r.uso.evaluadas)}
          detalle={`${entero(r.uso.paginasEvaluadas)} páginas · ${entero(r.uso.pendientes)} por evaluar`}
        />
        <Cifra
          titulo="Créditos"
          valor={`${entero(r.creditos.saldo)} en saldo`}
          detalle={`${entero(r.creditos.usados)} usados · ${entero(r.creditos.comprados)} comprados · ${entero(r.creditos.regalados)} de regalo`}
        />
      </div>

      <Seccion
        titulo="Consumo de la IA"
        subtitulo={`Tokens por día (miles), últimos ${r.tokensPorDia.length} días. Costo estimado con la tarifa pública del modelo; la factura real está en la consola de Anthropic.${iaDisponible() ? "" : " Ojo: el servidor no tiene llave de la API configurada."}`}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
          <Tarjeta className="min-w-0 overflow-x-auto">
            <div className="min-w-[520px]">
              <Columnas
                filas={r.tokensPorDia.map((d) => ({
                  nombre: d.dia.slice(8, 10) + "/" + d.dia.slice(5, 7),
                  valor: Math.round(d.total / 100) / 10,
                  detalle: `${d.llamadas} llamadas · ${dolares(d.costo)}`,
                }))}
                max={maxDia}
                sufijo=" k tokens"
                colorDe={() => "#3b6ef6"}
              />
            </div>
          </Tarjeta>
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className={th}>Uso</th>
                  <th className={`${th} text-right`}>Llamadas</th>
                  <th className={`${th} text-right`}>Tokens</th>
                  <th className={`${th} text-right`}>Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {r.tokensPorTipo.map((t) => (
                  <tr key={t.tipo}>
                    <td className={td}>
                      {t.nombre}
                      {t.total.fallidas > 0 && (
                        <span className="block text-xs text-error">{t.total.fallidas} sin respuesta útil</span>
                      )}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{entero(t.total.llamadas)}</td>
                    <td className={`${td} text-right tabular-nums`}>
                      {tokens(t.total.total)}
                      <span className="block text-xs text-slate-500">
                        {tokens(t.total.entrada)} entrada · {tokens(t.total.salida)} salida
                      </span>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{dolares(t.total.costo)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 font-medium">
                <tr>
                  <td className={td}>Total</td>
                  <td className={`${td} text-right tabular-nums`}>{entero(r.tokens.llamadas)}</td>
                  <td className={`${td} text-right tabular-nums`}>{tokens(r.tokens.total)}</td>
                  <td className={`${td} text-right tabular-nums`}>{dolares(r.tokens.costo)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          El consumo se registra desde que se instaló este panel. A la IA nunca se envían nombres ni matrículas de los alumnos;
          aquí solo se guardan cifras.
        </p>
      </Seccion>

      <Seccion
        titulo="Profesores"
        subtitulo="Identificación, rol, uso de la plataforma, créditos, estatus de pago y tokens de cada cuenta."
      >
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className={th}>Usuario</th>
                <th className={th}>Rol</th>
                <th className={th}>Alta / último acceso</th>
                <th className={`${th} text-right`}>Cursos</th>
                <th className={`${th} text-right`}>Alumnos</th>
                <th className={`${th} text-right`}>Actividades</th>
                <th className={`${th} text-right`}>Entregas</th>
                <th className={`${th} text-right`}>Págs. evaluadas</th>
                <th className={`${th} text-right`}>Créditos</th>
                <th className={th}>Pago</th>
                <th className={`${th} text-right`}>Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.profesores.length === 0 && (
                <tr>
                  <td className={`${td} text-slate-500`} colSpan={11}>
                    Aún no hay profesores registrados.
                  </td>
                </tr>
              )}
              {r.profesores.map((p) => (
                <tr key={p.id}>
                  <td className={td}>
                    <span className="block font-medium">{p.nombre}</span>
                    <span className="block text-xs text-slate-500">{p.correo}</span>
                  </td>
                  <td className={td}>
                    <Insignia tono={p.rol === "administrador" ? "ambar" : "gris"}>{NOMBRE_ROL[p.rol]}</Insignia>
                  </td>
                  <td className={`${td} text-xs text-slate-600`}>
                    <span className="block">{fecha(p.creadoEn)}</span>
                    <span className="block text-slate-500">
                      {p.sesionesActivas > 0 ? `Sesión abierta · ${fecha(p.ultimoAcceso)}` : "Sin sesión abierta"}
                    </span>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{entero(p.grupos)}</td>
                  <td className={`${td} text-right tabular-nums`}>{entero(p.alumnosInscritos)}</td>
                  <td className={`${td} text-right tabular-nums`}>{entero(p.actividades)}</td>
                  <td className={`${td} text-right tabular-nums`}>{entero(p.entregas)}</td>
                  <td className={`${td} text-right tabular-nums`}>{entero(p.paginasEvaluadas)}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    <span className="block font-medium">{entero(p.creditos.saldo)} saldo</span>
                    <span className="block text-xs text-slate-500">
                      {entero(p.creditos.usados)} usados · {entero(p.creditos.comprados)} comprados
                    </span>
                    <span className="block text-xs text-slate-500">
                      {entero(p.creditos.regalados)} regalo
                      {p.creditos.ajustes ? ` · ${p.creditos.ajustes > 0 ? "+" : ""}${entero(p.creditos.ajustes)} ajuste` : ""}
                    </span>
                  </td>
                  <td className={td}>
                    <Insignia tono={TONO_ESTATUS[p.estatus]}>{NOMBRE_ESTATUS_PAGO[p.estatus]}</Insignia>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    <span className="block">{tokens(p.tokens.total)}</span>
                    <span className="block text-xs text-slate-500">
                      {entero(p.tokens.llamadas)} llamadas · {dolares(p.tokens.costo)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          El administrador se asigna con la variable ADMIN_CORREOS del servidor. Los pagos en línea aún no están conectados:
          “Cliente de pago” significa que la cuenta ya recibió créditos por compra.
        </p>
      </Seccion>

      <Seccion
        id="creditos"
        titulo="Ajustar créditos"
        subtitulo="Suma créditos de cortesía o corrige un saldo. Usa un número negativo para restar. Queda en los movimientos del profesor."
      >
        {aviso && <p className="mb-3 rounded-lg bg-tinta-50 px-3 py-2 text-sm text-tinta-700">{String(aviso)}</p>}
        <Tarjeta>
          <form
            action={ajustarCreditos}
            className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end"
          >
            <label className="text-sm">
              Profesor
              <select name="profesor" required className={campo}>
                {r.profesores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {p.correo}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Créditos
              <input name="cantidad" type="number" step={1} required placeholder="100" className={campo} />
            </label>
            <label className="text-sm">
              Motivo
              <input name="motivo" maxLength={80} placeholder="Cortesía piloto, devolución…" className={campo} />
            </label>
            <Boton type="submit">Aplicar</Boton>
          </form>
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Alumnos con cuenta" subtitulo="Alumnos que crearon su acceso con correo y clave.">
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className={th}>Alumno</th>
                <th className={th}>Rol</th>
                <th className={th}>Alta</th>
                <th className={`${th} text-right`}>Cursos</th>
                <th className={`${th} text-right`}>Entregas</th>
                <th className={th}>Sesión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.alumnos.length === 0 && (
                <tr>
                  <td className={`${td} text-slate-500`} colSpan={6}>
                    Ningún alumno ha creado su cuenta todavía.
                  </td>
                </tr>
              )}
              {r.alumnos.map((a) => (
                <tr key={a.id}>
                  <td className={td}>
                    <span className="block font-medium">{a.nombre}</span>
                    <span className="block text-xs text-slate-500">{a.correo}</span>
                  </td>
                  <td className={td}>
                    <Insignia>Alumno</Insignia>
                  </td>
                  <td className={`${td} text-xs text-slate-600`}>{fecha(a.creadoEn)}</td>
                  <td className={`${td} text-right tabular-nums`}>{entero(a.cursos)}</td>
                  <td className={`${td} text-right tabular-nums`}>{entero(a.entregas)}</td>
                  <td className={td}>
                    {a.sesionActiva ? (
                      <Insignia tono="verde">Abierta</Insignia>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion titulo="Servidor" subtitulo="Espacio en disco, archivos guardados y memoria del proceso.">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Tarjeta>
            <p className="text-sm font-medium">Disco</p>
            {disco ? (
              <>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`${pctDisco} % usado`}>
                  <div
                    className={`h-full rounded-full ${pctDisco >= 90 ? "bg-error" : pctDisco >= 75 ? "bg-aviso" : "bg-tinta-600"}`}
                    style={{ width: `${pctDisco}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {bytes(disco.usado)} usados de {bytes(disco.total)} ·{" "}
                  <span className="font-medium text-slate-900">{bytes(disco.libre)} libres</span>
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No se pudo leer el disco.</p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Datos de la app</dt>
              <dd className="text-right tabular-nums">
                {bytes(servidor.datos.bytes)} · {entero(servidor.datos.archivos)} archivos
              </dd>
              <dt className="text-slate-500">Base de datos</dt>
              <dd className="text-right tabular-nums">{bytes(servidor.datos.baseDeDatos)}</dd>
              <dt className="text-slate-500">Memoria del proceso</dt>
              <dd className="text-right tabular-nums">{bytes(servidor.memoria.proceso)}</dd>
              <dt className="text-slate-500">Memoria libre del servidor</dt>
              <dd className="text-right tabular-nums">
                {bytes(servidor.memoria.libre)} de {bytes(servidor.memoria.total)}
              </dd>
              <dt className="text-slate-500">Encendido desde</dt>
              <dd className="text-right">{fecha(servidor.encendidoDesde)}</dd>
            </dl>
          </Tarjeta>
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className={th}>Carpeta de datos</th>
                  <th className={`${th} text-right`}>Archivos</th>
                  <th className={`${th} text-right`}>Tamaño</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {servidor.datos.carpetas.length === 0 && (
                  <tr>
                    <td className={`${td} text-slate-500`} colSpan={3}>
                      Sin archivos subidos todavía.
                    </td>
                  </tr>
                )}
                {servidor.datos.carpetas.map((c) => (
                  <tr key={c.nombre}>
                    <td className={td}>{c.nombre}</td>
                    <td className={`${td} text-right tabular-nums`}>{entero(c.archivos)}</td>
                    <td className={`${td} text-right tabular-nums`}>{bytes(c.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Seccion>
    </>
  );
}
