import { randomUUID } from "node:crypto";
import { grupoDe, leer, modificar } from "@/lib/almacen";
import { LARGO_PETICION, TIPOS_EJERCICIO_PRACTICA, cantidadValida, costoGenerar, esTipoAutoactividad, restantesHoy, senalesDeRiesgo, sinDatosPersonales } from "@/lib/autoestudio";
import { sumarCreditos } from "@/lib/configuracion";
import { saldoDe } from "@/lib/cuentas";
import { ErrorIA, iaDisponible } from "@/lib/ia";
import { PeticionInapropiada, generarAutoactividad } from "@/lib/ia-autoestudio";
import { idiomaPublico, textos } from "@/lib/i18n/servidor";
import { alumnoActual } from "@/lib/sesion";
import type { Autoactividad, TipoEjercicio } from "@/lib/tipos";

export const maxDuration = 300;

// El alumno pide a su compañero de estudio una actividad sobre un tema de su curso. Se genera con
// IA (con los créditos del profesor del curso) y queda en su tabla de actividades autoasignadas.
export async function POST(req: Request) {
  const { t } = await textos();
  const te = t.autoestudio.errores;
  const cuenta = await alumnoActual();
  if (!cuenta) return Response.json({ error: te.sinSesion }, { status: 401 });
  let datos: Record<string, unknown> = {};
  try {
    datos = await req.json();
  } catch {
    return Response.json({ error: t.autoestudio.alta.error }, { status: 400 });
  }
  const grupoId = String(datos.grupoId ?? "");
  const curso = cuenta.cursos.find((c) => c.grupo.id === grupoId);
  if (!curso) return Response.json({ error: t.autoestudio.alta.sinCurso }, { status: 400 });
  const tipo = datos.tipo;
  if (!esTipoAutoactividad(tipo)) return Response.json({ error: t.autoestudio.alta.error }, { status: 400 });
  const tema = String(datos.tema ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  if (!tema) return Response.json({ error: t.autoestudio.alta.faltaTema }, { status: 400 });
  const peticionCruda = String(datos.peticion ?? "").trim().slice(0, LARGO_PETICION);
  // Textos agresivos, de tristeza profunda, enojo o violencia: no se responden ni se mandan a la IA.
  if (senalesDeRiesgo(tema) || senalesDeRiesgo(peticionCruda)) return Response.json({ bloqueado: true });
  const tiposEjercicio = (Array.isArray(datos.tiposEjercicio) ? datos.tiposEjercicio : []).filter((x): x is TipoEjercicio =>
    (TIPOS_EJERCICIO_PRACTICA as string[]).includes(String(x)),
  );

  const db = await leer();
  const grupo = grupoDe(db, grupoId);
  if (!grupo?.profesorId) return Response.json({ error: te.sinCreditos }, { status: 402 });
  if (restantesHoy(db.autoactividades ?? [], cuenta.id) <= 0) return Response.json({ error: te.limite }, { status: 429 });
  const costo = costoGenerar(tipo);
  if (saldoDe(db, grupo.profesorId) < costo) return Response.json({ error: te.sinCreditos }, { status: 402 });
  if (!iaDisponible()) return Response.json({ error: te.ia }, { status: 503 });

  const idioma = await idiomaPublico();
  // A la IA nunca van el nombre, la matrícula ni el correo del alumno.
  const privados = { nombre: cuenta.nombre, matricula: curso.alumno.matricula, correo: cuenta.correo };
  try {
    const generada = await generarAutoactividad(
      {
        tipo,
        tema: sinDatosPersonales(tema, privados),
        materia: grupo.materia,
        peticion: sinDatosPersonales(peticionCruda, privados),
        cantidad: tipo === "manuscrita" ? Math.min(5, cantidadValida(datos.cantidad)) : cantidadValida(datos.cantidad),
        tiposEjercicio,
      },
      { profesorId: grupo.profesorId, idioma },
    );
    const nueva: Autoactividad = {
      id: randomUUID().slice(0, 12),
      alumnoId: cuenta.id,
      grupoId,
      matricula: curso.alumno.matricula,
      tipo,
      titulo: generada.titulo.slice(0, 120),
      tema,
      peticion: peticionCruda || undefined,
      idioma,
      creadaEn: new Date().toISOString(),
      ejercicios: generada.ejercicios,
      tarjetas: generada.tarjetas,
      lectura: generada.lectura,
      videos: generada.videos,
      estado: "pendiente",
      creditos: costo,
    };
    modificar((d) => {
      (d.autoactividades ??= []).push(nueva);
      d.movimientos.unshift({
        profesorId: grupo.profesorId,
        fecha: new Date().toISOString().slice(0, 10),
        // Solo el tipo y el tema: el nombre del alumno no hace falta en el historial de créditos.
        concepto: `Autoestudio de alumno · ${t.autoestudio.tipos[tipo]} · ${tema}`,
        cantidad: -sumarCreditos(costo),
      });
    });
    return Response.json({ id: nueva.id });
  } catch (e) {
    if (e instanceof PeticionInapropiada) return Response.json({ bloqueado: true });
    console.error(e);
    return Response.json({ error: e instanceof ErrorIA ? e.message : t.autoestudio.alta.error }, { status: 502 });
  }
}
