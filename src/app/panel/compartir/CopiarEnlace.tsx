"use client";

import { useState } from "react";

export function CopiarEnlace({ etiqueta, url }: { etiqueta: string; url: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el navegador no dejó copiar: el enlace queda visible para seleccionarlo a mano */
    }
  }
  return (
    <div>
      <span className="mb-1 block text-sm font-semibold">{etiqueta}</span>
      <div className="flex gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-linea bg-fondo px-3 py-2.5 font-sans text-sm">{url}</code>
        <button type="button" onClick={copiar} className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold">
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
