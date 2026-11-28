"use server";

// Perfil de aprendizaje (Modelo CREAR), etapa 1. Todo queda detrás de la bandera perfil_cognitivo:
// con la bandera apagada estas acciones no hacen nada.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { textos } from "@/lib/i18n/servidor";
import { crearPreferenciaCompra, mercadoPagoConfigurado, pagosDemo } from "@/lib/mercadopago";
import { confirmarCompra, esPaquete, nuevaCompra } from "@/lib/perfil/bolsa";
import { aplicarEtapas, limpiarEtapasActividad } from "@/lib/perfil/etapas";
import { urlBase } from "@/lib/qr";
import { leer, modificar } from "@/lib/almacen";
import { alumnoEnGrupo } from "@/lib/cuentas";
import { perfilActivo } from "@/lib/banderas";
import { conConsentimiento, nuevoConsentimiento, retirarConsentimiento, tieneConsentimiento } from "@/lib/perfil/consentimiento";
import { esDisciplina, guardarModelo, limpiarEtapas } from "@/lib/perfil/crear";
import { finesDeCursos } from "@/lib/perfil/diagnostico-inicial";
import { limpiarEnsayos, momentoPendiente, resumirStroop, semestreDe } from "@/lib/perfil/stroop";
import { alumnoActual, requerirProfesor } from "@/lib/sesion";

type Resultado = { ok: true } | { error: string };

/** El alumno da su consentimiento informado (y, si es menor, el de su madre, padre o tutor). */
export async function darConsentimientoPerfil(datos: {
  acepta: boolean;
  menor: boolean;
  tutorNombre?: string;
  tutorParentesco?: string;
  aceptaTutor?: boolean;
}): Promise<Resultado> {
  if (!perfilActivo()) return { error: "noDisponible" };
  const alumno = await alumnoActual();
  if (!alumno) return { error: "sinSesion" };
  const r = nuevoConsentimiento(alumno.id, {
    acepta: datos.acepta === true,
    menor: datos.menor === true,
    tutorNombre: datos.tutorNombre,
    tutorParentesco: datos.tutorParentesco,
    aceptaTutor: datos.aceptaTutor === true,
  });
  if (!r.ok) return { error: r.error };
  modificar((db) => {
    db.consentimientosPerfil = conConsentimiento(db.consentimientosPerfil, r.consentimiento);
  });
  revalidatePath("/alumno", "layout");
  return { ok: true };
}

/** El alumno retira su consentimiento: se deja de registrar su perfil. */
export async function retirarConsentimientoPerfil(): Promise<Resultado> {
  if (!perfilActivo()) return { error: "noDisponible" };
  const alumno = await alumnoActual();
  if (!alumno) return { error: "sinSesion" };
  modificar((db) => {
    db.consentimientosPerfil = retirarConsentimiento(db.consentimientosPerfil, alumno.id);
  });
  revalidatePath("/alumno", "layout");
  return { ok: true };
}

/**
 * Guarda la prueba de Stroop que le toca al alumno (inicio o cierre del semestre). El momento y el
 * resumen los decide el servidor; del navegador solo se toman los ensayos, ya validados.
 */
export async function guardarStroop(grupoId: string | undefined, entrada: { ensayos?: unknown; omitir?: boolean }): Promise<Resultado> {
  if (!perfilActivo()) return { error: "noDisponible" };
  const alumno = await alumnoActual();
  if (!alumno) return { error: "sinSesion" };
  const db = await leer();
  if (!tieneConsentimiento(db.consentimientosPerfil, alumno.id)) return { error: "sinConsentimiento" };
  const ahora = new Date();
  const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
  const fines = cuenta ? finesDeCursos(db.grupos.filter((g) => alumnoEnGrupo(g, cuenta))) : [];
  const momento = momentoPendiente(db.stroop, alumno.id, ahora, fines);
  if (!momento) return { error: "noToca" };
  const omitida = entrada.omitir === true;
  const ensayos = omitida ? [] : limpiarEnsayos(entrada.ensayos);
  if (!ensayos) return { error: "incompleta" };
  const curso = grupoId && alumno.cursos.some((c) => c.grupo.id === grupoId) ? grupoId : undefined;
  modificar((d) => {
    const lista = (d.stroop ??= []);
    // Si dos pestañas envían a la vez, la segunda no duplica la aplicación.
    if (lista.some((a) => a.alumnoId === alumno.id && a.semestre === semestreDe(ahora) && a.momento === momento)) return;
    lista.push({
      alumnoId: alumno.id,
      semestre: semestreDe(ahora),
      momento,
      fecha: ahora.toISOString(),
      ...(curso ? { grupoId: curso } : {}),
      ...(omitida ? { omitida: true } : { resumen: resumirStroop(ensayos) }),
      ensayos,
    });
  });
  revalidatePath("/alumno", "layout");
  return { ok: true };
}

