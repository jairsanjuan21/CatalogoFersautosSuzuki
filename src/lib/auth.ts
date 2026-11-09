import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { db } from "@/db";
import * as t from "@/db/esquema";

/** Registra en auditoría sin tumbar el login si algo falla al escribir. */
async function auditar(datos: typeof t.auditoria.$inferInsert) {
  try {
    await db.insert(t.auditoria).values(datos);
  } catch (e) {
    console.error("No se pudo registrar en auditoría", e);
  }
}

const ipDe = (headers?: Headers | null) =>
  headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || headers?.get("x-real-ip") || null;

export const auth = betterAuth({
  appName: "Fersautos · Natalia García",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: t.user, session: t.session, account: t.account, verification: t.verification },
  }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // nadie se registra solo: las dos cuentas se crean por script
    minPasswordLength: 10,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días sin uso y la sesión se cierra
    updateAge: 60 * 60 * 24, // se renueva una vez al día mientras se use
  },

  // Límite de intentos: 5 por cada 15 minutos en el login.
  // Better Auth solo lo activa en producción; en desarrollo no estorba.
  rateLimit: {
    window: 60,
    max: 100,
    customRules: { "/sign-in/email": { window: 15 * 60, max: 5 } },
  },

  plugins: [
    admin({ defaultRole: "asesora", adminRoles: ["admin"] }), // roles y "desactivar cuenta"
    nextCookies(), // debe ir de último: permite fijar cookies desde Server Actions
  ],

  databaseHooks: {
    session: {
      create: {
        after: async (s) => {
          await auditar({
            actor: "sistema",
            usuarioId: s.userId,
            accion: "Inició sesión",
            ip: s.ipAddress || null,
          });
        },
      },
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email" && ctx.context.returned instanceof APIError) {
        await auditar({
          actor: "sistema",
          accion: "Intento de inicio de sesión fallido",
          ip: ipDe(ctx.request?.headers),
          detalle: { correo: String(ctx.body?.email ?? "").toLowerCase() },
        });
      }
    }),
  },
});

export type Rol = "asesora" | "admin";
