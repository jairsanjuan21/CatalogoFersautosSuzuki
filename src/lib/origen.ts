/**
 * ORIGEN DE LOS CLIENTES
 * Cada red tiene su enlace con ?origen=... Para que la etiqueta no se pierda si la
 * persona pasa por el catálogo o la ficha de un modelo antes de llenar el formulario,
 * el proxy la guarda en una cookie propia del sitio (solo la palabra, ningún dato
 * personal) durante 30 días. Si vuelve por otro enlace, cuenta el más reciente.
 */
export const CAMPANAS = ["instagram", "facebook", "whatsapp", "estados", "qr"] as const;
export type Campana = (typeof CAMPANAS)[number];
export const COOKIE_ORIGEN = "origen";
export const DURACION_ORIGEN = 60 * 60 * 24 * 30; // 30 días

export const esCampana = (v: string | null | undefined): v is Campana => !!v && (CAMPANAS as readonly string[]).includes(v);

/**
 * Prioridad: campaña en la URL (lo más reciente) > campaña recordada en la cookie
 * > otra etiqueta de la URL (p. ej. "catalogo", de los botones del propio sitio) > "directo".
 */
export function resolverOrigen(deLaUrl: string | null, deLaCookie: string | null | undefined): string {
  if (esCampana(deLaUrl)) return deLaUrl;
  if (esCampana(deLaCookie)) return deLaCookie;
  return deLaUrl || "directo";
}
