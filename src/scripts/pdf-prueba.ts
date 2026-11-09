import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import * as t from "@/db/esquema";
import { generarDocumento } from "@/modulos/pdf/documentos";
import { desc, eq } from "drizzle-orm";

/**
 * Genera los PDF de una solicitud en la carpeta pdf-pruebas/ (ignorada por Git).
 * Sirve para revisar cómo queda el formato, por ejemplo si hay que recalibrar coordenadas.
 *   npm run pdf:prueba -- --radicado FS-261108-1006
 */
async function main() {
  const { values } = parseArgs({ options: { radicado: { type: "string" } } });
  if (!values.radicado) throw new Error("Uso: npm run pdf:prueba -- --radicado FS-AAMMDD-NNNN");

  const [fila] = await db.select({ id: t.solicitudes.id }).from(t.solicitudes).where(eq(t.solicitudes.radicado, values.radicado));
  if (!fila) {
    const recientes = await db
      .select({ radicado: t.solicitudes.radicado, nombres: t.solicitudes.nombres, valor: t.solicitudes.valorVehiculo })
      .from(t.solicitudes)
      .orderBy(desc(t.solicitudes.creadoEn))
      .limit(8);
    console.log(`\n✖ No existe la solicitud ${values.radicado}. Las más recientes son:\n`);
    for (const r of recientes) {
      console.log(`  ${r.radicado}  ${r.nombres.padEnd(20)} ${r.valor ? "con valor" : "SIN valor del vehículo"}`);
    }
    console.log("");
    return;
  }
  await mkdir("pdf-pruebas", { recursive: true });
  for (const tipo of ["formulario", "cedula"] as const) {
    try {
      const doc = await generarDocumento(fila.id, tipo);
      await writeFile(`pdf-pruebas/${doc.nombre}`, doc.bytes);
      console.log(`✔ pdf-pruebas/${doc.nombre}`);
    } catch (e) {
      console.log(`• ${tipo}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(`✖ ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
