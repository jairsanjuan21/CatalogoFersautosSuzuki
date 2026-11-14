import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { plata, TRANSMISIONES } from "@/lib/formato";
import { versionesParaComparar, type VersionComparable } from "@/modulos/catalogo/consultas";
import { COMBUSTIBLE_TEXTO, TIPO_TEXTO } from "../textos";

export const metadata: Metadata = {
  title: "Comparar versiones Suzuki | Fersautos Cúcuta",
  description: "Compara precio, transmisión, combustible y puestos de hasta tres versiones Suzuki.",
};

type Busqueda = Promise<{ v?: string | string[] }>;
const MAXIMO = 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Comparar({ searchParams }: { searchParams: Busqueda }) {
  return (
    <main className="mx-auto max-w-6xl px-5">
      <Link href="/#modelos" className="inline-block py-1.5 font-semibold text-azul-texto">
        ‹ Todos los modelos
      </Link>
      <h1 className="font-display mt-1 text-[clamp(36px,7vw,52px)] leading-none font-extrabold">Comparar versiones</h1>
      <p className="mt-1.5 text-texto-2">Elige hasta tres versiones, del mismo modelo o de modelos distintos.</p>
      <Suspense fallback={<p className="py-10 text-texto-2">Cargando…</p>}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const etiqueta = (v: VersionComparable) => `${v.modelo.linea} ${v.nombre}${v.transmision ? ` ${TRANSMISIONES[v.transmision]}` : ""}`;

async function Contenido({ searchParams }: { searchParams: Busqueda }) {
  const { v } = await searchParams;
  // Acepta ?v=a,b y también ?v=a&v=b (lo que envía el formulario)
  const pedidos = [...new Set((Array.isArray(v) ? v : [v ?? ""]).flatMap((x) => x.split(",")).filter((x) => UUID.test(x)))].slice(0, MAXIMO);
  const todas = await versionesParaComparar();
  const elegidas = pedidos.flatMap((id) => todas.filter((x) => x.id === id));
  const modelos = [...new Map(todas.map((x) => [x.modelo.id, x.modelo.linea])).entries()];

  const filas: [string, (x: VersionComparable) => React.ReactNode][] = [
    ["Precio de hoy", (x) => (x.precio ? <b className="text-[17px] whitespace-nowrap">{plata(x.precio)}</b> : <span className="text-azul-texto">A consultar</span>)],
    ["Bono de marca", (x) => (x.precio && x.base && x.base > x.precio ? <span className="font-semibold whitespace-nowrap text-ok">{plata(x.base - x.precio)}</span> : "—")],
    ["Transmisión", (x) => (x.transmision ? TRANSMISIONES[x.transmision].replace(/^./, (l) => l.toUpperCase()) : "—")],
    ["Combustible", (x) => (x.modelo.combustible ? COMBUSTIBLE_TEXTO[x.modelo.combustible] : "—")],
    ["Tipo", (x) => TIPO_TEXTO[x.modelo.tipo]],
    ["Puestos", (x) => x.modelo.puestos],
    ["Motor", (x) => x.modelo.motor ?? "—"],
  ];

  return (
    <>
      <form action="/comparar" className="mt-5 grid gap-2.5 rounded-xl border border-linea bg-superficie p-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
        {Array.from({ length: MAXIMO }, (_, i) => (
          <label key={i} className="text-sm">
            <span className="mb-1 block font-semibold">Versión {i + 1}</span>
            <select name="v" defaultValue={elegidas[i]?.id ?? ""} className="min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-2.5 text-[15px]">
              <option value="">{i < 2 ? "Elige una versión" : "Opcional"}</option>
              {modelos.map(([id, linea]) => (
                <optgroup key={id} label={linea}>
                  {todas.filter((x) => x.modelo.id === id).map((x) => (
                    <option key={x.id} value={x.id}>
                      {etiqueta(x)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        ))}
        <button className="min-h-11 rounded-lg bg-azul px-5 font-semibold text-white hover:bg-azul-hover">Comparar</button>
      </form>

      {elegidas.length < 2 ? (
        <p className="mt-6 rounded-xl border border-dashed border-linea-2 px-4 py-8 text-center text-texto-2">Elige al menos dos versiones para verlas lado a lado.</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-linea bg-superficie">
          <table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
            <caption className="sr-only">Comparación de {elegidas.map(etiqueta).join(", ")}</caption>
            <thead>
              <tr className="border-b border-linea">
                <th scope="col" className="sticky left-0 z-[1] w-28 bg-superficie px-3 py-3.5 text-sm font-semibold text-texto-2 sm:w-36 sm:px-4">
                  <span className="sr-only">Característica</span>
                </th>
                {elegidas.map((x) => (
                  <th key={x.id} scope="col" className="min-w-40 px-4 py-3.5 align-top">
                    <span className="font-display block text-2xl leading-tight font-bold">{x.modelo.linea}</span>
                    <span className="font-semibold">{x.nombre}</span>
                    {x.nuevoPrecio && <span className="ml-1.5 rounded bg-cielo px-1.5 py-0.5 text-xs font-semibold text-azul-texto">Nuevo precio</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map(([nombre, celda]) => (
                <tr key={nombre} className="border-b border-linea last:border-b-0">
                  <th scope="row" className="sticky left-0 z-[1] bg-superficie px-3 py-3 text-sm font-semibold text-texto-2 sm:px-4">
                    {nombre}
                  </th>
                  {elegidas.map((x) => (
                    <td key={x.id} className="px-4 py-3">
                      {celda(x)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className="sticky left-0 z-[1] bg-superficie px-3 py-3.5 sm:px-4">
                  <span className="sr-only">Acciones</span>
                </th>
                {elegidas.map((x) => (
                  <td key={x.id} className="px-4 py-3.5">
                    <div className="flex flex-col items-start gap-1.5">
                      <Link href={`/credito?origen=catalogo&linea=${encodeURIComponent(x.modelo.linea)}`} className="flex min-h-11 items-center rounded-lg bg-azul px-3.5 text-sm font-semibold text-white hover:bg-azul-hover">
                        Solicitar crédito
                      </Link>
                      <Link href={`/modelo/${x.modelo.slug}`} className="text-sm font-semibold text-azul-texto underline-offset-2 hover:underline">
                        Ver el {x.modelo.linea}
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {elegidas.length >= 2 && (
        <p className="mt-2 text-[13px] text-texto-2">Precios con IVA. Confirma la versión y el equipamiento con tu asesora antes de decidir.</p>
      )}
    </>
  );
}
