"use client";

import { useState, useTransition } from "react";
import { quitarFotoAsesora, subirFotoAsesora } from "@/modulos/perfil/acciones";
import { comprimirImagen } from "@/lib/comprimir-imagen";

export function FotoPerfil({ tieneFoto }: { tieneFoto: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string }>();

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    iniciar(async () => {
      try {
        const datos = new FormData();
        datos.set("foto", await comprimirImagen(archivo, 1600), "foto.jpg");
        const r = await subirFotoAsesora(datos);
        setMensaje({ ok: r.ok, texto: r.mensaje ?? "" });
      } catch {
        setMensaje({ ok: false, texto: "No pudimos leer esa imagen. Intenta con otra foto." });
      }
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className={`flex min-h-10 items-center rounded-lg px-3.5 text-sm font-semibold ${pendiente ? "bg-linea text-texto-2" : "cursor-pointer bg-azul text-white focus-within:ring-2 focus-within:ring-azul"}`}>
        <input type="file" accept="image/*" disabled={pendiente} onChange={elegir} className="sr-only" />
        {pendiente ? "Subiendo…" : tieneFoto ? "Cambiar foto" : "Subir foto"}
      </label>
      {tieneFoto && !pendiente && (
        <button type="button" onClick={() => iniciar(async () => { const r = await quitarFotoAsesora(); setMensaje({ ok: r.ok, texto: r.mensaje ?? "" }); })} className="min-h-10 rounded-lg border border-linea-2 bg-superficie px-3.5 text-sm font-semibold">
          Quitar
        </button>
      )}
      {mensaje?.texto && <p role="status" className={`w-full text-sm ${mensaje.ok ? "text-ok" : "text-senal"}`}>{mensaje.texto}</p>}
    </div>
  );
}
