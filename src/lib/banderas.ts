// Banderas de funcionalidad: lo nuevo se prende con la variable BANDERAS (lista separada por
// comas), por ejemplo BANDERAS=perfil_cognitivo. Sin la variable, todo lo nuevo queda apagado y la
// aplicación se comporta igual que antes.

export type Bandera = "perfil_cognitivo";

/** Banderas encendidas en la lista dada (por omisión, la variable BANDERAS). */
export function banderasActivas(valor = process.env.BANDERAS ?? ""): Set<string> {
  return new Set(
    valor
      .split(",")
      .map((b) => b.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** true si la bandera está encendida. */
export function banderaActiva(bandera: Bandera, valor?: string): boolean {
  return banderasActivas(valor).has(bandera);
}

/** Atajo para el módulo de perfil de aprendizaje y desempeño (Modelo CREAR). */
export function perfilActivo(valor?: string): boolean {
  return banderaActiva("perfil_cognitivo", valor);
}
