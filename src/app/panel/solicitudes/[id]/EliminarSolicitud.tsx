"use client";

import { useState, useTransition } from "react";
import { eliminarSolicitud } from "@/modulos/solicitudes/acciones";

/** Qué se pierde al borrar, según qué tan avanzada esté la solicitud. */
const CONSECUENCIA: Record<string, string> = {
  pendiente_valor: "Se borra con las fotos de la cédula y la firma.",
  lista_para_cargar: "Se borra con las fotos de la cédula y la firma.",
  en_estudio: "Ya la cargaste en Fersautos: si la borras, pierdes la constancia de lo que firmó el cliente.",
  aprobada: "Está aprobada: si la borras, pierdes la constancia de lo que firmó el cliente.",
  negada: "Se borra con sus documentos y su historial.",
  entregada: "Es una venta entregada: si la borras, pierdes la constancia de lo que firmó el cliente y deja de contar en tus ventas y comisiones.",
  desistio: "Se borra con sus documentos y su historial.",
};

export function EliminarSolicitud({ solicitudId, radicado, estado }: { solicitudId: string; radicado: string; estado: string }) {
  const [abierto, setAbierto] = useState(false);
  const [digitos, setDigitos] = useState("");
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const grave = !["pendiente_valor", "lista_para_cargar", "desistio"].includes(estado);

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="min-h-11 rounded-lg border border-senal px-4 font-semibold text-senal">
        Eliminar solicitud
      </button>
    );
  }
  return (
    <div className={`rounded-xl border p-4 ${grave ? "border-senal bg-senal-fondo" : "border-linea bg-superficie"}`}>
      <p className={`text-[15px] ${grave ? "font-semibold text-senal" : ""}`}>{CONSECUENCIA[estado] ?? "Se borra con sus documentos y su historial."} No se puede deshacer.</p>
      <label htmlFor="ultimos4" className="mt-3 mb-1 block text-[15px]">
        Para confirmar, escribe los últimos 4 dígitos del radicado (<b>{radicado}</b>)
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="ultimos4"
          inputMode="numeric"
          maxLength={4}
          autoComplete="off"
          value={digitos}
          onChange={(e) => setDigitos(e.target.value.replace(/\D/g, ""))}
          className="min-h-11 w-28 rounded-lg border border-linea-2 bg-superficie px-3 outline-none focus:border-azul focus:ring-2 focus:ring-azul/40"
        />
        <button
          type="button"
          disabled={pendiente || digitos.length !== 4}
          onClick={() => iniciar(async () => { const r = await eliminarSolicitud(solicitudId, digitos); if (r && !r.ok) setError(r.mensaje); })}
          className="min-h-11 rounded-lg bg-senal px-4 font-semibold text-white disabled:opacity-50"
        >
          {pendiente ? "Eliminando…" : "Eliminar definitivamente"}
        </button>
        <button type="button" onClick={() => { setAbierto(false); setDigitos(""); setError(undefined); }} className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold">
          Cancelar
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-senal">{error}</p>}
    </div>
  );
}
