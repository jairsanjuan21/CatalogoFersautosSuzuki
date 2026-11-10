import { Suspense } from "react";
import { desc, eq, max } from "drizzle-orm";
import { exigirRol } from "@/lib/sesion";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { haceCuanto } from "@/lib/etiquetas";
import { Titulo } from "../componentes";
import { AccionesAsesora } from "./clientes";

export default function Usuarios() {
  return (
    <>
      <Titulo sub="El sistema tiene dos cuentas: la de Natalia y la tuya. Nadie más puede registrarse.">Usuarios</Titulo>
      <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  const yo = await exigirRol("admin");
  const ultimaSesion = db.select({ userId: t.session.userId, ultima: max(t.session.updatedAt).as("ultima") }).from(t.session).groupBy(t.session.userId).as("us");
  const [usuarios, sesiones] = await Promise.all([
    db
      .select({ id: t.user.id, nombre: t.user.name, correo: t.user.email, rol: t.user.role, banned: t.user.banned, creado: t.user.createdAt, ultima: ultimaSesion.ultima })
      .from(t.user)
      .leftJoin(ultimaSesion, eq(ultimaSesion.userId, t.user.id))
      .orderBy(desc(t.user.role)),
    db.select({ userId: t.session.userId }).from(t.session),
  ]);

  return (
    <>
      <div className="mt-5 space-y-3">
        {usuarios.map((u) => {
          const abiertas = sesiones.filter((s) => s.userId === u.id).length;
          return (
            <div key={u.id} className="rounded-xl border border-linea bg-superficie p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <strong className="font-display text-xl">{u.nombre}</strong>
                  <p className="text-[15px] text-texto-2">{u.correo}</p>
                </div>
                <div className="flex gap-1.5 text-[13px] font-semibold">
                  <span className="rounded bg-cielo px-2 py-0.5 text-azul-texto">{u.rol === "admin" ? "Administrador" : "Asesora"}</span>
                  <span className={`rounded px-2 py-0.5 ${u.banned ? "bg-linea text-texto-2" : "bg-ok-fondo text-ok"}`}>{u.banned ? "Desactivada" : "Activa"}</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-texto-2">
                {u.ultima ? `Último uso ${haceCuanto(u.ultima)}` : "Sin sesiones recientes"}, {abiertas} {abiertas === 1 ? "sesión abierta" : "sesiones abiertas"}.
              </p>
              <div className="mt-3">
                {u.id === yo.id ? <p className="text-sm text-texto-2">Esta es tu cuenta.</p> : u.rol === "asesora" ? <AccionesAsesora userId={u.id} activa={!u.banned} /> : null}
              </div>
            </div>
          );
        })}
      </div>
      <h2 className="font-display mt-8 mb-2.5 text-[22px] font-semibold">Seguridad de acceso</h2>
      <ul className="list-disc space-y-1.5 rounded-xl border border-linea bg-superficie py-4 pr-4 pl-8 text-[15px]">
        <li>En producción, el inicio de sesión se bloquea 15 minutos tras 5 intentos fallidos.</li>
        <li>Las sesiones se cierran solas después de 30 días sin uso.</li>
        <li>Las contraseñas se guardan cifradas con scrypt: ni tú ni el sistema pueden leerlas.</li>
        <li>Para crear cuentas: <code className="rounded bg-fondo px-1.5 py-0.5 text-sm">npm run usuario:crear</code> en la consola del servidor.</li>
      </ul>
    </>
  );
}
