"use client";

import { useState, useTransition } from "react";
import { leerListaExcel, publicarListaExcel, type ResultadoLecturaExcel } from "@/modulos/precios/acciones-excel";
import { interpretarTexto, LIMITE_BYTES, type FilaPropuesta } from "@/modulos/precios/lista-excel";
import { plata } from "@/lib/formato";

type Lectura = Extract<ResultadoLecturaExcel, { ok: true }>;
type Estado = { fase: "inicio" } | { fase: "revision"; r: Lectura } | { fase: "publicado"; mensaje: string };

const UMBRAL = 25; // % de cambio que se resalta para revisar con calma
const TRANS = { mecanica: "mecánica", automatica: "automática" } as const;

/** Valor del selector de cada fila: "v:<idVersion>", "nueva" u "omitir" */
const valorInicial = (f: FilaPropuesta) => (f.sugerido.tipo === "existente" ? `v:${f.sugerido.versionId}` : f.sugerido.tipo);

const fechaLarga = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z")) : null;

export function ImportadorExcel() {
  const [estado, setEstado] = useState<Estado>({ fase: "inicio" });
  const [error, setError] = useState<string>();
  const [destinos, setDestinos] = useState<string[]>([]);
  const [vigenteHasta, setVigenteHasta] = useState("");
  const [ocultar, setOcultar] = useState(false);
  const [leyendo, iniciarLectura] = useTransition();
  const [publicando, iniciarPublicacion] = useTransition();

  function leer(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (!/\.xlsx$/i.test(archivo.name)) return setError("El archivo debe ser un Excel .xlsx. Si es .xls, ábrelo y guárdalo como .xlsx.");
    if (archivo.size > LIMITE_BYTES) return setError("El archivo pesa más de 2 MB. ¿Es la lista de precios?");
    setError(undefined);
    const datos = new FormData();
    datos.set("archivo", archivo);
    iniciarLectura(async () => {
      const r = await leerListaExcel(datos).catch(() => ({ ok: false as const, mensaje: "No hay conexión. Revisa tu internet e intenta de nuevo." }));
      if (!r.ok) return setError(r.mensaje);
      setDestinos(r.filas.map(valorInicial));
      setVigenteHasta(r.vigenteHasta ?? "");
      setOcultar(false);
      setEstado({ fase: "revision", r });
    });
  }

  function publicar() {
    if (estado.fase !== "revision") return;
    const { r } = estado;
    const filas = r.filas.flatMap((f, i) => {
      const d = destinos[i];
      if (d === "omitir") return [];
      let destino;
      if (d.startsWith("v:")) destino = { tipo: "existente" as const, versionId: d.slice(2) };
      else if (f.sugerido.tipo === "nueva") destino = f.sugerido;
      else {
        // Natalia pidió versión nueva para una fila que sí coincidía: se arma con lo que dice el texto
        const l = interpretarTexto(f.texto);
        destino = { tipo: "nueva" as const, modeloId: null, linea: l.linea, nombre: l.version, transmision: l.transmision };
      }
      return [{ texto: f.texto, anio: f.anio, referencia: f.referencia, venta: f.venta, nuevoPrecio: f.nuevoPrecio, combustible: f.combustible, categoria: f.categoria, destino }];
    });
    setError(undefined);
    iniciarPublicacion(async () => {
      const res = await publicarListaExcel({ archivo: r.archivo, numero: r.numero, fecha: r.fecha, vigenteHasta: vigenteHasta || null, ocultarFaltantes: ocultar, filas }).catch(() => ({
        ok: false,
        mensaje: "No hay conexión. Revisa tu internet e intenta de nuevo.",
      }));
      if (res.ok) setEstado({ fase: "publicado", mensaje: res.mensaje });
      else setError(res.mensaje);
    });
  }

  const avisoError = error ? (
    <p role="alert" className="mt-3 rounded-lg bg-senal-fondo px-3.5 py-2.5 text-sm text-senal">
      {error}
    </p>
  ) : null;

  if (estado.fase === "publicado") {
    return (
      <div className="rounded-xl border border-linea bg-superficie p-4">
        <p role="status" className="font-semibold text-ok">{estado.mensaje}</p>
        <button type="button" onClick={() => setEstado({ fase: "inicio" })} className="mt-3 min-h-11 rounded-lg border border-linea-2 px-4 text-sm font-semibold">
          Cargar otra lista
        </button>
      </div>
    );
  }

  if (estado.fase === "inicio") {
    return (
      <div className="rounded-xl border border-dashed border-linea-2 bg-superficie p-5">
        <p className="text-[15px] text-texto-2">
          Sube el Excel que te manda Suzuki (“Lista de Precios No. …”). Se toma de cada versión el <b>Precio Referencia</b> como precio base y el{" "}
          <b>Precio Venta Público</b> como precio de hoy. Antes de publicar, revisas todo.
        </p>
        <label className={`mt-3.5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover ${leyendo ? "pointer-events-none opacity-70" : ""}`}>
          {leyendo ? "Leyendo el Excel…" : "Elegir archivo .xlsx"}
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={leer} disabled={leyendo} className="sr-only" />
        </label>
        {avisoError}
      </div>
    );
  }

  const { r } = estado;
  const aPublicar = destinos.filter((d) => d !== "omitir").length;
  const lineas = [...new Set(r.filas.map((f) => (f.sugerido.tipo === "nueva" ? f.sugerido.linea : (r.opciones.find((o) => `v:${o.id}` === valorInicial(f))?.modelo ?? ""))))];
  const lineaDe = (f: FilaPropuesta) => (f.sugerido.tipo === "nueva" ? f.sugerido.linea : (r.opciones.find((o) => `v:${o.id}` === valorInicial(f))?.modelo ?? ""));
  const modelos = [...new Set(r.opciones.map((o) => o.modelo))];
  const lineasNuevas = [...new Set(r.filas.filter((f, i) => destinos[i] === "nueva" && f.sugerido.tipo === "nueva" && !f.sugerido.modeloId).map((f) => (f.sugerido as { linea: string }).linea))];

  return (
    <div className="rounded-xl border border-linea bg-superficie">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-linea px-4 py-3.5">
        <div>
          <p className="font-display text-xl font-semibold">Lista de precios{r.numero ? ` No. ${r.numero}` : ""}</p>
          <p className="text-sm text-texto-2">
            {r.archivo}
            {r.fecha && ` · del ${fechaLarga(r.fecha)}`} · {r.filas.length} versiones
          </p>
        </div>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Vigente hasta</span>
          <input
            type="date"
            value={vigenteHasta}
            min={r.fecha ?? undefined}
            onChange={(e) => setVigenteHasta(e.target.value)}
            className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-3"
          />
        </label>
      </header>
      <p className="border-b border-linea px-4 py-2.5 text-[13px] text-texto-2">
        {vigenteHasta
          ? `El ${fechaLarga(vigenteHasta)} es el último día: desde el día siguiente el catálogo muestra estos precios “a consultar” hasta que subas la nueva lista.`
          : "Sin fecha de vigencia: los precios siguen la regla de días de vigencia de la configuración."}
      </p>

      <div aria-hidden className="hidden gap-2 border-b border-linea px-4 py-2 text-xs font-semibold text-texto-2 md:grid md:grid-cols-[minmax(0,1.15fr)_repeat(3,minmax(0,0.55fr))_minmax(0,1.5fr)]">
        <span>Fila del Excel</span>
        <span className="text-right">Precio base</span>
        <span className="text-right">Precio de hoy</span>
        <span className="text-right">Bono / cambio</span>
        <span>Va a</span>
      </div>
      {lineas.map((linea) => (
        <section key={linea} className="border-b border-linea last:border-b-0">
          <h3 className="flex items-center gap-2 bg-superficie-2 px-4 py-2 text-sm font-bold">
            {linea}
            {lineasNuevas.includes(linea) && <span className="rounded bg-cielo px-1.5 py-0.5 text-xs font-semibold text-azul-texto">Modelo nuevo</span>}
          </h3>
          <ul className="divide-y divide-linea">
            {r.filas.map((f, i) => {
              if (lineaDe(f) !== linea) return null;
              const d = destinos[i];
              const cambio = f.precioActual ? Math.round(((f.venta - f.precioActual) / f.precioActual) * 1000) / 10 : null;
              return (
                <li key={f.texto} className={`grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.15fr)_repeat(3,minmax(0,0.55fr))_minmax(0,1.5fr)] md:items-center ${d === "omitir" ? "opacity-55" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold break-words">{f.texto}</p>
                    <p className="text-[13px] text-texto-2">
                      {f.anio && `Modelo ${f.anio}`}
                      {f.nuevoPrecio && <span className="ml-2 rounded bg-cielo px-1.5 py-0.5 text-xs font-semibold text-azul-texto">Nuevo precio</span>}
                    </p>
                  </div>
                  <Dato etiqueta="Precio base" valor={plata(f.referencia)} />
                  <Dato etiqueta="Precio de hoy" valor={plata(f.venta)} fuerte />
                  <Dato
                    etiqueta="Bono / cambio"
                    valor={f.referencia > f.venta ? plata(f.referencia - f.venta) : "Sin bono"}
                    nota={cambio === null ? (f.precioActual === null && d.startsWith("v:") ? "sin precio antes" : undefined) : cambio === 0 ? "igual que antes" : `${cambio > 0 ? "sube" : "baja"} ${Math.abs(cambio)} %`}
                    alerta={cambio !== null && Math.abs(cambio) > UMBRAL}
                  />
                  <div>
                    <label htmlFor={`destino-${i}`} className="mb-1 block text-xs font-semibold text-texto-2 md:sr-only">
                      Va a
                    </label>
                    <select
                      id={`destino-${i}`}
                      value={d}
                      onChange={(e) => setDestinos((x) => x.map((v, k) => (k === i ? e.target.value : v)))}
                      className={`min-h-11 w-full rounded-lg border bg-superficie px-2.5 text-[15px] ${d === "nueva" ? "border-azul" : "border-linea-2"}`}
                    >
                      <option value="nueva">
                        {f.sugerido.tipo === "nueva"
                          ? `Nueva: ${f.sugerido.nombre}${f.sugerido.transmision ? ` ${TRANS[f.sugerido.transmision]}` : ""}`
                          : "Crear como versión nueva"}
                      </option>
                      <option value="omitir">No cargar esta fila</option>
                      {modelos.map((m) => (
                        <optgroup key={m} label={m}>
                          {r.opciones.filter((o) => o.modelo === m).map((o) => (
                            <option key={o.id} value={`v:${o.id}`}>
                              {m} {o.etiqueta}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <footer className="space-y-3 border-t border-linea px-4 py-4">
        {lineasNuevas.length > 0 && (
          <p className="rounded-lg bg-cielo px-3.5 py-2.5 text-sm text-azul-texto">
            Se crearán los modelos <b>{lineasNuevas.join(", ")}</b>. Quedan ocultos hasta que les pongas fotos y descripción en Catálogo.
          </p>
        )}
        {r.faltantes.length > 0 && (
          <div className="rounded-lg border border-linea px-3.5 py-3">
            <label className="flex cursor-pointer items-start gap-2.5 text-[15px]">
              <input type="checkbox" checked={ocultar} onChange={(e) => setOcultar(e.target.checked)} className="mt-1 size-4 accent-azul" />
              <span>
                <b>Ocultar del catálogo lo que no viene en esta lista.</b> No se borra nada: lo vuelves a mostrar en Catálogo cuando quieras.
              </span>
            </label>
            <ul className="mt-2 ml-7 list-disc text-sm text-texto-2">
              {r.faltantes.map((f) => (
                <li key={f.modelo}>
                  {f.modeloCompleto ? <b>{f.modelo} (todo el modelo)</b> : f.modelo}: {f.versiones.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}
        {r.descartadas.length > 0 && (
          <p className="text-sm text-ambar">Filas que no se pueden cargar: {r.descartadas.map((x) => `${x.texto} (${x.motivo.toLowerCase()})`).join("; ")}.</p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={publicar} disabled={publicando || aPublicar === 0} className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover disabled:opacity-60">
            {publicando ? "Publicando…" : `Publicar ${aPublicar} precios`}
          </button>
          <button type="button" onClick={() => setEstado({ fase: "inicio" })} disabled={publicando} className="min-h-11 rounded-lg border border-linea-2 px-4 font-semibold">
            Cancelar
          </button>
        </div>
        {avisoError}
      </footer>
    </div>
  );
}

function Dato({ etiqueta, valor, nota, fuerte, alerta }: { etiqueta: string; valor: string; nota?: string; fuerte?: boolean; alerta?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 md:block md:text-right">
      <span className="text-xs text-texto-2 md:hidden">{etiqueta}</span>
      <span>
        <span className={`block tabular-nums ${fuerte ? "font-semibold" : ""}`}>{valor}</span>
        {nota && <span className={`block text-xs ${alerta ? "font-semibold text-ambar" : "text-texto-2"}`}>{nota}</span>}
      </span>
    </div>
  );
}
