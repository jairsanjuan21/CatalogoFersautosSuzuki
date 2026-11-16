"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { enviarSolicitudATelegram } from "@/modulos/telegram/acciones";
import { IconoAccion } from "./iconos";

/**
 * "Enviar a Telegram": manda el PDF formulario + cédula al chat de Natalia.
 * Si todavía no vinculó su Telegram, el botón la lleva a Mi perfil a hacerlo.
 */
export function BotonTelegram({ solicitudId, listo, vinculado, clase }: { solicitudId: string; listo: boolean; vinculado: boolean; clase: string }) {
  const [pendiente, iniciar] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  // El aviso se va solo; el "Enviado" vuelve al estado normal para poder reenviar
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.ok ? 3500 : 7000);
    return () => clearTimeout(t);
  }, [aviso]);
  useEffect(() => {
    if (!enviado) return;
    const t = setTimeout(() => setEnviado(false), 4000);
    return () => clearTimeout(t);
  }, [enviado]);

  if (!vinculado) {
    return (
      <Link href="/panel/perfil#telegram" className={`${clase} boton-accion`} title="Vincula tu Telegram para recibir aquí los PDF">
        <IconoAccion anim="avion" />
        Vincular Telegram
      </Link>
    );
  }
  if (!listo) {
    return (
      <span aria-disabled className={`${clase} opacity-50`} title="Necesita el valor del vehículo y las fotos de la cédula">
        <IconoAccion anim="avion" />
        Enviar a Telegram
      </span>
    );
  }

  const enviar = () =>
    iniciar(async () => {
      const r = await enviarSolicitudATelegram(solicitudId);
      setAviso({ ok: r.ok, texto: r.mensaje ?? (r.ok ? "Enviado." : "No se pudo enviar.") });
      if (r.ok) setEnviado(true);
    });

  return (
    <>
      <button
        type="button"
        onClick={enviar}
        disabled={pendiente}
        aria-busy={pendiente}
        data-estado={pendiente ? "enviando" : enviado ? "enviado" : undefined}
        className={`${clase} boton-accion cursor-pointer disabled:cursor-progress`}
        title="Envía el PDF del formulario con la cédula a tu chat de Telegram"
      >
        {pendiente ? (
          <span aria-hidden className="boton-accion__giro size-[22px] rounded-full border-2 border-current border-r-transparent" />
        ) : enviado ? (
          <svg viewBox="0 0 24 24" aria-hidden className="boton-accion__chulo size-[22px] fill-none stroke-current stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <IconoAccion anim="avion" />
        )}
        {pendiente ? "Enviando…" : enviado ? "Enviado" : "Enviar a Telegram"}
      </button>
      {aviso && (
        <p
          role={aviso.ok ? "status" : "alert"}
          className={`boton-accion__aviso fixed inset-x-4 bottom-5 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-[15px] font-semibold text-white shadow-lg ${aviso.ok ? "bg-ok" : "bg-senal"}`}
        >
          {aviso.texto}
        </p>
      )}
    </>
  );
}
