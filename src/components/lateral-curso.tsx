// Herramientas del curso en la franja izquierda, para todas las vistas de un curso (va en sus layouts).
import { grupoDe } from "@/lib/almacen";
import { perfilActivo } from "@/lib/banderas";
import { directorioActividades } from "@/lib/copiar";
import { datosProfesor } from "@/lib/sesion";
import { Lateral } from "./franja-lateral";
import { HerramientasCurso } from "./herramientas-curso";

export async function LateralCurso({ grupoId }: { grupoId: string | undefined }) {
  if (!grupoId) return null;
  const { db, profesor } = await datosProfesor();
  const grupo = grupoDe(db, grupoId);
  if (!grupo) return null;
  return (
    <Lateral>
      <HerramientasCurso
        grupoId={grupo.id}
        nombre={`${grupo.materia} · ${grupo.nombre}`}
        proyectos={(db.proyectos ?? []).filter((p) => p.grupoId === grupo.id).length}
        directorio={directorioActividades(db, profesor.id)}
        perfil={perfilActivo()}
      />
    </Lateral>
  );
}
