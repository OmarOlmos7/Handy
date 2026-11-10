import Link from "next/link";
import { BotonLink, Logo } from "@/components/ui";

const pasos = [
  {
    titulo: "Aplica la actividad en papel",
    texto: "Imprime la hoja que genera la plataforma, con un código QR y marcas en las esquinas. Tu clase sigue igual, sin pantallas.",
  },
  {
    titulo: "Los alumnos escanean sus hojas",
    texto: "Con la app toman la foto de cada página, las ordenan y se arma un solo PDF. Si no usan celular, tú escaneas al grupo completo.",
  },
  {
    titulo: "Tú subes la solución",
    texto: "Resuelve la actividad a mano y escanéala. La IA propone la rúbrica: respuestas, puntos y los pasos que esperas en cada desarrollo.",
  },
  {
    titulo: "La IA sugiere, tú apruebas",
    texto: "Recibes la calificación sugerida de cada alumno con su hoja corregida. Revisas, ajustas lo que quieras y publicas.",
  },
];

const entregables = [
  ["Hoja corregida", "Palomas verdes, taches rojos y comentarios breves sobre la hoja del alumno."],
  ["Reporte del alumno", "Datos de identificación, puntos positivos, puntos de mejora y calificación por elemento."],
  ["Reporte del grupo", "Promedios, temas fuertes y débiles, reactivos con menor acierto y alumnos por nivel."],
  ["Excel para Canvas", "Nombre, matrícula y calificación, más un CSV listo para importar al libro de calificaciones."],
];

const reactivos = [
  "Verdadero o falso",
  "Opción múltiple",
  "Relación de columnas",
  "Paréntesis",
  "Desarrollos matemáticos",
  "Algoritmos y procedimientos",
  "Ensayos y producciones escritas",
  "Dibujos y bocetos",
];

const paquetes = [
  { nombre: "Prueba", creditos: 50, precio: "Gratis", detalle: "Una actividad corta con tu grupo" },
  { nombre: "Básico", creditos: 300, precio: "$249", detalle: "$0.83 por página" },
  { nombre: "Profesor", creditos: 1500, precio: "$999", detalle: "$0.67 por página", destacado: true },
  { nombre: "Escuela", creditos: 10000, precio: "$5,499", detalle: "$0.55 por página, saldo compartido" },
];

