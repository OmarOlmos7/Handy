import { CAMPO_ACEPTACION, RAZON_SOCIAL, VERSION_LEGAL } from "@/lib/legal/aceptacion";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";

const RUTAS = { terminos: "/terminos", aviso: "/aviso-de-privacidad", politica: "/politica-de-datos" } as const;

/** Frase con {terminos}, {aviso} y {politica} convertidos en enlaces que abren en otra pestaña. */
function FraseConEnlaces({ texto, t }: { texto: string; t: Diccionario["legal"] }) {
  const nombres = { terminos: t.terminos, aviso: t.avisoPrivacidad, politica: t.politicaDatos };
  return (
    <>
      {texto.split(/(\{terminos\}|\{aviso\}|\{politica\})/).map((parte, i) => {
        const clave = parte.slice(1, -1) as keyof typeof RUTAS;
        return parte.startsWith("{") && clave in RUTAS ? (
          <a key={i} href={RUTAS[clave]} target="_blank" rel="noopener" className="font-medium text-tinta-700 underline">
            {nombres[clave]}
          </a>
        ) : (
          <span key={i}>{parte}</span>
        );
      })}
    </>
  );
}

/**
 * Resumen de los avisos y casilla obligatoria para crear una cuenta. La casilla envía la versión
 * vigente de los textos, que el servidor guarda con la fecha en la cuenta.
 */
export function AceptarAvisos({
  t,
  tipo,
  correo,
  marcado,
  alCambiar,
}: {
  t: Diccionario["legal"];
  tipo: "profesor" | "alumno";
  /** Correo de privacidad para ejercer derechos. */
  correo: string;
  /** Modo controlado (formularios que se envían con fetch). */
  marcado?: boolean;
  alCambiar?: (v: boolean) => void;
}) {
  const resumen = tipo === "profesor" ? t.resumenProfesor : t.resumenAlumno;
  const controlado = alCambiar ? { checked: Boolean(marcado), onChange: (e: React.ChangeEvent<HTMLInputElement>) => alCambiar(e.target.checked) } : {};
  return (
    <div className="rounded-lg bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
      <p className="font-medium text-slate-800">{t.resumenTitulo}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-600">
        {resumen.map((x) => (
          <li key={x}>{formato(x, { razon: RAZON_SOCIAL, correo })}</li>
        ))}
      </ul>
      <label className="mt-3 flex items-start gap-2 text-slate-700">
        <input type="checkbox" name={CAMPO_ACEPTACION} value={VERSION_LEGAL} required className="mt-0.5 h-4 w-4 shrink-0 accent-tinta-600" {...controlado} />
        <span>
          <FraseConEnlaces texto={t.acepto} t={t} />
          {tipo === "alumno" && <> {t.aceptoMenor}</>}
        </span>
      </label>
      <p className="mt-2 text-xs text-slate-500">{t.seAbren}</p>
    </div>
  );
}
