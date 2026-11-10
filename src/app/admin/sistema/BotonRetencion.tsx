"use client";

import { useState, useTransition } from "react";
import { ejecutarRetencion } from "@/modulos/admin/acciones-sistema";

export function BotonRetencion({ pendientes }: { pendientes: number }) {
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<string>();
  return (
    <div className="mt-3">
      <button type="button" disabled={pendiente || pendientes === 0} onClick={() => iniciar(async () => setMensaje((await ejecutarRetencion()).mensaje))} className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold disabled:opacity-50">
        {pendiente ? "Aplicando…" : "Aplicar retención ahora"}
      </button>
      {mensaje && <p role="status" className="mt-2 text-[15px] text-ok">{mensaje}</p>}
    </div>
  );
}
