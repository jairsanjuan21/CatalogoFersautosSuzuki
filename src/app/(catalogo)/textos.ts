import type { Carroceria } from "@/componentes/Carro";

export const TIPO_TEXTO: Record<Carroceria, string> = {
  hatchback: "Hatchback",
  sedan: "Sedán",
  suv: "SUV",
  todoterreno: "4x4",
  familiar: "Familiar 7 puestos",
};

export const fechaLarga = (d: Date) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long" }).format(d);

export const textoPromocion = (p: { descripcion: string; valorBono: number | null }) =>
  p.valorBono ? `Bono de $ ${p.valorBono.toLocaleString("es-CO")}` : p.descripcion;
