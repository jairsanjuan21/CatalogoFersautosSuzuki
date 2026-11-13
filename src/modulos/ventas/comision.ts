/**
 * COMISIÓN DE NATALIA
 * Gana X pesos por cada millón del valor del vehículo (por defecto 5.000, es decir 0,5 %).
 * Dos formas de contar, configurables desde Admin → Configuración:
 *   proporcional        $ 78.990.000 → 78,99 millones × 5.000 = $ 394.950
 *   millones_completos  $ 78.990.000 → 78 millones    × 5.000 = $ 390.000
 * Es un cálculo APROXIMADO: lo que Fersautos pague puede variar por descuentos o ajustes.
 */
export type MetodoComision = "proporcional" | "millones_completos";

export function calcularComision(valor: number, porMillon: number, metodo: MetodoComision): number {
  if (!Number.isFinite(valor) || valor <= 0 || porMillon <= 0) return 0;
  if (metodo === "millones_completos") return Math.floor(valor / 1_000_000) * porMillon;
  // Se redondea al peso: con enteros (bigint en la BD) nunca hay centavos
  return Math.round((valor * porMillon) / 1_000_000);
}

/** "0,5 %" a partir de 5.000 por millón */
export const porcentaje = (porMillon: number) => `${(porMillon / 10_000).toLocaleString("es-CO", { maximumFractionDigits: 3 })} %`;
