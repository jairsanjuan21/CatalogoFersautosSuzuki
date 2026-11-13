"use client";

import { useState, useTransition } from "react";
import { guardarVideo } from "@/modulos/admin/acciones-catalogo";
import { idDeYoutube, miniaturaYoutube } from "@/lib/youtube";

export function EditorVideo({ modeloId, videoActual }: { modeloId: string; videoActual: string | null }) {
  const [enlace, setEnlace] = useState(videoActual ? `https://youtu.be/${videoActual}` : "");
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string }>();
  const vistaPrevia = idDeYoutube(enlace); // se reconoce mientras se pega, antes de guardar

  return (
    <div className="rounded-xl border border-linea bg-superficie p-4">
      <label htmlFor="video" className="mb-1 block text-sm font-semibold">Enlace del video en YouTube</label>
      <div className="flex flex-wrap gap-2">
        <input
          id="video"
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          placeholder="https://youtu.be/…"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-linea-2 bg-superficie px-3 outline-none focus:border-azul focus:ring-2 focus:ring-azul/40"
        />
        <button
          type="button"
          disabled={pendiente}
          onClick={() => iniciar(async () => { const r = await guardarVideo(modeloId, enlace); setMensaje({ ok: r.ok, texto: r.mensaje ?? "" }); })}
          className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
        {videoActual && (
          <button type="button" disabled={pendiente} onClick={() => { setEnlace(""); iniciar(async () => { const r = await guardarVideo(modeloId, ""); setMensaje({ ok: r.ok, texto: r.mensaje ?? "" }); }); }} className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold">
            Quitar
          </button>
        )}
      </div>
      <p className="mt-1 text-[13px] text-texto-2">
        Sube el video a YouTube (puede ser “No listado”) y pega aquí el enlace de “Compartir”. Funciona también con Shorts.
      </p>
      {enlace.trim() && !vistaPrevia && <p className="mt-2 text-sm text-ambar">No reconocemos ese enlace como un video de YouTube.</p>}
      {vistaPrevia && (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura externa de YouTube
        <img src={miniaturaYoutube(vistaPrevia)} alt="Vista previa del video" className="mt-3 aspect-video w-full max-w-xs rounded-lg object-cover" />
      )}
      {mensaje?.texto && <p role="status" className={`mt-2 text-sm ${mensaje.ok ? "text-ok" : "text-senal"}`}>{mensaje.texto}</p>}
    </div>
  );
}
