import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { colorDe } from "@/componentes/Carro";
import { enlaceWhatsapp, plata } from "@/lib/formato";
import { datosAsesora, modeloPorSlug } from "@/modulos/catalogo/consultas";
import { fechaLarga, TIPO_TEXTO } from "../../textos";
import { SelectorColor } from "./SelectorColor";
import { Galeria } from "./Galeria";
import { atributosFoto } from "@/modulos/fotos/fotos";

type Params = Promise<{ slug: string }>;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Título y vista previa para cuando Natalia comparta el enlace de un modelo */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const m = SLUG.test(slug) ? await modeloPorSlug(slug) : null;
  // Los buscadores reciben los metadatos antes que la página: así obtienen un 404 real
  if (!m) notFound();
  const titulo = `Suzuki ${m.linea} con Natalia | Fersautos Cúcuta`;
  const descripcion = m.precio ? `Desde ${plata(m.precio)}. ${m.descripcion ?? ""}` : (m.descripcion ?? `Cotiza tu Suzuki ${m.linea}.`);
  return { title: titulo, description: descripcion, openGraph: { title: `Suzuki ${m.linea}`, description: descripcion, locale: "es_CO" } };
}

export default function FichaModelo({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-6xl px-5">
      <Link href="/#modelos" className="inline-block py-1.5 font-semibold text-azul-texto">
        ‹ Todos los modelos
      </Link>
      <Suspense fallback={<p className="py-10 text-texto-2">Cargando…</p>}>
        <Contenido params={params} />
      </Suspense>
    </main>
  );
}

async function Contenido({ params }: { params: Params }) {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const [m, asesora] = await Promise.all([modeloPorSlug(slug), datosAsesora()]);
  if (!m || !asesora) notFound();

  const mensaje = `Hola ${asesora.primerNombre}, me interesa el Suzuki ${m.linea}. ¿Me das más información?`;
  const ficha: [string, string | number | null][] = [
    ["Motor", m.motor],
    ["Transmisión", m.transmision],
    ["Puestos", m.puestos],
    ["Tipo", TIPO_TEXTO[m.tipo]],
  ];

  return (
    <div className="mt-2.5 grid items-start gap-5 md:grid-cols-[1.25fr_1fr] md:gap-8">
      {m.fotos.length ? (
        <Galeria linea={m.linea} fotos={m.fotos.map((f) => atributosFoto(f.clave, "(min-width: 768px) 55vw, 100vw"))} />
      ) : (
        <SelectorColor tipo={m.tipo} colorInicial={colorDe(m.slug)} />
      )}
      <div>
        <h1 className="font-display text-[clamp(44px,8vw,68px)] leading-[.95] font-extrabold">{m.linea}</h1>
        <p className="mt-1 text-[17px] text-texto-2">
          {TIPO_TEXTO[m.tipo]}, {m.puestos} puestos
        </p>
        {m.descripcion && <p className="mt-3.5">{m.descripcion}</p>}

        <div className="mt-5 rounded-xl border border-linea bg-superficie p-4">
          {m.precio ? (
            <>
              <small className="text-sm text-texto-2">Desde</small>
              <b className="font-display block text-[34px] leading-tight">{plata(m.precio)}</b>
              <small className="text-sm text-texto-2">Precio con IVA, actualizado el {fechaLarga(m.actualizado!)}</small>
            </>
          ) : (
            <>
              <b className="font-display block text-[26px] leading-tight">Precio a consultar</b>
              <small className="text-sm text-texto-2">Los precios cambian seguido. Escríbeme y te doy el valor de hoy.</small>
            </>
          )}
          {m.promocion && (
            <p className="mt-2.5 rounded-lg bg-senal-fondo px-3 py-2.5 text-[15px] text-senal">
              {m.promocion.valorBono ? `${m.promocion.descripcion}: ${plata(m.promocion.valorBono)}` : m.promocion.descripcion}, válido hasta el{" "}
              {fechaLarga(new Date(m.promocion.hasta + "T12:00:00"))}.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <Link
            href={`/credito?origen=catalogo&linea=${encodeURIComponent(m.linea)}`}
            className="flex min-h-12 items-center justify-center rounded-xl bg-azul px-5 font-semibold text-white hover:bg-azul-hover"
          >
            Solicitar crédito para el {m.linea}
          </Link>
          {asesora.whatsapp && (
            <a
              href={enlaceWhatsapp(asesora.whatsapp, mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center rounded-xl border border-linea-2 bg-superficie px-5 font-semibold"
            >
              {m.precio ? "Preguntar por WhatsApp" : "Cotizar por WhatsApp"}
            </a>
          )}
        </div>

        <dl className="mt-5.5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-linea bg-linea">
          {ficha
            .filter(([, v]) => v !== null && v !== "")
            .map(([k, v]) => (
              <div key={k} className="bg-superficie px-3.5 py-3">
                <dt className="text-[13px] text-texto-2">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
        </dl>
        <p className="mt-2 text-[13px] text-texto-2">Ficha de referencia. Confirma la versión y el equipamiento con {asesora.primerNombre}.</p>
      </div>
    </div>
  );
}
