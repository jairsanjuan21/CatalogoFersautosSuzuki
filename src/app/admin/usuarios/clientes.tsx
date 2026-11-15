"use client";

import { useState, useTransition } from "react";
import { cambiarEstadoCuenta, cerrarSesiones, fijarClave, restablecerClave } from "@/modulos/admin/acciones-usuarios";

export function AccionesAsesora({ userId, activa }: { userId: string; activa: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string }>();
  const [clave, setClave] = useState<string>();
  const [confirmar, setConfirmar] = useState<"desactivar" | "clave" | null>(null);
  const [escribir, setEscribir] = useState(false);
  const [nueva, setNueva] = useState("");

  const ejecutar = (fn: () => Promise<{ ok: boolean; mensaje?: string; clave?: string }>) =>
    iniciar(async () => {
      const r = await fn();
      setMensaje({ ok: r.ok, texto: r.mensaje ?? "" });
      setClave(r.clave);
      setConfirmar(null);
    });
  const boton = "min-h-9 rounded-lg border border-linea-2 bg-superficie px-3 text-sm font-semibold disabled:opacity-50";

  return (
    <div>
      {confirmar ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-senal-fondo p-2.5 text-sm text-senal">
          {confirmar === "desactivar" ? "Natalia no podrá entrar y se cerrarán sus sesiones." : "Su contraseña actual dejará de funcionar."}
          <button type="button" disabled={pendiente} onClick={() => ejecutar(() => (confirmar === "desactivar" ? cambiarEstadoCuenta(userId, false) : restablecerClave(userId)))} className="min-h-9 rounded-lg bg-senal px-3 font-semibold text-white">
            Confirmar
          </button>
          <button type="button" onClick={() => setConfirmar(null)} className={boton}>Cancelar</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pendiente} onClick={() => setEscribir((v) => !v)} aria-expanded={escribir} className={boton}>Cambiar contraseña</button>
          <button type="button" disabled={pendiente} onClick={() => setConfirmar("clave")} className={boton}>Generar una temporal</button>
          <button type="button" disabled={pendiente} onClick={() => ejecutar(() => cerrarSesiones(userId))} className={boton}>Cerrar sus sesiones</button>
          {activa ? (
            <button type="button" disabled={pendiente} onClick={() => setConfirmar("desactivar")} className={`${boton} border-senal text-senal`}>Desactivar</button>
          ) : (
            <button type="button" disabled={pendiente} onClick={() => ejecutar(() => cambiarEstadoCuenta(userId, true))} className={boton}>Activar</button>
          )}
        </div>
      )}
      {escribir && !confirmar && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(async () => {
              const r = await fijarClave(userId, nueva);
              if (r.ok) {
                setNueva("");
                setEscribir(false);
              }
              return r;
            });
          }}
          className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-linea bg-superficie-2 p-3"
        >
          <div className="min-w-0 flex-[1_1_220px]">
            <label htmlFor={`nueva-${userId}`} className="mb-1 block text-sm font-semibold">Nueva contraseña para Natalia (mínimo 10 caracteres)</label>
            <input id={`nueva-${userId}`} type="text" value={nueva} onChange={(e) => setNueva(e.target.value)} minLength={10} maxLength={128} required autoComplete="off" spellCheck={false} className="min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 font-mono text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40" />
          </div>
          <button disabled={pendiente || nueva.length < 10} className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white disabled:opacity-50">Guardar</button>
          <p className="basis-full text-[13px] text-texto-2">Se cerrarán sus sesiones abiertas y su contraseña anterior dejará de funcionar. Dísela por un canal seguro; ella puede cambiarla desde Mi perfil.</p>
        </form>
      )}
      {mensaje?.texto && <p role="status" className={`mt-2 text-sm ${mensaje.ok ? "text-ok" : "text-senal"}`}>{mensaje.texto}</p>}
      {clave && (
        <div className="mt-2 rounded-lg border border-azul bg-cielo p-3">
          <p className="text-sm">Contraseña temporal (se muestra solo esta vez):</p>
          <p className="font-mono text-xl font-bold tracking-wider select-all">{clave}</p>
          <p className="mt-1 text-[13px] text-texto-2">Dísela a Natalia por un canal seguro. Puede cambiarla desde Mi perfil.</p>
        </div>
      )}
    </div>
  );
}
