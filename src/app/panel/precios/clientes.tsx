"use client";

import { startTransition, useActionState, useOptimistic, useRef, useState, useTransition, type FormEvent } from "react";
import {
  cambiarMostrarPrecio,
  crearPromocion,
  eliminarPromocion,
  guardarPrecios,
  type ResultadoPrecios,
} from "@/modulos/precios/acciones";
import { plata } from "@/lib/formato";
import { useFormularioAccion } from "@/lib/usar-formulario";

const inicial: ResultadoPrecios = { ok: true };
const claseInput =
  "min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40";
const soloDigitos = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 10);
  return d ? Number(d) : undefined;
};

export interface FilaPrecio {
  id: string;
  linea: string;
  tipo: string;
  precio: number | null;
  mostrarPrecio: boolean;
  desactualizado: boolean;
  actualizado: string; // "hace 2 días", ya calculado en el servidor
  anterior: string | null; // "$ 76.990.000 el 21 oct."
}

/* ---------- tabla de precios del día ---------- */

export function TablaPrecios({ filas, diasVigencia }: { filas: FilaPrecio[]; diasVigencia: number }) {
  const [estado, accion, guardando] = useActionState(guardarPrecios, inicial);
  const [valores, setValores] = useState<Record<string, number | undefined>>(() =>
    Object.fromEntries(filas.map((f) => [f.id, f.precio ?? undefined])),
  );
  const formulario = useRef<HTMLFormElement>(null);

  const enviar = (confirmar: boolean) => {
    const datos = new FormData(formulario.current!);
    if (confirmar) datos.set("confirmar", "1");
    startTransition(() => accion(datos));
  };
  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    enviar(false);
  };
  const hayAvisos = !!estado.avisos && Object.keys(estado.avisos).length > 0;

  return (
    <form ref={formulario} onSubmit={alEnviar}>
      <div className="overflow-hidden rounded-xl border border-linea bg-superficie">
        {filas.map((f) => {
          const valor = valores[f.id];
          const cambio = f.precio && valor && valor !== f.precio ? valor - f.precio : 0;
          const aviso = estado.avisos?.[f.id];
          const error = estado.errores?.[f.id];
          return (
            <div key={f.id} className="grid grid-cols-1 gap-2 border-b border-linea px-4 py-3.5 last:border-b-0 sm:grid-cols-[1fr_180px] sm:items-center">
              <div>
                <strong className="font-display text-lg">{f.linea}</strong> <span className="text-sm text-texto-2">{f.tipo}</span>
                <p className={`text-[13px] ${f.desactualizado ? "font-semibold text-senal" : "text-texto-2"}`}>
                  {f.precio ? `Actualizado ${f.actualizado}` : "Sin precio cargado"}
                  {f.desactualizado && `. Lleva más de ${diasVigencia} días: no se muestra en el catálogo`}
                </p>
                {f.anterior && <p className="text-[13px] text-texto-2">Antes: {f.anterior}</p>}
                <InterruptorPrecio modeloId={f.id} mostrar={f.mostrarPrecio} />
              </div>
              <div>
                <label htmlFor={`p-${f.id}`} className="sr-only">Precio de {f.linea}</label>
                <input type="hidden" name={`precio:${f.id}`} value={valor ?? ""} />
                <input
                  id={`p-${f.id}`}
                  inputMode="numeric"
                  value={plata(valor)}
                  placeholder="$ 0"
                  onChange={(e) => setValores((v) => ({ ...v, [f.id]: soloDigitos(e.target.value) }))}
                  aria-invalid={!!error || !!aviso}
                  className={`${claseInput} text-right ${aviso ? "border-ambar" : ""} ${error ? "border-senal" : ""}`}
                />
                {cambio !== 0 && !aviso && !error && (
                  <p className={`mt-1 text-right text-[13px] ${cambio > 0 ? "text-senal" : "text-ok"}`}>
                    {cambio > 0 ? "Sube" : "Baja"} {plata(Math.abs(cambio))}
                  </p>
                )}
                {aviso && <p className="mt-1 text-[13px] text-ambar">{aviso}</p>}
                {error && <p className="mt-1 text-[13px] text-senal">{error}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        {hayAvisos ? (
          <>
            <button type="button" disabled={guardando} onClick={() => enviar(true)} className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white disabled:opacity-60">
              Sí, guardar igual
            </button>
            <span className="text-sm text-texto-2">o corrige los precios marcados y vuelve a guardar.</span>
          </>
        ) : null}
        <button disabled={guardando} className={`min-h-11 rounded-lg px-4 font-semibold disabled:opacity-60 ${hayAvisos ? "border border-linea-2 bg-superficie" : "bg-azul text-white hover:bg-azul-hover"}`}>
          {guardando ? "Guardando…" : "Guardar precios de hoy"}
        </button>
      </div>
      {estado.mensaje && (
        <p role="status" className={`mt-3 text-[15px] ${estado.ok ? "text-ok" : hayAvisos ? "text-ambar" : "text-senal"}`}>
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}

function InterruptorPrecio({ modeloId, mostrar }: { modeloId: string; mostrar: boolean }) {
  const [, iniciar] = useTransition();
  // La casilla cambia al instante; si el servidor falla, vuelve sola al valor real
  const [visible, setVisible] = useOptimistic(mostrar);
  const [mensaje, setMensaje] = useState<string>();
  return (
    <label className="mt-1.5 inline-flex cursor-pointer items-center gap-2 text-[13px] text-texto-2">
      <input
        type="checkbox"
        checked={visible}
        onChange={(e) => {
          const valor = e.target.checked;
          iniciar(async () => {
            setVisible(valor);
            const r = await cambiarMostrarPrecio(modeloId, valor);
            setMensaje(r.mensaje);
          });
        }}
        className="size-4 accent-azul"
      />
      Mostrar precio en el catálogo
      {mensaje && <span className="sr-only" role="status">{mensaje}</span>}
    </label>
  );
}

/* ---------- promociones ---------- */

export function FormularioPromocion({ modelos, hoy }: { modelos: { id: string; linea: string }[]; hoy: string }) {
  // Se limpia solo si se guardó: con un error, lo escrito se conserva
  const { ref, alEnviar, estado, pendiente: guardando } = useFormularioAccion(crearPromocion, inicial);
  const err = estado.errores ?? {};
  return (
    <form ref={ref} onSubmit={alEnviar} className="mt-3 rounded-xl border border-linea bg-superficie p-4">
      <strong className="font-display text-lg">Nueva promoción</strong>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="pr-modelo" className="mb-1 block text-sm font-semibold">Modelo</label>
          <select id="pr-modelo" name="modeloId" className={claseInput} aria-invalid={!!err.modeloId}>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>{m.linea}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pr-hasta" className="mb-1 block text-sm font-semibold">Válida hasta</label>
          <input id="pr-hasta" name="hasta" type="date" min={hoy} className={claseInput} aria-invalid={!!err.hasta} />
          {err.hasta && <p className="mt-1 text-sm text-senal">{err.hasta}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pr-desc" className="mb-1 block text-sm font-semibold">Descripción</label>
          <input id="pr-desc" name="descripcion" maxLength={120} placeholder="Ej: SOAT gratis por compra en noviembre" className={claseInput} aria-invalid={!!err.descripcion} />
          {err.descripcion && <p className="mt-1 text-sm text-senal">{err.descripcion}</p>}
        </div>
        <div>
          <label htmlFor="pr-bono" className="mb-1 block text-sm font-semibold">
            Valor del bono <span className="font-normal text-texto-2">(opcional)</span>
          </label>
          <input
            id="pr-bono"
            name="valorBono"
            inputMode="numeric"
            placeholder="$ 0"
            // Formato en vivo sin estado de React, para que el reinicio del formulario lo limpie
            onInput={(e) => {
              const d = e.currentTarget.value.replace(/\D/g, "").slice(0, 9);
              e.currentTarget.value = d ? plata(Number(d)) : "";
            }}
            className={claseInput}
            aria-invalid={!!err.valorBono}
          />
          {err.valorBono && <p className="mt-1 text-sm text-senal">{err.valorBono}</p>}
        </div>
      </div>
      <button disabled={guardando} className="mt-3.5 min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold disabled:opacity-60">
        {guardando ? "Agregando…" : "Agregar promoción"}
      </button>
      {estado.mensaje && <p role="status" className={`mt-2 text-[15px] ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
    </form>
  );
}

export function QuitarPromocion({ promocionId }: { promocionId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="min-h-9 rounded-lg border border-linea-2 bg-superficie px-3 text-sm font-semibold">
        Quitar
      </button>
    );
  }
  return (
    <span className="flex gap-1.5">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => iniciar(async () => void (await eliminarPromocion(promocionId)))}
        className="min-h-9 rounded-lg bg-senal px-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pendiente ? "Quitando…" : "Sí, quitar"}
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="min-h-9 rounded-lg border border-linea-2 bg-superficie px-3 text-sm">
        No
      </button>
    </span>
  );
}
