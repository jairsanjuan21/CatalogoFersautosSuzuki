import { Suspense } from "react";
import type { Metadata } from "next";
import { BarraAdmin, NavegacionAdmin } from "./Navegacion";

export const metadata: Metadata = { title: "Administración | Fersautos", robots: { index: false } };

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-panel min-h-screen bg-fondo text-texto">
      <Suspense fallback={<BarraAdmin ruta={null} />}>
        <NavegacionAdmin />
      </Suspense>
      <main className="mx-auto max-w-6xl px-5 pt-2 pb-16 lg:ml-62 lg:px-10">{children}</main>
    </div>
  );
}
