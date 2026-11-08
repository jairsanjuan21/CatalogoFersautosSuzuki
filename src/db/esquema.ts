import { pgTable, smallint, text, integer, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Configuración general del sistema: una sola fila (id = 1).
 * Son los datos fijos que se estampan en cada formulario F-NS-01
 * y las reglas que se editan desde el panel de administrador.
 * El resto de tablas llega con el diagrama entidad-relación.
 */
export const configuracion = pgTable(
  "configuracion",
  {
    id: smallint().primaryKey().default(1),
    asesoraNombre: text().notNull(),
    asesoraCc: text().notNull(),
    asesoraWhatsapp: text(),
    ciudad: text().notNull().default("Cúcuta"),
    sede: text().notNull(),
    marcaPorDefecto: text().notNull().default("Suzuki"),
    planFinanciacion: text().notNull().default("Tradicional"),
    plazosMeses: integer().array().notNull().default(sql`'{12,24,36,48,60,72,84}'`),
    diasVigenciaPrecio: smallint().notNull().default(7),
    diasRetencionDocumentos: smallint().notNull().default(90),
    actualizadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("configuracion_fila_unica", sql`${t.id} = 1`)],
);
