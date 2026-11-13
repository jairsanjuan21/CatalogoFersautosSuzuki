/**
 * CÁLCULOS DE LOS TABLEROS: funciones puras (sin base de datos), probadas aparte.
 */

export type EstadoSolicitud = "pendiente_valor" | "lista_para_cargar" | "en_estudio" | "aprobada" | "negada" | "entregada" | "desistio";

/** Lo mínimo de una solicitud que necesita el embudo */
export interface FilaEmbudo {
  estado: EstadoSolicitud;
  conValor: boolean;
}

const LLEGO_A_ESTUDIO: EstadoSolicitud[] = ["en_estudio", "aprobada", "negada", "entregada"];
const APROBADAS: EstadoSolicitud[] = ["aprobada", "entregada"];

export interface PasoEmbudo {
  nombre: string;
  n: number;
  pct: number; // frente al total, 0-100
}

/**
 * Embudo de ventas: cuántas solicitudes llegaron a cada paso.
 * Una solicitud que avanzó cuenta en todos los pasos anteriores (una entregada
 * también "tuvo valor", "llegó a estudio" y "fue aprobada").
 */
export function embudo(filas: FilaEmbudo[]): PasoEmbudo[] {
  const total = filas.length;
  const cuenta = (f: (x: FilaEmbudo) => boolean) => filas.filter(f).length;
  const pasos: [string, number][] = [
    ["Solicitudes recibidas", total],
    ["Con valor asignado", cuenta((x) => x.conValor || LLEGO_A_ESTUDIO.includes(x.estado) || x.estado === "lista_para_cargar")],
    ["Llegaron a estudio", cuenta((x) => LLEGO_A_ESTUDIO.includes(x.estado))],
    ["Aprobadas", cuenta((x) => APROBADAS.includes(x.estado))],
    ["Entregadas", cuenta((x) => x.estado === "entregada")],
  ];
  return pasos.map(([nombre, n]) => ({ nombre, n, pct: total ? Math.round((n / total) * 100) : 0 }));
}

/** El paso donde más clientes se pierden (en proporción), o null si no hay datos. */
export function mayorPerdida(pasos: PasoEmbudo[]): { desde: string; hasta: string } | null {
  let peor: { desde: string; hasta: string; perdida: number } | null = null;
  for (let i = 1; i < pasos.length; i++) {
    const antes = pasos[i - 1].n;
    if (!antes) continue;
    const perdida = (antes - pasos[i].n) / antes;
    if (perdida > 0 && (!peor || perdida > peor.perdida)) peor = { desde: pasos[i - 1].nombre, hasta: pasos[i].nombre, perdida };
  }
  return peor && { desde: peor.desde, hasta: peor.hasta };
}

/** "1 de cada 4" a partir del total y las entregadas (null si aún no hay entregas). */
export function unoDeCada(total: number, entregadas: number): number | null {
  return entregadas > 0 ? Math.max(1, Math.round(total / entregadas)) : null;
}

/** Variación porcentual redondeada; null si no hay base para comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/**
 * Prioridad de una oportunidad abierta (menor = más arriba):
 * aprobada (está a un paso de la comisión) > en estudio quieta > sin valor > por cargar > en estudio al día.
 */
export function prioridad(estado: EstadoSolicitud, diasQuieta: number): number {
  if (estado === "aprobada") return 0;
  if (estado === "en_estudio" && diasQuieta >= 3) return 1;
  if (estado === "pendiente_valor") return 2;
  if (estado === "lista_para_cargar") return 3;
  return 4;
}
