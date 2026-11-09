import { Suspense } from "react";
import type { Metadata } from "next";
import { BarraNavegacion, Navegacion } from "./Navegacion";

export const metadata: Metadata = { title: "Panel de Natalia | Fersautos", robots: { index: false } };

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<BarraNavegacion ruta={null} />}>
        <Navegacion />
      </Suspense>
      <main className="mx-auto max-w-4xl px-5 pt-1.5 pb-28 lg:ml-56 lg:px-9 lg:pb-12">{children}</main>
    </>
  );
}
