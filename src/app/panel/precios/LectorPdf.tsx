"use client";

import { useState, useTransition } from "react";
import { publicarPreciosLeidos } from "@/modulos/precios/acciones";
import type { ResultadoLectura } from "@/modulos/precios/lector-ia";
import { plata } from "@/lib/formato";

type Estado =
  | { fase: "inicio" }
  | { fase: "leyendo"; archivo: string }
  | { fase: "revision"; archivo: string; r: ResultadoLectura & { usadas: number; tope: number } }
  | { fase: "publicado"; mensaje: string };

const UMBRAL = 25; // % de cambio a partir del cual el precio llega desmarcado

export function LectorPdf() {
  const [estado, setEstado] = useState<Estado>({ fase: "inicio" });
  const [error, setError] = useState<string>();
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [publicando, iniciar] = useTransition();

  async function leer(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (archivo.type !== "application/pdf" && !archivo.name.toLowerCase().endsWith(".pdf")) return setError("El archivo debe ser un PDF.");
    if (archivo.size > 10 * 1024 * 1024) return setError("El PDF pesa más de 10 MB.");
    setError(undefined);
    setEstado({ fase: "leyendo", archivo: archivo.name });
    try {
      const datos = new FormData();
      datos.set("pdf", archivo);
      const res = await fetch("/api/precios/leer", { method: "POST", body: datos });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEstado({ fase: "inicio" });
        return setError(json.mensaje ?? "No pudimos leer el PDF.");
      }
      const r = json as ResultadoLectura & { usadas: number; tope: number };
      // Los cambios grandes llegan desmarcados: Natalia decide si son reales
      setMarcados(new Set(r.propuesta.flatMap((m) => m.versiones).filter((v) => v.cambioPct === null || Math.abs(v.cambioPct) <= UMBRAL).map((v) => v.versionId)));
      setEstado({ fase: "revision", archivo: archivo.name, r });
    } catch {
      setEstado({ fase: "inicio" });
      setError("No hay conexión. Revisa tu internet e intenta de nuevo.");
    }
  }

  function publicar() {
    if (estado.fase !== "revision") return;
    const seleccion = estado.r.propuesta.flatMap((m) => m.versiones).filter((v) => marcados.has(v.versionId)).map((v) => ({ versionId: v.versionId, precio: v.precioLeido }));
    iniciar(async () => {
      const r = await publicarPreciosLeidos(seleccion, estado.archivo);
      if (r.ok) setEstado({ fase: "publicado", mensaje: r.mensaje ?? "Precios publicados." });
      else setError(r.mensaje);
    });
  }

  if (estado.fase === "leyendo") {
    return (
      <div role="status" className="rounded-xl border border-linea bg-superficie p-5 text-center">
        <p className="font-semibold">Leyendo {estado.archivo}…</p>
        <p className="mt-1 text-sm text-texto-2">Suele tardar entre 10 y 30 segundos.</p>
      </div>
    );
  }

  if (estado.fase === "revision") {
    const { r } = estado;
    return (
      <div className="rounded-xl border border-azul bg-superficie p-4">
        <p className="font-semibold">
          Encontramos {r.propuesta.reduce((n, m) => n + m.versiones.length, 0)} versiones de {r.propuesta.length} modelos en {estado.archivo}
        </p>
        {r.vigencia && <p className="text-sm text-texto-2">Vigencia de la lista: {r.vigencia}</p>}
        <p className="mt-1 text-sm text-texto-2">Revisa cada precio. Solo se publican los que dejes marcados.</p>

        {r.propuesta.map((m) => (
          <section key={m.modeloId} className="mt-3">
            <h3 className="font-display text-lg font-bold">{m.linea}</h3>
            {/* Una fila por versión: en el celular una tabla de varias columnas no cabe */}
            <ul className="divide-y divide-linea border-y border-linea">
              {m.versiones.map((v) => {
                const grande = v.cambioPct !== null && Math.abs(v.cambioPct) > UMBRAL;
                const id = `pub-${v.versionId}`;
                return (
                  <li key={v.versionId} className="py-2.5">
                    <div className="flex items-start gap-3">
                      <input
                        id={id}
                        type="checkbox"
                        checked={marcados.has(v.versionId)}
                        onChange={(e) => setMarcados((s) => { const n = new Set(s); if (e.target.checked) n.add(v.versionId); else n.delete(v.versionId); return n; })}
                        className="mt-1 size-5 flex-none accent-azul"
                      />
                      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span>{v.etiqueta}</span>
                          <b className="whitespace-nowrap">{plata(v.precioLeido)}</b>
                        </span>
                        <span className="block text-sm text-texto-2">
                          {v.precioActual ? `Antes ${plata(v.precioActual)}` : "Sin precio anterior"}
                          {v.cambioPct !== null && v.cambioPct !== 0 && (
                            <span className={`ml-1.5 font-semibold ${v.cambioPct > 0 ? "text-senal" : "text-ok"}`}>{v.cambioPct > 0 ? "+" : ""}{v.cambioPct} %</span>
                          )}
                          {v.cambioPct === 0 && <span className="ml-1.5">(sin cambio)</span>}
                        </span>
                        <span className="block text-[13px] text-texto-2">En el PDF: {v.texto}{v.observacion && ` (${v.observacion})`}</span>
                      </label>
                    </div>
                    {grande && <p className="mt-1 ml-8 text-[13px] font-semibold text-ambar">Cambia mucho: revísalo antes de marcarlo.</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {r.versionesNuevas.length > 0 && (
          <div className="mt-3 rounded-lg bg-cielo p-3 text-[15px]">
            <p className="font-semibold">Versiones que no están registradas:</p>
            <ul className="mt-1 list-disc pl-5">
              {r.versionesNuevas.map((s) => <li key={s.texto}>{s.linea}: {s.texto}, {plata(s.precio)}</li>)}
            </ul>
            <p className="mt-1 text-sm text-texto-2">Pídele al administrador que las agregue al modelo para poder publicarles precio.</p>
          </div>
        )}
        {r.sinCoincidencia.length > 0 && (
          <div className="mt-3 rounded-lg bg-cielo p-3 text-[15px]">
            <p className="font-semibold">No están en el catálogo:</p>
            <ul className="mt-1 list-disc pl-5">
              {r.sinCoincidencia.map((s) => <li key={s.texto}>{s.texto}: {plata(s.precio)}</li>)}
            </ul>
            <p className="mt-1 text-sm text-texto-2">Si quieres mostrarlos, pídele al administrador que los agregue al catálogo.</p>
          </div>
        )}
        {(r.advertencias.length > 0 || r.descartadas.length > 0) && (
          <div className="mt-3 rounded-lg bg-ambar-fondo p-3 text-[15px] text-ambar">
            <p className="font-semibold">Para revisar:</p>
            <ul className="mt-1 list-disc pl-5">
              {r.descartadas.map((d) => <li key={d.texto}>{d.texto}: {d.motivo}</li>)}
              {r.advertencias.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button type="button" disabled={publicando || marcados.size === 0} onClick={publicar} className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover disabled:opacity-50">
            {publicando ? "Publicando…" : `Publicar ${marcados.size} ${marcados.size === 1 ? "precio" : "precios"}`}
          </button>
          <button type="button" onClick={() => { setEstado({ fase: "inicio" }); setError(undefined); }} className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold">
            Descartar
          </button>
          <span className="text-[13px] text-texto-2">Lecturas este mes: {r.usadas} de {r.tope}</span>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-senal">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {estado.fase === "publicado" && <p role="status" className="mb-3 rounded-lg bg-ok-fondo px-3 py-2.5 text-ok">{estado.mensaje}</p>}
      <label className="block cursor-pointer rounded-xl border-[1.5px] border-dashed border-linea-2 bg-superficie p-5 text-center focus-within:ring-2 focus-within:ring-azul">
        <input type="file" accept="application/pdf,.pdf" onChange={leer} className="sr-only" />
        <strong className="text-azul-texto">Toca para elegir el PDF de precios</strong>
        <span className="mt-1 block text-sm text-texto-2">El sistema lee los precios y te los muestra para que los confirmes antes de publicar.</span>
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-senal">{error}</p>}
    </div>
  );
}
