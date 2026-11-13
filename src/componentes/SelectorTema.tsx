"use client";

import { useEffect, useState } from "react";
import { CLAVE_TEMA, type Tema } from "@/lib/tema";

const ICONOS: Record<Tema, string> = {
  claro: "M12 4V2M12 22v-2M4.9 4.9L3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M12 7a5 5 0 100 10 5 5 0 000-10z",
  oscuro: "M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z",
  sistema: "M3 5h18v11H3zM8 20h8M12 16v4",
};
const NOMBRES: Record<Tema, string> = { claro: "Claro", oscuro: "Oscuro", sistema: "Sistema" };
const AYUDA: Record<Tema, string> = { claro: "Tema claro", oscuro: "Tema oscuro", sistema: "Igual que el dispositivo" };

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  raiz.classList.add("tema-suave"); // transición de colores solo mientras se cambia
  if (tema === "sistema") delete raiz.dataset.tema;
  else raiz.dataset.tema = tema;
  try {
    if (tema === "sistema") localStorage.removeItem(CLAVE_TEMA);
    else localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    /* navegación privada sin almacenamiento: el tema dura hasta recargar */
  }
  window.setTimeout(() => raiz.classList.remove("tema-suave"), 400);
}

/**
 * Selector de tema.
 *  "iconos":  solo íconos (cabecera del celular)
 *  "texto":   íconos con nombre (encabezados anchos)
 *  "lateral": la palabra "Tema" y los íconos, ocupando todo el ancho (menús laterales angostos)
 */
export function SelectorTema({ variante = "iconos" }: { variante?: "iconos" | "texto" | "lateral" }) {
  // En el servidor no se sabe el tema guardado: se muestra "sistema" y se corrige al montar
  const [tema, setTema] = useState<Tema>("sistema");
  useEffect(() => {
    const t = document.documentElement.dataset.tema;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el valor que puso el script del layout
    if (t === "claro" || t === "oscuro") setTema(t);
  }, []);

  const conTexto = variante === "texto";
  const grupo = (
    <div role="group" aria-label="Apariencia" className="flex rounded-xl border border-linea bg-superficie p-0.5">
      {(Object.keys(ICONOS) as Tema[]).map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={tema === t}
          aria-label={conTexto ? undefined : AYUDA[t]}
          title={AYUDA[t]}
          onClick={() => { setTema(t); aplicar(t); }}
          className={`flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold text-texto-2 aria-pressed:bg-azul aria-pressed:text-white ${conTexto ? "min-h-10 px-3" : "h-10 w-9"}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
            <path d={ICONOS[t]} />
          </svg>
          {conTexto && NOMBRES[t]}
        </button>
      ))}
    </div>
  );
  if (variante !== "lateral") return grupo;
  return (
    <div className="flex items-center justify-between gap-2 px-3">
      <span className="text-sm font-medium text-texto-2">Tema</span>
      {grupo}
    </div>
  );
}
