// Forma de los textos legales (iguales en todos los idiomas).

export interface SeccionLegal {
  /** Ancla de la sección en la página. */
  id: string;
  titulo: string;
  parrafos: string[];
  lista?: string[];
}

export interface DocumentoLegal {
  titulo: string;
  resumen: string;
  secciones: SeccionLegal[];
}

export interface CondicionPais {
  id: string;
  pais: string;
  leyes: string;
  autoridad: string;
  puntos: string[];
}

export interface TextosLegales {
  aviso: DocumentoLegal;
  politica: DocumentoLegal;
  terminos: DocumentoLegal;
  paises: { titulo: string; intro: string; lista: CondicionPais[] };
}
