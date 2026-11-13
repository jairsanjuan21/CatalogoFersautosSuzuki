import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonSalir } from "@/componentes/BotonSalir";
import { SelectorTema } from "@/componentes/SelectorTema";
import { BarraNavegacion, Navegacion } from "./Navegacion";

export const metadata: Metadata = { title: "Panel de Natalia | Fersautos", robots: { index: false } };

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-panel min-h-screen bg-fondo text-texto">
      {/* Celular: la barra inferior ya tiene 5 botones; tema, perfil y salir van arriba */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-linea bg-superficie/95 px-4 py-2 backdrop-blur lg:hidden">
        <span className="text-[17px] font-bold tracking-tight text-azul-texto">Fersautos</span>
        <span className="flex items-center gap-2">
          <SelectorTema />
          <Link href="/panel/perfil" aria-label="Mi perfil" className="grid size-10 place-items-center rounded-full bg-heroe text-[13px] font-bold text-white">
            NG
          </Link>
          <BotonSalir variante="icono" />
        </span>
      </header>
      <Suspense fallback={<BarraNavegacion ruta={null} />}>
        <Navegacion />
      </Suspense>
      <main className="mx-auto max-w-5xl px-4 pt-1.5 pb-28 sm:px-5 lg:ml-60 lg:px-9 lg:pb-12">{children}</main>
    </div>
  );
}
