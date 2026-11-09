"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authCliente } from "@/lib/auth-cliente";

export function BotonSalir() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    await authCliente.signOut();
    router.replace("/ingresar");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={salir}
      disabled={saliendo}
      className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold disabled:opacity-60"
    >
      {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
  );
}
