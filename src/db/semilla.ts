import "dotenv/config";
import { db, pool } from "./index";
import { configuracion } from "./esquema";

async function main() {
  await db
    .insert(configuracion)
    .values({
      id: 1,
      asesoraNombre: "Dayerly Natalia Garcia Sierra",
      asesoraCc: "1094044975",
      sede: "Diagonal Santander",
    })
    .onConflictDoNothing();

  console.log("✔ Configuración inicial lista");
}

main()
  .catch((e) => {
    console.error("✖ Error al sembrar datos:", e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
