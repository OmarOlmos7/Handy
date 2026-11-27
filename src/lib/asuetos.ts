// Días de asueto oficiales (descanso obligatorio nacional) por país. Se calculan con reglas fijas
// (fecha fija, n-ésimo día de la semana del mes, días a partir de la Pascua), sin servicios externos.
// Solo los nacionales: los estatales o escolares los marca el profesor en su agenda.

export interface Asueto {
  fecha: string;
  nombre: string;
}

/** Países con asuetos conocidos. Para cualquier otro (o sin país) se usa México. */
export const PAISES_ASUETOS = ["MX", "US", "CA", "ES", "CO", "PE", "BR", "FR", "DE", "PT"] as const;
export type PaisAsuetos = (typeof PAISES_ASUETOS)[number];
export const PAIS_POR_OMISION: PaisAsuetos = "MX";

export function paisDeAsuetos(pais: string | undefined): PaisAsuetos {
  const p = pais?.toUpperCase();
  return (PAISES_ASUETOS as readonly string[]).includes(p ?? "") ? (p as PaisAsuetos) : PAIS_POR_OMISION;
}

const f = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function sumar(fecha: string, dias: number) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** n-ésimo día de la semana (0 = domingo … 6 = sábado) del mes; n = -1 es el último. */
function enesimo(a: number, m: number, dia: number, n: number) {
  if (n > 0) {
    const primero = new Date(Date.UTC(a, m - 1, 1)).getUTCDay();
    return f(a, m, 1 + ((dia - primero + 7) % 7) + (n - 1) * 7);
  }
  const ultimoDia = new Date(Date.UTC(a, m, 0));
  return f(a, m, ultimoDia.getUTCDate() - ((ultimoDia.getUTCDay() - dia + 7) % 7));
}

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
export function pascua(a: number) {
  const b = a % 19;
  const c = Math.floor(a / 100);
  const d = a % 100;
  const e = Math.floor(c / 4);
  const g = c % 4;
  const h = Math.floor((c + 8) / 25);
  const i = Math.floor((c - h + 1) / 3);
  const k = (19 * b + c - e - i + 15) % 30;
  const l = Math.floor(d / 4);
  const m = d % 4;
  const n = (32 + 2 * g + 2 * l - k - m) % 7;
  const o = Math.floor((b + 11 * k + 22 * n) / 451);
  const mes = Math.floor((k + n - 7 * o + 114) / 31);
  const dia = ((k + n - 7 * o + 114) % 31) + 1;
  return f(a, mes, dia);
}

/** Pasa la fecha al lunes siguiente si no cae en lunes (Ley Emiliani de Colombia). */
function aLunes(fecha: string) {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return dia === 1 ? fecha : sumar(fecha, (8 - dia) % 7);
}

