"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { comprobarVinculo, desvincularTelegram, prepararVinculo } from "@/modulos/telegram/acciones";

/** Vincula el chat de Telegram de Natalia con el bot que le entrega los PDF de las solicitudes. */
export function VincularTelegram({ configurado, vinculado }: { configurado: boolean; vinculado: { nombre: string | null; desde: string } | null }) {
  const [enlace, setEnlace] = useState<{ url: string; bot: string } | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const revisando = useRef(false);

  // Mientras hay un enlace abierto, revisa cada 3 segundos si Natalia ya le dio "Iniciar"
  useEffect(() => {
    if (!enlace) return;
    const id = setInterval(async () => {
      if (revisando.current) return;
      revisando.current = true;
      try {
        const r = await comprobarVinculo();
        if (!r.ok) {
          setEnlace(null);
          setAviso({ ok: false, texto: r.mensaje ?? "No se pudo vincular." });
        } else if (r.vinculado) {
          setEnlace(null);
          setAviso({ ok: true, texto: "¡Listo! Te mandamos un mensaje de prueba a Telegram." });
        }
      } finally {
        revisando.current = false;
      }
    }, 3000);
    return () => clearInterval(id);
  }, [enlace]);

  if (!configurado) {
    return (
      <div className="rounded-xl border border-linea bg-superficie p-4 text-texto-2">
        El bot de Telegram todavía no está configurado en el servidor. Cuando el administrador lo active, podrás vincularlo aquí.
      </div>
    );
  }

  const vincular = () =>
    iniciar(async () => {
      setAviso(null);
      const r = await prepararVinculo();
      if (r.ok && r.enlace && r.bot) setEnlace({ url: r.enlace, bot: r.bot });
      else setAviso({ ok: false, texto: r.mensaje ?? "No se pudo preparar el enlace." });
    });

  const quitar = () =>
    iniciar(async () => {
      const r = await desvincularTelegram();
      setAviso({ ok: r.ok, texto: r.mensaje ?? "" });
    });

  const botonPrincipal = "inline-flex min-h-11 items-center gap-2 rounded-lg bg-azul px-4 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-azul-hover hover:shadow-md disabled:opacity-60";

  return (
    <div className="rounded-xl border border-linea bg-superficie p-4">
      {vinculado && !enlace ? (
        <>
          <p className="flex items-center gap-2 font-semibold text-ok">
            <span aria-hidden className="size-2.5 rounded-full bg-ok" />
            Vinculado{vinculado.nombre ? ` con ${vinculado.nombre}` : ""}
          </p>
          <p className="mt-1 text-[15px] text-texto-2">
            Desde el {vinculado.desde}. En cada solicitud, el botón «Enviar a Telegram» te manda el PDF del formulario con la cédula.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={vincular} disabled={pendiente} className="min-h-11 rounded-lg border border-linea-2 px-4 font-semibold hover:border-azul disabled:opacity-60">
              Cambiar de cuenta
            </button>
            <button type="button" onClick={quitar} disabled={pendiente} className="min-h-11 rounded-lg border border-linea-2 px-4 font-semibold text-senal hover:border-senal disabled:opacity-60">
              Desvincular
            </button>
          </div>
        </>
      ) : enlace ? (
        <>
          <p className="flex items-center gap-2 font-semibold">
            <span aria-hidden className="telegram-espera size-2.5 rounded-full bg-azul" />
            Esperando que le des «Iniciar» al bot {enlace.bot}…
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px] text-texto-2">
            <li>Abre el bot con el botón de abajo (en el celular abre la app de Telegram).</li>
            <li>Toca «Iniciar» o «Start».</li>
            <li>Vuelve aquí: se vincula solo. El enlace sirve por 10 minutos y una sola vez.</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={enlace.url} target="_blank" rel="noopener noreferrer" className={botonPrincipal}>
              <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
                <path d="M21 3 3 10.5l6.5 2.5L12 20l3-6.5M21 3l-8.5 10.5" />
              </svg>
              Abrir el bot en Telegram
            </a>
            <button type="button" onClick={() => setEnlace(null)} className="min-h-11 rounded-lg border border-linea-2 px-4 font-semibold hover:border-azul">
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[15px] text-texto-2">
            Vincula tu Telegram para recibir ahí el PDF del formulario con la cédula de cada solicitud, con un solo toque desde el panel. El bot solo te escribe a ti y no responde mensajes.
          </p>
          <button type="button" onClick={vincular} disabled={pendiente} className={`${botonPrincipal} mt-3`}>
            {pendiente ? "Preparando…" : "Vincular Telegram"}
          </button>
        </>
      )}
      {aviso && <p role={aviso.ok ? "status" : "alert"} className={`mt-3 text-sm font-semibold ${aviso.ok ? "text-ok" : "text-senal"}`}>{aviso.texto}</p>}
    </div>
  );
}
