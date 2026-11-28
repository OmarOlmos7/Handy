"use client";

// Alta de proyecto dentro de un curso (Proyectos del grupo): el título se escribe en el mismo formulario.
import { AltaProyecto } from "./alta-proyecto";

export function AltaProyectoCurso({ grupoId, idioma }: { grupoId: string; idioma: string }) {
  return <AltaProyecto conTitulo datos={() => ({ grupo: grupoId, titulo: "", idioma })} />;
}
