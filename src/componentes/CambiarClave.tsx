"use client";

import { useState } from "react";
import { cambiarMiClave } from "@/modulos/cuenta/acciones";
import { LARGO_MIN_CLAVE } from "@/lib/clave-minima";
import { useFormularioAccion } from "@/lib/usar-formulario";
import type { ResultadoAdmin } from "@/modulos/admin/acciones-catalogo";

const claseInput =
  "min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 aria-invalid:border-senal";

/** Cambio de contraseña propio. Lo usan el panel de Natalia y el del administrador. */
export function CambiarClave() {
  const { ref, alEnviar, estado, pendiente } = useFormularioAccion(cambiarMiClave, { ok: true } as ResultadoAdmin);
  const [ver, setVer] = useState(false);
  const campo = (name: string, etiqueta: string, auto: string) => (
    <div>
      <label htmlFor={`clave-${name}`} className="mb-1 block text-sm font-semibold">{etiqueta}</label>
      <input
        id={`clave-${name}`}
        name={name}
        type={ver ? "text" : "password"}
        autoComplete={auto}
        minLength={name === "nueva" ? LARGO_MIN_CLAVE : undefined}
        required
        aria-invalid={!!estado.errores?.[name]}
        className={claseInput}
      />
      {estado.errores?.[name] && <p className="mt-1 text-[13px] text-senal">{estado.errores[name]}</p>}
    </div>
  );
  return (
    <form ref={ref} onSubmit={alEnviar} className="space-y-3 rounded-xl border border-linea bg-superficie p-4">
      {campo("actual", "Contraseña actual", "current-password")}
      {campo("nueva", `Contraseña nueva (mínimo ${LARGO_MIN_CLAVE} caracteres)`, "new-password")}
      {campo("repetir", "Repite la contraseña nueva", "new-password")}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} className="size-4" />
        Mostrar las contraseñas
      </label>
      <button disabled={pendiente} className="min-h-11 rounded-lg bg-azul px-5 font-semibold text-white hover:bg-azul-hover disabled:opacity-60">
        {pendiente ? "Cambiando…" : "Cambiar contraseña"}
      </button>
      {estado.mensaje && <p role="status" className={`text-sm ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
    </form>
  );
}
