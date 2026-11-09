/** $ 15.000.000 */
export const plata = (v: number | null | undefined) =>
  v || v === 0 ? "$ " + Math.round(v).toLocaleString("es-CO") : "";

/** Lee un valor anidado: leer(obj, "contacto.celular") */
export function leer(obj: unknown, ruta: string): unknown {
  return ruta.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

/** Devuelve una copia con el valor cambiado (sin mutar el original) */
export function escribir<T>(obj: T, ruta: string, valor: unknown): T {
  const [k, ...resto] = ruta.split(".");
  const actual = (obj && typeof obj === "object" ? obj : {}) as Record<string, unknown>;
  const copia = { ...actual };
  if (resto.length === 0) {
    if (valor === undefined) delete copia[k];
    else copia[k] = valor;
  } else {
    copia[k] = escribir(actual[k], resto.join("."), valor);
  }
  return copia as T;
}
