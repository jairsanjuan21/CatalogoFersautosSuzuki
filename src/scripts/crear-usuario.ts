import "dotenv/config";
import { parseArgs } from "node:util";
import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, pool } from "@/db";
import * as t from "@/db/esquema";

/**
 * Crea una cuenta o le asigna una contraseña nueva.
 *
 *   npm run usuario:crear -- --nombre "Natalia García" --correo natalia@correo.com --rol asesora
 *   npm run usuario:crear -- --correo natalia@correo.com --nueva-clave
 *
 * La contraseña se genera al azar y se muestra UNA sola vez.
 */

const AYUDA = `Uso:
  npm run usuario:crear -- --nombre "Nombre" --correo correo@ejemplo.com --rol asesora|admin
  npm run usuario:crear -- --correo correo@ejemplo.com --nueva-clave`;

function generarClave(largo = 16) {
  // Sin caracteres que se confunden al dictarlos (0/O, 1/l/I)
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: largo }, () => abc[randomInt(abc.length)]).join("");
}

async function main() {
  const { values } = parseArgs({
    options: {
      nombre: { type: "string" },
      correo: { type: "string" },
      rol: { type: "string" },
      "nueva-clave": { type: "boolean", default: false },
    },
  });

  const correo = values.correo?.trim().toLowerCase();
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error(`Falta un --correo válido.\n\n${AYUDA}`);

  const ctx = await auth.$context;
  const clave = generarClave();
  const hash = await ctx.password.hash(clave);
  const [existente] = await db.select().from(t.user).where(eq(t.user.email, correo));

  if (values["nueva-clave"]) {
    if (!existente) throw new Error(`No existe una cuenta con el correo ${correo}.`);
    await db
      .update(t.account)
      .set({ password: hash, updatedAt: new Date() })
      .where(and(eq(t.account.userId, existente.id), eq(t.account.providerId, "credential")));
    await db.delete(t.session).where(eq(t.session.userId, existente.id)); // cierra sus sesiones abiertas
    await db.insert(t.auditoria).values({ actor: "admin", accion: "Asignó contraseña nueva por consola", entidad: "user", entidadId: existente.id });
    mostrar(existente.name, correo, existente.role, clave, "Contraseña cambiada");
    return;
  }

  const nombre = values.nombre?.trim();
  const rol = values.rol;
  if (!nombre) throw new Error(`Falta --nombre.\n\n${AYUDA}`);
  if (rol !== "asesora" && rol !== "admin") throw new Error(`--rol debe ser "asesora" o "admin".\n\n${AYUDA}`);
  if (existente) throw new Error(`Ya existe una cuenta con ${correo}. Para cambiar la contraseña usa --nueva-clave.`);

  const usuario = await ctx.internalAdapter.createUser(
    { name: nombre, email: correo, emailVerified: true, role: rol },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({ userId: usuario.id, providerId: "credential", accountId: usuario.id, password: hash });
  await db.insert(t.auditoria).values({ actor: "admin", accion: `Creó la cuenta (${rol}) por consola`, entidad: "user", entidadId: usuario.id });
  mostrar(nombre, correo, rol, clave, "Cuenta creada");
}

function mostrar(nombre: string, correo: string, rol: string, clave: string, titulo: string) {
  console.log(`\n✔ ${titulo}\n`);
  console.log(`  Nombre:     ${nombre}`);
  console.log(`  Correo:     ${correo}`);
  console.log(`  Rol:        ${rol}`);
  console.log(`  Contraseña: ${clave}\n`);
  console.log("  Guárdala ahora: no se vuelve a mostrar y no queda guardada en ningún lado.\n");
}

main()
  .catch((e) => {
    console.error(`\n✖ ${e instanceof Error ? e.message : e}\n`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
