import "dotenv/config";
import { parseArgs } from "node:util";
import { pool } from "@/db";
import { aplicarRetencion } from "@/modulos/admin/retencion";

/**
 *   npm run retencion              → borra los documentos vencidos
 *   npm run retencion -- --simular → solo muestra cuántos se borrarían
 */
async function main() {
  const { values } = parseArgs({ options: { simular: { type: "boolean", default: false } } });
  const r = await aplicarRetencion({ simular: values.simular });
  const verbo = values.simular ? "Se borrarían" : "Se borraron";
  console.log(`${verbo} ${r.archivos} archivos de ${r.solicitudes} solicitudes cerradas hace más de ${r.dias} días.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
