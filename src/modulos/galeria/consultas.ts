import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";

export type Seccion = "familia" | "clientes";
export const SECCIONES: Record<Seccion, { titulo: string; descripcion: string }> = {
  familia: { titulo: "Familia Suzuki", descripcion: "Familias que estrenaron su Suzuki con Natalia." },
  clientes: { titulo: "Clientes felices", descripcion: "Parejas, amigos y clientes el día de su entrega." },
};

/** Todas las fotos, para administrarlas */
export function fotosParaPanel() {
  return db
    .select({ id: t.fotosGaleria.id, seccion: t.fotosGaleria.seccion, clave: t.fotosGaleria.claveArchivo, pie: t.fotosGaleria.pie, visible: t.fotosGaleria.visible, hayMenores: t.fotosGaleria.hayMenores, creadoEn: t.fotosGaleria.creadoEn, linea: t.modelos.linea })
    .from(t.fotosGaleria)
    .leftJoin(t.modelos, eq(t.modelos.id, t.fotosGaleria.modeloId))
    .orderBy(desc(t.fotosGaleria.creadoEn));
}

/** Solo las visibles, para el catálogo público. Nunca se envía quién autorizó ni la constancia. */
export function fotosPublicas(seccion: Seccion, limite?: number) {
  const consulta = db
    .select({ id: t.fotosGaleria.id, clave: t.fotosGaleria.claveArchivo, pie: t.fotosGaleria.pie })
    .from(t.fotosGaleria)
    .where(and(eq(t.fotosGaleria.seccion, seccion), eq(t.fotosGaleria.visible, true)))
    .orderBy(desc(t.fotosGaleria.creadoEn), asc(t.fotosGaleria.id));
  return limite ? consulta.limit(limite) : consulta;
}
