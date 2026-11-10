import "server-only";
import { randomInt } from "node:crypto";

/** Contraseña aleatoria sin caracteres que se confundan al dictarla (0/O, 1/l/I). */
export function generarClave(largo = 16) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: largo }, () => abc[randomInt(abc.length)]).join("");
}

/** "1093112233" → "1093•••233" */
export const enmascarar = (doc: string) => (doc.length > 7 ? `${doc.slice(0, 4)}•••${doc.slice(-3)}` : "•••" + doc.slice(-3));
