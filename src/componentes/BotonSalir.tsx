"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authCliente } from "@/lib/auth-cliente";

const ESTILOS = {
  boton: "min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold",
  barra: "min-h-9 rounded-lg px-2.5 text-sm font-semibold text-azul-texto",
  lateral: "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-texto-2 hover:bg-fondo",
  oscuro: "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[15px] whitespace-nowrap hover:bg-[#2c3b54]",
  icono: "grid size-10 place-items-center rounded-[10px] border border-linea bg-superficie text-texto-2",
} as const;

/** Cierra la sesión. "variante" solo cambia el aspecto según dónde se ponga. */
export function BotonSalir({ variante = "boton" }: { variante?: keyof typeof ESTILOS }) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    await authCliente.signOut();
    router.replace("/ingresar");
    router.refresh();
  }

  if (variante === "icono") {
    return (
      <button type="button" onClick={salir} disabled={saliendo} aria-label="Cerrar sesión" title="Cerrar sesión" className={`${ESTILOS.icono} disabled:opacity-60`}>
        <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
          <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h11" />
        </svg>
      </button>
    );
  }
  return (
    <button type="button" onClick={salir} disabled={saliendo} className={`${ESTILOS[variante]} disabled:opacity-60`}>
      {variante !== "barra" && (
        <svg viewBox="0 0 24 24" aria-hidden className={`size-[18px] flex-none fill-none stroke-current stroke-[1.8] [stroke-linecap:round] ${variante === "boton" ? "hidden" : ""}`}>
          <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h11" />
        </svg>
      )}
      {saliendo ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
