import { Suspense } from "react";
import type { Metadata } from "next";
import { BotonSalir } from "@/componentes/BotonSalir";
import { BarraNavegacion, Navegacion } from "./Navegacion";

export const metadata: Metadata = { title: "Panel de Natalia | Fersautos", robots: { index: false } };

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* En el celular la barra inferior ya tiene 5 botones: "Cerrar sesión" va arriba */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-linea bg-superficie/95 px-5 py-1.5 backdrop-blur lg:hidden">
        <span className="font-display text-lg font-bold text-azul-texto">Fersautos</span>
        <BotonSalir variante="barra" />
      </header>
      <Suspense fallback={<BarraNavegacion ruta={null} />}>
        <Navegacion />
      </Suspense>
      <main className="mx-auto max-w-4xl px-5 pt-1.5 pb-28 lg:ml-56 lg:px-9 lg:pb-12">{children}</main>
    </>
  );
}
