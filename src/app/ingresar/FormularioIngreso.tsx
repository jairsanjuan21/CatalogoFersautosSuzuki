"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authCliente } from "@/lib/auth-cliente";

type Aviso = { tipo: "error" | "bloqueo" | "ok"; texto: string } | null;

const ICONOS = {
  error: "M12 8v5M12 16h.01M12 3a9 9 0 100 18 9 9 0 000-18z",
  bloqueo: "M7 11V8a5 5 0 0110 0v3M5 11h14v10H5zM12 15v2",
  ok: "M12 3a9 9 0 100 18 9 9 0 000-18zM8 12.5l2.7 2.7L16 9.8",
};
const COLORES = {
  error: "bg-senal-fondo text-senal",
  bloqueo: "bg-ambar-fondo text-ambar",
  ok: "bg-ok-fondo text-ok",
};

const entrada =
  "min-h-12 w-full rounded-xl border border-linea bg-superficie px-3.5 text-base text-texto outline-none transition " +
  "placeholder:text-texto-3 focus:border-azul focus:ring-4 focus:ring-cielo " +
  "aria-invalid:border-senal aria-invalid:focus:ring-senal-fondo disabled:cursor-not-allowed disabled:opacity-60";

export function FormularioIngreso() {
  const router = useRouter();
  const siguiente = useSearchParams().get("siguiente");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [ver, setVer] = useState(false);
  const [tiembla, setTiembla] = useState(false);

  function fallar(siguienteAviso: NonNullable<Aviso>) {
    setAviso(siguienteAviso);
    // Se quita la clase y se vuelve a poner para que la sacudida se repita en cada error
    setTiembla(false);
    requestAnimationFrame(() => setTiembla(true));
  }

  async function ingresar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando || listo) return;
    setAviso(null);
    const datos = new FormData(e.currentTarget);
    const email = String(datos.get("correo") ?? "").trim();
    const password = String(datos.get("contrasena") ?? "");
    if (!email || !password) {
      fallar({ tipo: "error", texto: "Escribe tu correo y tu contraseña." });
      return;
    }

    setEnviando(true);
    const { data, error } = await authCliente.signIn.email({ email, password });
    setEnviando(false);

    if (error) {
      fallar(
        error.status === 429
          ? { tipo: "bloqueo", texto: "Demasiados intentos. Por seguridad, espera 15 minutos antes de volver a intentar." }
          : error.status === 403
            ? { tipo: "bloqueo", texto: "Tu cuenta está desactivada. Comunícate con el administrador." }
            : { tipo: "error", texto: "El correo o la contraseña no coinciden. Tras 5 intentos fallidos el acceso se bloquea 15 minutos." },
      );
      return;
    }

    setListo(true);
    setAviso({ tipo: "ok", texto: "Listo. Te estamos llevando a tu panel." });
    const rol = (data?.user as { role?: string } | undefined)?.role;
    const inicio = rol === "admin" ? "/admin" : "/panel";
    // Solo se respeta "siguiente" si pertenece a la zona de ese rol
    router.replace(siguiente?.startsWith(inicio) ? siguiente : inicio);
    router.refresh();
  }

  const invalido = aviso?.tipo === "error";

  return (
    <form
      onSubmit={ingresar}
      noValidate
      aria-describedby="nota-ingreso"
      onAnimationEnd={(e) => e.target === e.currentTarget && setTiembla(false)}
      className={tiembla ? "ingreso-tiembla" : undefined}
    >
      <label htmlFor="correo" className="mb-1.5 block text-sm font-semibold text-texto-4">
        Correo
      </label>
      <input
        id="correo"
        name="correo"
        type="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        placeholder="tu@correo.com"
        aria-invalid={invalido || undefined}
        disabled={listo}
        className={entrada}
      />

      <label htmlFor="contrasena" className="mt-4 mb-1.5 block text-sm font-semibold text-texto-4">
        Contraseña
      </label>
      <div className="relative">
        <input
          id="contrasena"
          name="contrasena"
          type={ver ? "text" : "password"}
          autoComplete="current-password"
          aria-invalid={invalido || undefined}
          disabled={listo}
          className={`${entrada} pr-24`}
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-pressed={ver}
          aria-controls="contrasena"
          className="absolute top-1.5 right-1.5 h-9 rounded-lg px-3 text-sm font-semibold text-azul-texto hover:bg-cielo"
        >
          {ver ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      <div aria-live="polite">
        {aviso && (
          <p role="alert" className={`ingreso-aviso mt-4 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm leading-snug ${COLORES[aviso.tipo]}`}>
            <svg viewBox="0 0 24 24" aria-hidden className="mt-px size-[18px] flex-none fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
              <path d={ICONOS[aviso.tipo]} />
            </svg>
            {aviso.texto}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={enviando || listo}
        className="ingreso-boton relative mt-5 flex min-h-[50px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-azul text-base font-semibold text-white shadow-[0_12px_24px_-14px_rgb(31_78_156/0.9)] transition hover:brightness-110 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-80"
      >
        {enviando ? (
          <>
            <span className="ingreso-giro" aria-hidden />
            Ingresando…
          </>
        ) : listo ? (
          <>
            <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-white stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]">
              <path className="ingreso-chulo" d="M5 12.5l4.5 4.5L19 7" />
            </svg>
            Entrando a tu panel
          </>
        ) : (
          "Ingresar"
        )}
      </button>

      <p id="nota-ingreso" className="mt-3.5 text-[13px] leading-normal text-texto-3">
        ¿Olvidaste tu contraseña? Pídele al administrador que te asigne una nueva.
      </p>
    </form>
  );
}
