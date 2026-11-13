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

/**
 * "Dayerly Natalia Garcia Sierra" → { visible: "Natalia Garcia", primero: "Natalia" }.
 * Con cuatro palabras (dos nombres y dos apellidos) se usa el segundo nombre,
 * que es como ella se presenta a sus clientes.
 */
export function nombreDeAsesora(completo: string) {
  const p = completo.trim().split(/\s+/);
  const visible = p.length >= 4 ? `${p[1]} ${p[2]}` : p.length === 3 ? `${p[0]} ${p[1]}` : completo;
  return { visible, primero: visible.split(" ")[0] };
}

/** Enlace de WhatsApp con mensaje ya escrito (número colombiano de 10 dígitos). */
export const enlaceWhatsapp = (celular: string, mensaje: string) =>
  `https://wa.me/57${celular}?text=${encodeURIComponent(mensaje)}`;

/** "S-Presso GL" → "s-presso-gl" (para las direcciones del catálogo) */
export const aSlug = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const TRANSMISIONES = { mecanica: "mecánica", automatica: "automática" } as const;

/** { nombre: "GL 1.2", transmision: "mecanica" } → "GL 1.2 mecánica" */
export const nombreVersion = (v: { nombre: string; transmision: "mecanica" | "automatica" | null }) =>
  v.transmision ? `${v.nombre} ${TRANSMISIONES[v.transmision]}` : v.nombre;

/** Nombre de cada tipo de vehículo. Única fuente: antes estaba copiado en cuatro archivos. */
export const TIPO_VEHICULO = {
  hatchback: "Hatchback",
  sedan: "Sedán",
  suv: "SUV",
  todoterreno: "4x4",
  familiar: "Familiar",
} as const;
