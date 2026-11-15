import "server-only";
import { and, count, gte, inArray, max, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";

/* Cada uso de la IA queda en la auditoría con una de estas acciones: así se cuenta el tope del mes. */
export const ACCION_IA = "Pidió descripciones a la IA";
export const ACCION_FICHA = "Pidió la ficha técnica a la IA";

/** Tope mensual (IA_USOS_MES). Vacío, cero o algo que no sea número = 200 (un "IA_USOS_MES=" vacío dejaba el tope en 0). */
export function topeMensualIA() {
  const configurado = Number(process.env.IA_USOS_MES);
  return Number.isInteger(configurado) && configurado > 0 ? configurado : 200;
}

/** Usos de la IA en el mes en curso (hora de Colombia) y el último uso. */
export async function usoIA() {
  const [{ usados, ultimo }] = await db
    .select({ usados: count(), ultimo: max(t.auditoria.creadoEn) })
    .from(t.auditoria)
    .where(
      and(
        inArray(t.auditoria.accion, [ACCION_IA, ACCION_FICHA]),
        gte(t.auditoria.creadoEn, sql`date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota'`),
      ),
    );
  return { usados, tope: topeMensualIA(), ultimo };
}
