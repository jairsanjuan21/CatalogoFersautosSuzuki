import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as esquema from "./esquema";

// En desarrollo, Next.js recarga los módulos en cada cambio.
// Guardamos el pool en globalThis para no abrir conexiones nuevas cada vez.
const globalParaDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalParaDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: true, // deja terminar procesos como el build o los scripts
  });

if (process.env.NODE_ENV !== "production") globalParaDb.pool = pool;

export const db = drizzle(pool, { schema: esquema, casing: "snake_case" });
export { pool };