function reglas(pais: PaisAsuetos, a: number): [string, string][] {
  const p = pascua(a);
  switch (pais) {
    case "MX":
      return [
        [f(a, 1, 1), "Año Nuevo"],
        [enesimo(a, 2, 1, 1), "Día de la Constitución"],
        [enesimo(a, 3, 1, 3), "Natalicio de Benito Juárez"],
        [f(a, 5, 1), "Día del Trabajo"],
        [f(a, 9, 16), "Día de la Independencia"],
        ...((a - 2024) % 6 === 0 ? ([[f(a, 10, 1), "Transmisión del Poder Ejecutivo"]] as [string, string][]) : []),
        [enesimo(a, 11, 1, 3), "Día de la Revolución"],
        [f(a, 12, 25), "Navidad"],
      ];
    case "US":
      return [
        [f(a, 1, 1), "New Year's Day"],
        [enesimo(a, 1, 1, 3), "Martin Luther King Jr. Day"],
        [enesimo(a, 2, 1, 3), "Presidents' Day"],
        [enesimo(a, 5, 1, -1), "Memorial Day"],
        [f(a, 6, 19), "Juneteenth"],
        [f(a, 7, 4), "Independence Day"],
        [enesimo(a, 9, 1, 1), "Labor Day"],
        [enesimo(a, 10, 1, 2), "Columbus Day"],
        [f(a, 11, 11), "Veterans Day"],
        [enesimo(a, 11, 4, 4), "Thanksgiving"],
        [f(a, 12, 25), "Christmas Day"],
      ];
    case "CA":
      return [
        [f(a, 1, 1), "New Year's Day"],
        [sumar(p, -2), "Good Friday"],
        [sumar(f(a, 5, 24), -((new Date(`${f(a, 5, 24)}T00:00:00Z`).getUTCDay() + 6) % 7)), "Victoria Day"],
        [f(a, 7, 1), "Canada Day"],
        [enesimo(a, 9, 1, 1), "Labour Day"],
        [f(a, 9, 30), "National Day for Truth and Reconciliation"],
        [enesimo(a, 10, 1, 2), "Thanksgiving"],
        [f(a, 11, 11), "Remembrance Day"],
        [f(a, 12, 25), "Christmas Day"],
        [f(a, 12, 26), "Boxing Day"],
      ];
    case "ES":
      return [
        [f(a, 1, 1), "Año Nuevo"],
        [f(a, 1, 6), "Epifanía del Señor"],
        [sumar(p, -2), "Viernes Santo"],
        [f(a, 5, 1), "Fiesta del Trabajo"],
        [f(a, 8, 15), "Asunción de la Virgen"],
        [f(a, 10, 12), "Fiesta Nacional de España"],
        [f(a, 11, 1), "Todos los Santos"],
        [f(a, 12, 6), "Día de la Constitución"],
        [f(a, 12, 8), "Inmaculada Concepción"],
        [f(a, 12, 25), "Navidad"],
      ];
    case "CO":
      return [
        [f(a, 1, 1), "Año Nuevo"],
        [aLunes(f(a, 1, 6)), "Día de los Reyes Magos"],
        [aLunes(f(a, 3, 19)), "Día de San José"],
        [sumar(p, -3), "Jueves Santo"],
        [sumar(p, -2), "Viernes Santo"],
        [f(a, 5, 1), "Día del Trabajo"],
        [sumar(p, 43), "Ascensión del Señor"],
        [sumar(p, 64), "Corpus Christi"],
        [sumar(p, 71), "Sagrado Corazón"],
        [aLunes(f(a, 6, 29)), "San Pedro y San Pablo"],
        [f(a, 7, 20), "Día de la Independencia"],
        [f(a, 8, 7), "Batalla de Boyacá"],
        [aLunes(f(a, 8, 15)), "Asunción de la Virgen"],
        [aLunes(f(a, 10, 12)), "Día de la Raza"],
        [aLunes(f(a, 11, 1)), "Todos los Santos"],
        [aLunes(f(a, 11, 11)), "Independencia de Cartagena"],
        [f(a, 12, 8), "Inmaculada Concepción"],
        [f(a, 12, 25), "Navidad"],
      ];
    case "PE":
      return [
        [f(a, 1, 1), "Año Nuevo"],
        [sumar(p, -3), "Jueves Santo"],
        [sumar(p, -2), "Viernes Santo"],
        [f(a, 5, 1), "Día del Trabajo"],
        [f(a, 6, 7), "Batalla de Arica y Día de la Bandera"],
        [f(a, 6, 29), "San Pedro y San Pablo"],
        [f(a, 7, 23), "Día de la Fuerza Aérea"],
        [f(a, 7, 28), "Fiestas Patrias"],
        [f(a, 7, 29), "Fiestas Patrias"],
        [f(a, 8, 6), "Batalla de Junín"],
        [f(a, 8, 30), "Santa Rosa de Lima"],
        [f(a, 10, 8), "Combate de Angamos"],
        [f(a, 11, 1), "Todos los Santos"],
        [f(a, 12, 8), "Inmaculada Concepción"],
        [f(a, 12, 9), "Batalla de Ayacucho"],
        [f(a, 12, 25), "Navidad"],
      ];
    case "BR":
      return [
        [f(a, 1, 1), "Confraternização Universal"],
        [sumar(p, -2), "Sexta-feira Santa"],
        [f(a, 4, 21), "Tiradentes"],
        [f(a, 5, 1), "Dia do Trabalho"],
        [f(a, 9, 7), "Independência do Brasil"],
        [f(a, 10, 12), "Nossa Senhora Aparecida"],
        [f(a, 11, 2), "Finados"],
        [f(a, 11, 15), "Proclamação da República"],
        [f(a, 11, 20), "Dia da Consciência Negra"],
        [f(a, 12, 25), "Natal"],
      ];
    case "FR":
      return [
        [f(a, 1, 1), "Jour de l’an"],
        [sumar(p, 1), "Lundi de Pâques"],
        [f(a, 5, 1), "Fête du Travail"],
        [f(a, 5, 8), "Victoire 1945"],
        [sumar(p, 39), "Ascension"],
        [sumar(p, 50), "Lundi de Pentecôte"],
        [f(a, 7, 14), "Fête nationale"],
        [f(a, 8, 15), "Assomption"],
        [f(a, 11, 1), "Toussaint"],
        [f(a, 11, 11), "Armistice 1918"],
        [f(a, 12, 25), "Noël"],
      ];
    case "DE":
      return [
        [f(a, 1, 1), "Neujahr"],
        [sumar(p, -2), "Karfreitag"],
        [sumar(p, 1), "Ostermontag"],
        [f(a, 5, 1), "Tag der Arbeit"],
        [sumar(p, 39), "Christi Himmelfahrt"],
        [sumar(p, 50), "Pfingstmontag"],
        [f(a, 10, 3), "Tag der Deutschen Einheit"],
        [f(a, 12, 25), "1. Weihnachtstag"],
        [f(a, 12, 26), "2. Weihnachtstag"],
      ];
    case "PT":
      return [
        [f(a, 1, 1), "Ano Novo"],
        [sumar(p, -2), "Sexta-feira Santa"],
        [f(a, 4, 25), "Dia da Liberdade"],
        [f(a, 5, 1), "Dia do Trabalhador"],
        [sumar(p, 60), "Corpo de Deus"],
        [f(a, 6, 10), "Dia de Portugal"],
        [f(a, 8, 15), "Assunção de Nossa Senhora"],
        [f(a, 10, 5), "Implantação da República"],
        [f(a, 11, 1), "Dia de Todos os Santos"],
        [f(a, 12, 1), "Restauração da Independência"],
        [f(a, 12, 8), "Imaculada Conceição"],
        [f(a, 12, 25), "Natal"],
      ];
  }
}

/** Asuetos del año, ordenados por fecha. */
export function asuetosDelAnio(pais: string | undefined, anio: number): Asueto[] {
  return reglas(paisDeAsuetos(pais), anio)
    .map(([fecha, nombre]) => ({ fecha, nombre }))
    .sort((x, y) => x.fecha.localeCompare(y.fecha));
}

/** Nombre del asueto de esa fecha, o undefined. */
export function asuetoEn(pais: string | undefined, fecha: string): string | undefined {
  return asuetosDelAnio(pais, Number(fecha.slice(0, 4))).find((a) => a.fecha === fecha)?.nombre;
}
