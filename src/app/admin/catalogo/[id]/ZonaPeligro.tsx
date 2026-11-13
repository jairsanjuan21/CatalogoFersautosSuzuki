"use client";

import { useState, useTransition } from "react";
import { archivarModelo, eliminarModelo } from "@/modulos/admin/acciones-catalogo";

const claseInput = "min-h-11 w-full max-w-xs rounded-lg border border-linea-2 bg-superficie px-3 outline-none focus:border-azul focus:ring-2 focus:ring-azul/40";

export function ZonaPeligro({ modeloId, linea, archivado, solicitudes }: { modeloId: string; linea: string; archivado: boolean; solicitudes: number }) {
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string }>();
  const [eliminando, setEliminando] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const ejecutar = (fn: () => Promise<{ ok: boolean; mensaje?: string } | void>) =>
    iniciar(async () => {
      const r = await fn();
      if (r) setMensaje({ ok: r.ok, texto: r.mensaje ?? "" });
    });

  return (
    <div className="rounded-xl border border-senal/40 bg-superficie p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-prose">
          <strong>{archivado ? "Modelo archivado" : "Archivar"}</strong>
          <p className="text-[15px] text-texto-2">
            {archivado
              ? "No aparece en el catálogo ni en precios. Las solicitudes que lo usan lo conservan."
              : "Para modelos que ya no se venden: salen del catálogo y de precios, pero las solicitudes que los usaron los conservan."}
          </p>
        </div>
        <button type="button" disabled={pendiente} onClick={() => ejecutar(() => archivarModelo(modeloId, !archivado))} className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold disabled:opacity-60">
          {archivado ? "Sacar del archivo" : "Archivar"}
        </button>
      </div>

      <div className="mt-4 border-t border-linea pt-4">
        <strong className="text-senal">Eliminar</strong>
        {solicitudes > 0 ? (
          <p className="text-[15px] text-texto-2">
            No se puede eliminar: {solicitudes} {solicitudes === 1 ? "solicitud lo usa" : "solicitudes lo usan"}, y quedarían sin vehículo. Archívalo.
          </p>
        ) : !eliminando ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-texto-2">Borra el modelo con sus fotos, versiones, precios y promociones. No se puede deshacer.</p>
            <button type="button" onClick={() => setEliminando(true)} className="min-h-11 rounded-lg border border-senal px-4 font-semibold text-senal">
              Eliminar modelo
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <label htmlFor="confirmar-eliminar" className="mb-1 block text-[15px]">
              Para confirmar, escribe <b>{linea}</b>
            </label>
            <div className="flex flex-wrap gap-2">
              <input id="confirmar-eliminar" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="off" className={claseInput} />
              <button
                type="button"
                disabled={pendiente || confirmacion.trim().toLowerCase() !== linea.toLowerCase()}
                onClick={() => ejecutar(() => eliminarModelo(modeloId, confirmacion))}
                className="min-h-11 rounded-lg bg-senal px-4 font-semibold text-white disabled:opacity-50"
              >
                {pendiente ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
              <button type="button" onClick={() => { setEliminando(false); setConfirmacion(""); }} className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
      {mensaje?.texto && <p role="status" className={`mt-3 text-[15px] ${mensaje.ok ? "text-ok" : "text-senal"}`}>{mensaje.texto}</p>}
    </div>
  );
}
