"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authCliente } from "@/lib/auth-cliente";

export function FormularioIngreso() {
  const router = useRouter();
  const siguiente = useSearchParams().get("siguiente");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function ingresar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const datos = new FormData(e.currentTarget);
    const email = String(datos.get("correo") ?? "").trim();
    const password = String(datos.get("contrasena") ?? "");
    if (!email || !password) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }

    setEnviando(true);
    const { data, error } = await authCliente.signIn.email({ email, password });
    setEnviando(false);

    if (error) {
      setError(
        error.status === 429
          ? "Demasiados intentos. Espera unos minutos antes de volver a intentar."
          : error.status === 403
            ? "Tu cuenta está desactivada. Comunícate con el administrador."
            : "El correo o la contraseña no coinciden.",
      );
      return;
    }

    const rol = (data?.user as { role?: string } | undefined)?.role;
    const inicio = rol === "admin" ? "/admin" : "/panel";
    // Solo se respeta "siguiente" si pertenece a la zona de ese rol
    router.replace(siguiente?.startsWith(inicio) ? siguiente : inicio);
    router.refresh();
  }

  return (
    <form onSubmit={ingresar} noValidate className="mt-8 space-y-4">
      <div>
        <label htmlFor="correo" className="mb-1 block text-sm font-semibold">
          Correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          className="min-h-12 w-full rounded-lg border border-linea-2 bg-superficie px-3"
        />
      </div>
      <div>
        <label htmlFor="contrasena" className="mb-1 block text-sm font-semibold">
          Contraseña
        </label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          className="min-h-12 w-full rounded-lg border border-linea-2 bg-superficie px-3"
        />
      </div>
      <p role="alert" className="min-h-6 text-sm text-senal">
        {error}
      </p>
      <button
        type="submit"
        disabled={enviando}
        className="min-h-12 w-full rounded-lg bg-azul font-semibold text-white hover:bg-azul-hover disabled:opacity-60"
      >
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
