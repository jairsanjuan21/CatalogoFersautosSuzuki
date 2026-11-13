import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonSalir } from "@/componentes/BotonSalir";
import { BarraNavegacion, Navegacion } from "./Navegacion";

export const metadata: Metadata = { title: "Panel de Natalia | Fersautos", robots: { index: false } };

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* En el celular la barra inferior ya tiene 5 botones: Perfil y "Cerrar sesión" van arriba */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-linea bg-superficie/95 px-5 py-1.5 backdrop-blur lg:hidden">
        <span className="font-display text-lg font-bold text-azul-texto">Fersautos</span>
        <span className="flex items-center gap-1">
          <Link href="/panel/perfil" className="flex min-h-9 items-center rounded-lg px-2.5 text-sm font-semibold text-azul-texto">Mi perfil</Link>
          <BotonSalir variante="barra" />
        </span>
      </header>
      <Suspense fallback={<BarraNavegacion ruta={null} />}>
        <Navegacion />
      </Suspense>
      <main className="mx-auto max-w-4xl px-5 pt-1.5 pb-28 lg:ml-56 lg:px-9 lg:pb-12">{children}</main>
    </>
  );
}
