"use client";

import { useState, useTransition } from "react";
import { cambiarEstadoCuenta, cerrarSesiones, restablecerClave } from "@/modulos/admin/acciones-usuarios";

export function AccionesAsesora({ userId, activa }: { userId: string; activa: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string }>();
  const [clave, setClave] = useState<string>();
  const [confirmar, setConfirmar] = useState<"desactivar" | "clave" | null>(null);

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
          <button type="button" disabled={pendiente} onClick={() => setConfirmar("clave")} className={boton}>Contraseña temporal</button>
          <button type="button" disabled={pendiente} onClick={() => ejecutar(() => cerrarSesiones(userId))} className={boton}>Cerrar sus sesiones</button>
          {activa ? (
            <button type="button" disabled={pendiente} onClick={() => setConfirmar("desactivar")} className={`${boton} border-senal text-senal`}>Desactivar</button>
          ) : (
            <button type="button" disabled={pendiente} onClick={() => ejecutar(() => cambiarEstadoCuenta(userId, true))} className={boton}>Activar</button>
          )}
        </div>
      )}
      {mensaje?.texto && <p role="status" className={`mt-2 text-sm ${mensaje.ok ? "text-ok" : "text-senal"}`}>{mensaje.texto}</p>}
      {clave && (
        <div className="mt-2 rounded-lg border border-azul bg-cielo p-3">
          <p className="text-sm">Contraseña temporal (se muestra solo esta vez):</p>
          <p className="font-mono text-xl font-bold tracking-wider select-all">{clave}</p>
          <p className="mt-1 text-[13px] text-texto-2">Dísela a Natalia por un canal seguro. Puede seguir usándola o pedirte otra.</p>
        </div>
      )}
    </div>
  );
}
