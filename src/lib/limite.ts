import "server-only";

/**
 * Límite de peticiones en memoria (ventana deslizante).
 * Suficiente para un solo servidor; si algún día hubiera varios, se movería a la BD.
 */
const registros = new Map<string, number[]>();

export function permitir(clave: string, maximo: number, ventanaMs: number) {
  const ahora = Date.now();
  const recientes = (registros.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (recientes.length >= maximo) {
    registros.set(clave, recientes);
    return false;
  }
  recientes.push(ahora);
  registros.set(clave, recientes);
  // limpieza ocasional para que el mapa no crezca sin fin
  if (registros.size > 5_000) {
    for (const [k, v] of registros) if (!v.some((t) => ahora - t < ventanaMs)) registros.delete(k);
  }
  return true;
}

export function ipDeLaPeticion(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "desconocida";
}
