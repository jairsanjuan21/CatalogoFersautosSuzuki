import type { Carroceria } from "@/componentes/Carro";
import { TIPO_VEHICULO } from "@/lib/formato";

export const TIPO_TEXTO: Record<Carroceria, string> = TIPO_VEHICULO;

export const fechaLarga = (d: Date) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long" }).format(d);

export const textoPromocion = (p: { descripcion: string; valorBono: number | null }) =>
  p.valorBono ? `Bono de $ ${p.valorBono.toLocaleString("es-CO")}` : p.descripcion;
