"use client";

import { startTransition, useActionState, useState, useTransition, type FormEvent } from "react";
import { borrarFotoModelo, guardarModelo, moverFoto, subirFotoModelo, type ResultadoAdmin } from "@/modulos/admin/acciones-catalogo";
import { comprimirImagen } from "@/lib/comprimir-imagen";
import { aSlug } from "@/lib/formato";

const claseInput =
  "min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 aria-invalid:border-senal";
const TIPOS: [string, string][] = [
  ["hatchback", "Hatchback"],
  ["sedan", "Sedán"],
  ["suv", "SUV"],
  ["todoterreno", "4x4"],
  ["familiar", "Familiar 7 puestos"],
];

export interface ModeloEditable {
  id: string;
  linea: string;
  slug: string;
  tipo: string;
  puestos: number;
  motor: string | null;
  transmision: string | null;
  descripcion: string | null;
  orden: number;
  visible: boolean;
}

/**
 * Definido FUERA del formulario a propósito: si se definiera dentro, React lo
 * trataría como un componente nuevo en cada render y el campo perdería el foco
 * con cada letra escrita.
 */
function Campo({ id, etiqueta, error, children, ancho }: { id: string; etiqueta: string; error?: string; children: React.ReactNode; ancho?: boolean }) {
  return (
    <div className={ancho ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{etiqueta}</label>
      {children}
      {error && <p className="mt-1 text-sm text-senal">{error}</p>}
    </div>
  );
}

export function FormularioModelo({ m }: { m: ModeloEditable }) {
  const [estado, accion, guardando] = useActionState(guardarModelo, { ok: true } as ResultadoAdmin);
  const [linea, setLinea] = useState(m.linea);
  const [slug, setSlug] = useState(m.slug);
  const [slugTocado, setSlugTocado] = useState(!m.slug.startsWith("nuevo-modelo-"));
  const [descripcion, setDescripcion] = useState(m.descripcion ?? "");
  const err = estado.errores ?? {};

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos));
  };

  return (
    <form onSubmit={enviar} className="rounded-xl border border-linea bg-superficie p-4">
      <input type="hidden" name="id" value={m.id} />
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Campo id="linea" error={err.linea} etiqueta="Línea">
          <input
            id="linea"
            name="linea"
            value={linea}
            maxLength={40}
            onChange={(e) => {
              setLinea(e.target.value);
              if (!slugTocado) setSlug(aSlug(e.target.value)); // la dirección se sugiere sola hasta que la edites
            }}
            aria-invalid={!!err.linea}
            className={claseInput}
          />
        </Campo>
        <Campo id="slug" error={err.slug} etiqueta="Dirección en el catálogo">
          <div className="flex items-center gap-1">
            <span className="text-sm text-texto-2">/modelo/</span>
            <input id="slug" name="slug" value={slug} maxLength={40} onChange={(e) => { setSlug(e.target.value); setSlugTocado(true); }} aria-invalid={!!err.slug} className={claseInput} />
          </div>
        </Campo>
        <Campo id="tipo" error={err.tipo} etiqueta="Tipo">
          <select id="tipo" name="tipo" defaultValue={m.tipo} className={claseInput}>
            {TIPOS.map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo id="puestos" error={err.puestos} etiqueta="Puestos">
          <input id="puestos" name="puestos" type="number" min={1} max={9} defaultValue={m.puestos} aria-invalid={!!err.puestos} className={claseInput} />
        </Campo>
        <Campo id="motor" error={err.motor} etiqueta="Motor">
          <input id="motor" name="motor" defaultValue={m.motor ?? ""} maxLength={60} placeholder="Ej: 1.2 L gasolina" className={claseInput} />
        </Campo>
        <Campo id="transmision" error={err.transmision} etiqueta="Transmisión">
          <input id="transmision" name="transmision" defaultValue={m.transmision ?? ""} maxLength={60} placeholder="Ej: Mecánica o automática" className={claseInput} />
        </Campo>
        <Campo id="descripcion" error={err.descripcion} etiqueta="Descripción corta" ancho>
          <textarea id="descripcion" name="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={140} aria-invalid={!!err.descripcion} className={`${claseInput} min-h-20 py-2`} />
          <p className="mt-1 text-right text-[13px] text-texto-2">{descripcion.length}/140</p>
        </Campo>
        <Campo id="orden" error={err.orden} etiqueta="Orden en el catálogo">
          <input id="orden" name="orden" type="number" min={0} max={99} defaultValue={m.orden} className={claseInput} />
        </Campo>
        <div className="self-end">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-semibold">
            <input type="checkbox" name="visible" defaultChecked={m.visible} className="size-5 accent-azul" />
            Visible en el catálogo
          </label>
        </div>
      </div>
      <button disabled={guardando} className="mt-4 min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover disabled:opacity-60">
        {guardando ? "Guardando…" : "Guardar modelo"}
      </button>
      {estado.mensaje && <p role="status" className={`mt-2 text-[15px] ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
    </form>
  );
}

/* ---------- fotos ---------- */

export interface FotoEditable {
  id: string;
  src: string;
  srcSet: string;
}

export function GestorFotos({ modeloId, fotos, maximo }: { modeloId: string; fotos: FotoEditable[]; maximo: number }) {
  const [progreso, setProgreso] = useState<string>();
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const cupo = maximo - fotos.length;

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.target.files ?? [])].slice(0, cupo);
    e.target.value = "";
    if (!archivos.length) return;
    setError(undefined);
    // Una por una: cada envío queda por debajo del límite de 1 MB de las Server Actions
    for (const [i, archivo] of archivos.entries()) {
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}…`);
      try {
        const datos = new FormData();
        datos.set("foto", await comprimirImagen(archivo), "foto.jpg");
        const r = await subirFotoModelo(modeloId, datos);
        if (!r.ok) setError(r.mensaje);
      } catch {
        setError(`No pudimos procesar ${archivo.name}.`);
      }
    }
    setProgreso(undefined);
  }

  const accion = (fn: () => Promise<ResultadoAdmin>) =>
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) setError(r.mensaje);
    });

  return (
    <div className="rounded-xl border border-linea bg-superficie p-4">
      {fotos.length === 0 && <p className="text-texto-2">Este modelo todavía no tiene fotos: el catálogo muestra una ilustración.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fotos.map((f, i) => (
          <li key={f.id} className="overflow-hidden rounded-lg border border-linea">
            <div className="relative aspect-[4/3] bg-cielo">
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas */}
              <img src={f.src} srcSet={f.srcSet} sizes="200px" alt={`Foto ${i + 1}`} className="size-full object-cover" />
              {i === 0 && <span className="absolute top-1.5 left-1.5 rounded bg-azul px-1.5 py-0.5 text-xs font-semibold text-white">Portada</span>}
            </div>
            <div className="flex flex-wrap justify-between gap-1 p-1.5">
              <span className="flex gap-1">
                <button type="button" disabled={pendiente || i === 0} onClick={() => accion(() => moverFoto(f.id, -1))} aria-label="Mover a la izquierda" className="min-h-8 min-w-8 rounded border border-linea-2 disabled:opacity-30">‹</button>
                <button type="button" disabled={pendiente || i === fotos.length - 1} onClick={() => accion(() => moverFoto(f.id, 1))} aria-label="Mover a la derecha" className="min-h-8 min-w-8 rounded border border-linea-2 disabled:opacity-30">›</button>
              </span>
              <span className="flex gap-1">
                {i > 0 && <button type="button" disabled={pendiente} onClick={() => accion(() => moverFoto(f.id, "portada"))} className="min-h-8 rounded border border-linea-2 px-2 text-xs font-semibold">Portada</button>}
                <button type="button" disabled={pendiente} onClick={() => accion(() => borrarFotoModelo(f.id))} className="min-h-8 rounded border border-senal px-2 text-xs font-semibold text-senal">Borrar</button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className={`flex min-h-11 items-center rounded-lg px-4 font-semibold ${cupo > 0 && !progreso ? "cursor-pointer bg-azul text-white focus-within:ring-2 focus-within:ring-azul" : "cursor-not-allowed bg-linea text-texto-2"}`}>
          <input type="file" accept="image/*" multiple disabled={cupo <= 0 || !!progreso} onChange={subir} className="sr-only" />
          {progreso ?? "Subir fotos"}
        </label>
        <span className="text-sm text-texto-2">{cupo > 0 ? `Puedes agregar ${cupo} más. La primera es la portada.` : `Llegaste al máximo de ${maximo} fotos.`}</span>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-senal">{error}</p>}
    </div>
  );
}
