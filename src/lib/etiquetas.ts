/** Textos para mostrar los valores de la base de datos (se usan en servidor y navegador). */

export const ESTADOS = {
  pendiente_valor: "Pendiente de valor",
  lista_para_cargar: "Lista para cargar",
  en_estudio: "En estudio",
  aprobada: "Aprobada",
  negada: "Negada",
  entregada: "Entregada",
  desistio: "Desistió",
} as const;
export type Estado = keyof typeof ESTADOS;

/** Estados en los que la solicitud se considera cerrada (cuenta la retención de documentos) */
export const ESTADOS_CERRADOS: Estado[] = ["negada", "entregada", "desistio"];

export const ORIGENES = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  estados: "Estados de WhatsApp",
  catalogo: "Catálogo",
  qr: "Código QR",
  directo: "Enlace directo",
} as const;

/** Clases de color de cada estado (tokens de diseño) */
export const COLOR_ESTADO: Record<Estado, string> = {
  pendiente_valor: "bg-senal-fondo text-senal",
  lista_para_cargar: "bg-ambar-fondo text-ambar",
  en_estudio: "bg-cielo text-azul-texto",
  aprobada: "bg-ok-fondo text-ok",
  entregada: "bg-ok-fondo text-ok",
  negada: "bg-linea text-texto-2",
  desistio: "bg-linea text-texto-2",
};

export function haceCuanto(fecha: Date, ahora = new Date()) {
  const horas = Math.floor((ahora.getTime() - fecha.getTime()) / 3_600_000);
  if (horas < 1) return "hace un momento";
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}

export const fechaCorta = (d: Date) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short" }).format(d);
