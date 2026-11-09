import { Suspense } from "react";
import type { Metadata } from "next";
import { FormularioIngreso } from "./FormularioIngreso";

export const metadata: Metadata = { title: "Ingresar | Fersautos" };

export default function Ingresar() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
      <p className="font-display text-2xl font-bold text-azul-texto">Fersautos</p>
      <h1 className="font-display mt-1 text-4xl font-bold">Ingresar al panel</h1>
      <p className="mt-2 text-texto-2">Solo para Natalia y el administrador.</p>
      {/* useSearchParams lee la URL de la petición: va dentro de Suspense */}
      <Suspense>
        <FormularioIngreso />
      </Suspense>
    </main>
  );
}