function HojaDemo() {
  return (
    <div className="relative mx-auto w-full max-w-sm rotate-1 rounded-lg bg-papel p-6 shadow-xl ring-1 ring-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">FÍSICA · 3° B</p>
          <p className="text-sm font-semibold text-slate-800">Cinemática: MRU y MRUA</p>
        </div>
        <div className="grid h-10 w-10 grid-cols-4 gap-px bg-white p-0.5 ring-1 ring-slate-300" aria-hidden>
          {[1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1].map((n, i) => (
            <span key={i} className={n ? "bg-slate-800" : "bg-white"} />
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        Nombre: <span className="font-mano text-xl text-slate-700">Sofía Hernández</span>
      </p>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-700">
            1. V o F: velocidad constante ⇒ a = 0 <span className="font-mano text-xl text-slate-600">V</span>
          </span>
          <span className="text-xl font-bold text-acierto">✓</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-700">
            2. Unidad de aceleración <span className="font-mano text-xl text-slate-600">a) m/s</span>
          </span>
          <span className="text-xl font-bold text-error">✗</span>
        </div>
        <p className="font-mano -mt-2 text-lg leading-tight text-error">Es m/s², revisa las unidades</p>
        <div className="rounded border border-dashed border-slate-300 p-2">
          <p className="text-slate-700">5. 150 km en 2 h, calcula v</p>
          <p className="font-mano text-xl leading-snug text-slate-600">v = d / t = 150 / 2</p>
          <p className="font-mano text-xl leading-snug text-slate-600">
            v = 75 <span className="text-error underline decoration-error decoration-wavy">  </span>
          </p>
          <p className="font-mano text-lg leading-tight text-error">Faltan unidades: km/h · 1.5 / 2</p>
        </div>
      </div>
      <div className="absolute -right-4 -top-4 rounded-full bg-tinta-600 px-3 py-1.5 text-sm font-semibold text-white shadow">
        8.4 / 10
      </div>
    </div>
  );
}

export default function Inicio() {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden gap-6 text-sm text-slate-600 md:flex">
            <a href="#como-funciona" className="hover:text-slate-900">Cómo funciona</a>
            <a href="#entregables" className="hover:text-slate-900">Qué recibes</a>
            <a href="#precios" className="hover:text-slate-900">Precios</a>
            <a href="#privacidad" className="hover:text-slate-900">Privacidad</a>
          </nav>
          <div className="flex gap-2">
            <BotonLink href="/ingresar" variante="fantasma">Ingresar</BotonLink>
            <BotonLink href="/registro" className="hidden sm:inline-flex">Probar gratis</BotonLink>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-b from-tinta-50 to-[#f6f7f9]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-medium text-tinta-700 ring-1 ring-tinta-200">
                Para profesores que siguen calificando en papel
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                Califica las actividades impresas en minutos, no en fines de semana.
              </h1>
              <p className="mt-5 text-lg text-slate-600">
                Tus alumnos fotografían su hoja, tú subes tu solución y la IA sugiere la calificación, marca
                aciertos y errores sobre la hoja y arma los reportes. Tú revisas y apruebas antes de que
                llegue al alumno.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <BotonLink href="/registro">Crear cuenta de profesor</BotonLink>
                <BotonLink href="/alumno" variante="secundario">
                  Soy alumno: ver mis reportes
                </BotonLink>
              </div>
              <p className="mt-4 text-sm text-slate-500">50 páginas gratis para probar. Sin tarjeta.</p>
            </div>
            <HojaDemo />
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Cómo funciona</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            La actividad se hace en papel, como siempre. La tecnología entra después, para revisar.
          </p>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {pasos.map((p, i) => (
              <li key={p.titulo} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tinta-600 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{p.titulo}</h3>
                <p className="mt-2 text-sm text-slate-600">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-semibold tracking-tight">Evalúa todo tipo de reactivos</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Los cerrados se califican contra tu clave. En los desarrollos, la IA compara paso a paso con tu
              solución: datos, ecuación, sustitución, desarrollo y resultado con unidades.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {reactivos.map((r) => (
                <li key={r} className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">{r}</li>
              ))}
            </ul>
          </div>
        </section>

        <section id="entregables" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Qué recibes al terminar</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {entregables.map(([t, d]) => (
              <div key={t} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="precios" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-semibold tracking-tight">Paga solo lo que calificas</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              1 crédito = 1 página de alumno evaluada. Subir tu solución y generar la rúbrica no cuesta.
              Precios en pesos mexicanos, IVA incluido.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {paquetes.map((p) => (
                <div
                  key={p.nombre}
                  className={`rounded-xl p-6 ring-1 ${p.destacado ? "bg-tinta-600 text-white ring-tinta-600" : "bg-white ring-slate-200"}`}
                >
                  <h3 className="font-semibold">{p.nombre}</h3>
                  <p className="mt-3 text-3xl font-semibold">{p.precio}</p>
                  <p className={`mt-1 text-sm ${p.destacado ? "text-tinta-100" : "text-slate-500"}`}>
                    {p.creditos.toLocaleString("es-MX")} créditos
                  </p>
                  <p className={`mt-4 text-sm ${p.destacado ? "text-white" : "text-slate-600"}`}>{p.detalle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="privacidad" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Datos de tus alumnos, protegidos</h2>
          <ul className="mt-6 grid gap-4 text-sm text-slate-700 md:grid-cols-3">
            <li className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              Las hojas se guardan en servidores privados y solo se comparten con enlaces que expiran.
            </li>
            <li className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              A la IA no se envían nombres ni matrículas, solo la imagen de las respuestas.
            </li>
            <li className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              Tú decides cuándo borrar las hojas al terminar el ciclo escolar.
            </li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:justify-between">
          <Logo />
          <div className="flex gap-4">
            <Link href="#privacidad">Aviso de privacidad</Link>
            <Link href="#precios">Precios</Link>
            <Link href="/ingresar">Ingresar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
