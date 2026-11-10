import "server-only";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { almacenamiento } from "@/lib/almacenamiento";

/**
 * RETENCIÓN DE DOCUMENTOS
 * Borra las fotos de cédula y las firmas de las solicitudes cerradas hace más
 * de N días (configurable). La fila del documento se conserva con "eliminado_en"
 * como constancia; lo que desaparece es el archivo.
 *
 * La usan: el botón de Admin → Sistema, el script `npm run retencion` y, en
 * producción, la tarea programada de cada noche.
 */
export async function aplicarRetencion({ simular = false } = {}) {
  const [conf] = await db.select({ dias: t.configuracion.diasRetencionDocumentos }).from(t.configuracion).limit(1);
  const dias = conf?.dias ?? 90;

  const vencidos = await db
    .select({ id: t.documentos.id, clave: t.documentos.claveArchivo, solicitudId: t.documentos.solicitudId })
    .from(t.documentos)
    .innerJoin(t.solicitudes, eq(t.solicitudes.id, t.documentos.solicitudId))
    .where(and(isNull(t.documentos.eliminadoEn), lt(t.solicitudes.cerradaEn, sql`now() - make_interval(days => ${dias})`)));

  const solicitudes = new Set(vencidos.map((d) => d.solicitudId)).size;
  if (simular || vencidos.length === 0) return { dias, archivos: vencidos.length, solicitudes, aplicada: false };

  // Primero el archivo, después la marca: si se cae a la mitad, lo pendiente se retoma la próxima vez
  const borrados: string[] = [];
  for (const d of vencidos) {
    try {
      await almacenamiento.borrar(d.clave);
      borrados.push(d.id);
    } catch (e) {
      console.error("No se pudo borrar", d.clave, e);
    }
  }
  if (borrados.length) {
    await db.update(t.documentos).set({ eliminadoEn: new Date() }).where(inArray(t.documentos.id, borrados));
  }
  await db.insert(t.auditoria).values({
    actor: "sistema",
    accion: `Retención aplicada: ${borrados.length} archivos de ${solicitudes} solicitudes cerradas hace más de ${dias} días`,
    entidad: "documentos",
  });
  return { dias, archivos: borrados.length, solicitudes, aplicada: true };
}