/** El profesor guarda el Modelo CREAR adaptado a la disciplina de su curso. */
export async function guardarModeloCrear(grupoId: string, disciplina: string, etapas: unknown): Promise<{ ok: true; version: number; cambio: boolean } | { error: string }> {
  if (!perfilActivo()) return { error: "noDisponible" };
  const profesor = await requerirProfesor();
  const db = await leer();
  const grupo = db.grupos.find((g) => g.id === grupoId);
  if (!grupo || grupo.profesorId !== profesor.id) return { error: "noEncontrado" };
  if (!esDisciplina(disciplina)) return { error: "disciplina" };
  const limpias = limpiarEtapas(etapas, disciplina);
  const r = modificar((d) => {
    const g = guardarModelo(d.modelosCrear, grupoId, disciplina, limpias);
    d.modelosCrear = g.lista;
    return { cambio: g.cambio, version: g.lista.find((m) => m.grupoId === grupoId)?.version ?? 0 };
  });
  revalidatePath(`/profesor/grupos/${grupoId}`, "layout");
  return { ok: true, ...r };
}

/** El profesor fija qué etapa CREAR evidencia cada reactivo, paso y criterio de su actividad. */
export async function guardarEtapasActividad(actividadId: string, etapas: unknown): Promise<Resultado> {
  if (!perfilActivo()) return { error: "noDisponible" };
  const profesor = await requerirProfesor();
  const db = await leer();
  const actividad = db.actividades.find((a) => a.id === actividadId);
  const grupo = actividad && db.grupos.find((g) => g.id === actividad.grupoId);
  if (!actividad || !grupo || grupo.profesorId !== profesor.id) return { error: "noEncontrado" };
  const limpias = limpiarEtapasActividad(actividad, etapas);
  modificar((d) => {
    const a = d.actividades.find((x) => x.id === actividadId);
    if (a) aplicarEtapas(a, limpias);
  });
  revalidatePath(`/profesor/grupos/${grupo.id}`, "layout");
  return { ok: true };
}

/**
 * El alumno compra un paquete de créditos (100 a 500). Se manda a pagar a Mercado Pago; en una
 * demostración (PAGOS_DEMO=1) se lleva a la página de la compra para simular el pago.
 */
export async function comprarCreditos(form: FormData) {
  if (!perfilActivo()) redirect("/alumno");
  const cuenta = await alumnoActual();
  if (!cuenta) redirect("/alumno");
  const creditos = Number(form.get("creditos"));
  if (!esPaquete(creditos)) redirect("/alumno/creditos?error=paquete");
  const demo = pagosDemo();
  if (!mercadoPagoConfigurado() && !demo) redirect("/alumno/creditos?error=sinPagos");
  const compra = modificar((d) => ({ ...nuevaCompra(d, cuenta.id, creditos) }));
  if (demo) redirect(`/alumno/creditos/${compra.llave}`);
  let destino: string;
  try {
    const { t } = await textos();
    // Solo el paquete: nunca el nombre ni la matrícula del alumno.
    destino = await crearPreferenciaCompra(compra, `iEureka-Grader · ${t.perfil.bolsa.paquete.replace("{n}", String(creditos))}`.slice(0, 120), await urlBase());
  } catch (e) {
    console.error("[pagos] no se pudo crear la preferencia de Mercado Pago", e);
    redirect("/alumno/creditos?error=pasarela");
  }
  redirect(destino);
}

/** Solo en demostraciones (PAGOS_DEMO=1): aprueba el pago de una compra propia. */
export async function simularCompra(form: FormData) {
  const cuenta = await alumnoActual();
  if (!cuenta || !pagosDemo() || !perfilActivo()) redirect("/alumno");
  const llave = String(form.get("llave") ?? "").trim().toUpperCase();
  modificar((db) => {
    const c = (db.comprasCreditos ?? []).find((x) => x.llave === llave && x.alumnoId === cuenta.id);
    if (c) confirmarCompra(db, llave, { proveedor: "demo", pagoId: `demo-${Date.now()}`, monto: c.precio });
  });
  revalidatePath("/alumno", "layout");
  redirect(`/alumno/creditos/${llave}`);
}
