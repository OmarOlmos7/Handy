// Texto con fórmulas en LaTeX entre $…$ (en línea) o $$…$$ (en su propio renglón), dibujadas
// con KaTeX como texto tipográfico: se ve nítido en pantalla, en PDF y al imprimir.
// También admite **negritas** al estilo Markdown fuera de las fórmulas.
import katex from "katex";
import "katex/dist/katex.min.css";
// \ce{…} para fórmulas químicas (H₂O, reacciones).
import "katex/contrib/mhchem";

const PARTES = /(\$\$[^$]+\$\$|\$[^$\n]+\$|\*\*[^*]+\*\*)/g;

function formula(tex: string, bloque: boolean) {
  return katex.renderToString(tex, { displayMode: bloque, throwOnError: false, strict: "ignore", output: "html" });
}

export function TextoMat({ texto, negritas = "font-semibold text-slate-900" }: { texto: string; negritas?: string }) {
  return (
    <>
      {texto.split(PARTES).map((parte, i) => {
        if (parte.startsWith("$$") && parte.endsWith("$$") && parte.length > 4) {
          return <span key={i} className="block" dangerouslySetInnerHTML={{ __html: formula(parte.slice(2, -2), true) }} />;
        }
        if (parte.startsWith("$") && parte.endsWith("$") && parte.length > 2) {
          return <span key={i} dangerouslySetInnerHTML={{ __html: formula(parte.slice(1, -1), false) }} />;
        }
        if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4) {
          return (
            <strong key={i} className={negritas}>
              {parte.slice(2, -2)}
            </strong>
          );
        }
        return parte;
      })}
    </>
  );
}

/** El mismo texto sin marcas de LaTeX, para atributos como title o textos muy cortos. */
export function sinLatex(texto: string) {
  return texto.replace(/\$\$?([^$]+)\$\$?/g, "$1").replace(/\\[a-zA-Z]+/g, "").replace(/[{}]/g, "");
}

/** Copia del texto con las fórmulas tapadas (misma longitud), para buscar incisos fuera de ellas. */
export function taparFormulas(texto: string) {
  return texto.replace(/\$\$[^$]+\$\$|\$[^$\n]+\$/g, (m) => "§".repeat(m.length));
}
