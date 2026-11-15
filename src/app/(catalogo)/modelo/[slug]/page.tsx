import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { enlaceWhatsapp, nombreVersion, plata, TRANSMISIONES } from "@/lib/formato";
import { datosAsesora, modeloPorSlug } from "@/modulos/catalogo/consultas";
import { COMBUSTIBLE_TEXTO, fechaLarga, textoPromocion, TIPO_TEXTO } from "../../textos";
import { Muestras, SelectorColor } from "./SelectorColor";
import { Galeria } from "./Galeria";
import { Video } from "./Video";
import { Contador, Detalles, type Pestana } from "./Detalles";
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
  // Para Google y la vista previa al compartir: la descripción puede ser larga, aquí va un resumen
  const resumen = (m.descripcion ?? "").replace(/\s+/g, " ").trim();
  const corto = resumen.length > 150 ? resumen.slice(0, resumen.lastIndexOf(" ", 147)) + "…" : resumen;
  const descripcion = m.precio ? `Desde ${plata(m.precio)}. ${corto}` : corto || `Cotiza tu Suzuki ${m.linea}.`;
  return { title: titulo, description: descripcion, openGraph: { title: `Suzuki ${m.linea}`, description: descripcion, locale: "es_CO" } };
}

export default function FichaModelo({ params }: { params: Params }) {
  return (
    <main>
      <div className="mx-auto max-w-6xl px-5">
        <Link href="/#modelos" className="inline-flex min-h-11 items-center font-semibold text-azul-texto">
          ‹ Todos los modelos
        </Link>
      </div>
      <Suspense fallback={<p className="mx-auto max-w-6xl px-5 py-10 text-texto-2">Cargando…</p>}>
        <Contenido params={params} />
      </Suspense>
    </main>
  );
}

/** Íconos de la ficha técnica (trazo de 24×24) */
const ICONOS = {
  motor: "M4 10h3l2-3h6l2 3h3v7h-3l-2 2H9l-2-2H4z",
  combustible: "M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16M3 21h14M15 9h2a2 2 0 012 2v6a1.5 1.5 0 003 0V8l-3-3M8 7h4",
  transmision: "M6 4v16M18 4v8H6M12 4v16",
  puestos: "M8 11a3 3 0 100-6 3 3 0 000 6zM3 20a5 5 0 0110 0M16 11a3 3 0 100-6M21 20a5 5 0 00-6-4.9",
  baul: "M3 9h18v10H3zM7 9V6h10v3",
  tipo: "M3 16v-4l2-5h14l2 5v4zM6 16v2M18 16v2M7 12.5h.01M17 12.5h.01",
} as const;

async function Contenido({ params }: { params: Params }) {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const [m, asesora] = await Promise.all([modeloPorSlug(slug), datosAsesora()]);
  if (!m || !asesora) notFound();

  const mensaje = `Hola ${asesora.primerNombre}, me interesa el Suzuki ${m.linea}. ¿Me das más información?`;

  // Todo lo que Natalia llena en la ficha del panel; lo vacío no se muestra
  type Dato = { k: string; icono: keyof typeof ICONOS; v: React.ReactNode; texto: string | number | null };
  const datos: Dato[] = [
    { k: "Motor", icono: "motor", texto: m.motor, v: m.motor },
    { k: "Combustible", icono: "combustible", texto: m.combustible, v: m.combustible ? COMBUSTIBLE_TEXTO[m.combustible] : null },
    { k: "Transmisión", icono: "transmision", texto: m.transmision, v: m.transmision },
    {
      k: "Capacidad de pasajeros",
      icono: "puestos",
      texto: m.puestos,
      v: (
        <>
          <Contador valor={m.puestos} /> <span className="font-panel text-base font-medium text-[#c3cbe0]">puestos</span>
        </>
      ),
    },
    { k: "Capacidad del baúl", icono: "baul", texto: m.baul, v: m.baul },
    { k: "Tipo", icono: "tipo", texto: m.tipo, v: TIPO_TEXTO[m.tipo] },
  ];
  const ficha = datos.filter((d) => d.texto !== null && d.texto !== "");

  const medidas: [string, number | null][] = [
    ["Largo", m.largoMm],
    ["Ancho", m.anchoMm],
    ["Alto", m.altoMm],
    ["Distancia entre ejes", m.entreEjesMm],
    ["Altura libre al piso", m.alturaPisoMm],
  ];
  const hayMedidas = medidas.some(([, v]) => v);

  const fechas = m.versiones.flatMap((v) => (v.actualizado && !v.deLista ? [v.actualizado.getTime()] : []));
  const actualizado = fechas.length ? new Date(Math.max(...fechas)) : null;

  const sellos = (
    <div className="absolute inset-x-4 top-4 z-10 flex flex-wrap justify-between gap-2">
      {m.combustible === "hibrido" ? <span className="rounded-lg bg-ok-fondo px-2.5 py-1 text-[13px] font-bold text-ok">Híbrido</span> : <span />}
      {m.promocion && <span className="rounded-lg bg-acento px-2.5 py-1 text-[13px] font-bold text-white shadow-sm">{textoPromocion(m.promocion)}</span>}
    </div>
  );

  const pestanas: Pestana[] = [];
  if (m.seguridad.length)
    pestanas.push({
      id: "seguridad",
      titulo: "Seguridad y tecnología",
      contenido: (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {m.seguridad.map((s, i) => (
            <li key={s} className="cat-entra flex items-center gap-3 rounded-2xl border border-linea bg-superficie px-4.5 py-4 text-[17px] font-semibold" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="cat-icono grid size-8 flex-none place-items-center rounded-full bg-ok-fondo" style={{ animationDelay: `${i * 60 + 150}ms` }}>
                <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-ok stroke-[2.8] [stroke-linecap:round] [stroke-linejoin:round]">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              {s}
            </li>
          ))}
        </ul>
      ),
    });
  if (hayMedidas)
    pestanas.push({
      id: "medidas",
      titulo: "Dimensiones",
      contenido: (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {medidas
            .filter(([, v]) => v)
            .map(([k, v], i) => (
              <div key={k} className="cat-entra rounded-2xl border border-linea bg-superficie p-4.5" style={{ animationDelay: `${i * 60}ms` }}>
                <dt className="text-sm text-texto-2">{k}</dt>
                <dd className="mt-1 font-display text-[28px] leading-tight font-semibold text-tinta">
                  <Contador valor={v!} /> <span className="font-panel text-[15px] font-normal text-texto-2">mm</span>
                </dd>
              </div>
            ))}
        </dl>
      ),
    });
  if (m.otras.length || m.entrada)
    pestanas.push({
      id: "versiones",
      titulo: "Versiones y precios",
      contenido: (
        <div>
          <ul className="flex flex-col gap-2.5">
            {[...(m.entrada ? [m.entrada] : []), ...m.otras].map((v, i) => (
              <li key={v.id} className="cat-entra flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-linea bg-superficie px-5 py-4" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="text-[17px] font-semibold">
                  {v.nombre}
                  {v.transmision && <span className="ml-1.5 text-[15px] font-normal text-texto-2">· {TRANSMISIONES[v.transmision]}</span>}
                  {v.nuevoPrecio && <Etiqueta />}
                </span>
                <Precio v={v} />
              </li>
            ))}
          </ul>
          <NotaPrecios m={m} actualizado={actualizado} />
        </div>
      ),
    });
  // Con fotos reales los colores ya no cambian la imagen: se listan aquí con su nombre
  if (m.fotos.length && m.colores.length)
    pestanas.push({ id: "colores", titulo: "Colores", contenido: <Muestras colores={m.colores} /> });

  return (
    <>
      <div className="mx-auto mt-1.5 grid max-w-6xl items-center gap-8 px-5 md:grid-cols-[1.3fr_1fr] md:gap-11">
        <div className="cat-entra">
          {m.fotos.length ? (
            <Galeria linea={m.linea} sellos={sellos} fotos={m.fotos.map((f) => atributosFoto(f.clave, "(min-width: 768px) 55vw, 100vw"))} />
          ) : (
            <SelectorColor tipo={m.tipo} colores={m.colores} sellos={sellos} />
          )}
        </div>

        <div>
          <p className="cat-entra text-[15px] font-semibold text-azul-texto" style={{ animationDelay: "0.1s" }}>
            {TIPO_TEXTO[m.tipo]} · {m.puestos} puestos
          </p>
          <h1 className="cat-entra mt-1.5 font-display text-[clamp(52px,7vw,84px)] leading-[.95] font-semibold tracking-[-0.02em] text-tinta" style={{ animationDelay: "0.2s" }}>
            {m.linea}
          </h1>
          {m.descripcion && (
            <p className="cat-entra mt-3.5 text-lg leading-relaxed whitespace-pre-line text-texto-4" style={{ animationDelay: "0.3s" }}>
              {m.descripcion}
            </p>
          )}

          <div className="cat-entra mt-5 rounded-[20px] border border-linea bg-superficie p-5" style={{ animationDelay: "0.4s" }}>
            {m.entrada ? (
              <>
                <small className="text-sm text-texto-2">
                  Versión {nombreVersion(m.entrada)}
                  {m.entrada.nuevoPrecio && <Etiqueta />}
                </small>
                <Precio v={m.entrada} grande />
              </>
            ) : m.precio ? (
              <>
                <small className="text-sm text-texto-2">Desde</small>
                <b className="block font-display text-[40px] leading-tight text-tinta">{plata(m.precio)}</b>
              </>
            ) : (
              <>
                <b className="block font-display text-[30px] leading-tight text-tinta">Precio a consultar</b>
                <small className="text-sm text-texto-2">Los precios cambian seguido. Escríbeme y te doy el valor de hoy.</small>
              </>
            )}
            {m.otras.length > 0 && (
              <a href="#detalles" className="mt-2 inline-block text-[15px] font-semibold text-azul-texto hover:underline">
                Ver {m.otras.length === 1 ? "la otra versión" : `las otras ${m.otras.length} versiones`} ↓
              </a>
            )}
            {!m.otras.length && <NotaPrecios m={m} actualizado={actualizado} />}
            {m.promocion && (
              <p className="mt-3 rounded-xl bg-senal-fondo px-3.5 py-2.5 text-[15px] text-senal">
                {m.promocion.valorBono ? `${m.promocion.descripcion}: ${plata(m.promocion.valorBono)}` : m.promocion.descripcion}, válido hasta el{" "}
                {fechaLarga(new Date(m.promocion.hasta + "T12:00:00"))}.
              </p>
            )}
          </div>

          <div className="cat-entra mt-4 flex flex-col gap-2.5" style={{ animationDelay: "0.5s" }}>
            <Link
              href={`/credito?origen=catalogo&linea=${encodeURIComponent(m.linea)}`}
              className="cat-brillo flex min-h-14 items-center justify-center rounded-2xl bg-acento px-5 text-[17px] font-bold text-white hover:bg-acento-hover"
            >
              Solicitar crédito para el {m.linea}
            </Link>
            {asesora.whatsapp && (
              <a
                href={enlaceWhatsapp(asesora.whatsapp, mensaje)}
                target="_blank"
                rel="noopener noreferrer"
                className="cat-pulso relative flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-whatsapp px-5 text-[17px] font-bold text-whatsapp-texto"
              >
                <svg viewBox="0 0 24 24" aria-hidden className="size-[22px] fill-none stroke-current stroke-[1.9] [stroke-linecap:round] [stroke-linejoin:round]">
                  <path d="M4 20l1.4-4A8 8 0 1112 20a8 8 0 01-4-1z" />
                </svg>
                {m.precio ? "Preguntar" : "Cotizar"}
                <span className="hidden sm:inline">{m.precio ? ` a ${asesora.primerNombre}` : ` con ${asesora.primerNombre}`}</span> por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* FICHA TÉCNICA: justo debajo, en una franja que no se pierde */}
      {ficha.length > 0 && (
        <section aria-labelledby="titulo-ficha" className="mt-12 bg-[#14213d] text-white">
          <div className="mx-auto max-w-6xl px-5 py-10">
            <h2 id="titulo-ficha" className="font-display text-[34px] font-semibold">Ficha técnica</h2>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {ficha.map((d, i) => (
                <div
                  key={d.k}
                  className="cat-entra flex items-center gap-4 rounded-[20px] bg-[#1a2949] p-4 transition duration-300 hover:-translate-y-1.5 hover:bg-[#1f3159] sm:block sm:p-5.5"
                  style={{ animationDelay: `${0.5 + i * 0.08}s` }}
                >
                  <span className="cat-icono grid size-11 flex-none place-items-center rounded-xl bg-[#b4380f] sm:size-12 sm:rounded-[14px]" style={{ animationDelay: `${0.6 + i * 0.08}s` }}>
                    <svg viewBox="0 0 24 24" aria-hidden className="size-[26px] fill-none stroke-white stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]">
                      <path d={ICONOS[d.icono]} />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[13px] text-[#c3cbe0] sm:mt-4 sm:text-sm">{d.k}</dt>
                  <dd className={`mt-0.5 font-display leading-tight font-semibold text-balance ${typeof d.texto === "string" && d.texto.length > 18 ? "text-[19px] sm:text-[22px]" : "text-[22px] sm:text-[30px]"}`}>{d.v}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <div id="detalles" className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-10">
        <Detalles pestanas={pestanas} />
        {m.videoYoutube && (
          <section className="cat-al-ver mt-12">
            <h2 className="mb-4 font-display text-[34px] font-semibold text-tinta">Conócelo en video</h2>
            <Video id={m.videoYoutube} titulo={`Suzuki ${m.linea}`} />
          </section>
        )}
      </div>
    </>
  );
}

/** Nota de precios: fecha de actualización y aviso de precio de lista si aplica */
function NotaPrecios({ m, actualizado }: { m: { versiones: { precio: number | null; deLista: boolean }[] }; actualizado: Date | null }) {
  if (!m.versiones.some((v) => v.precio)) return null;
  return (
    <p className="mt-3 text-[13px] text-texto-2">
      Precios con IVA{actualizado ? `, actualizados el ${fechaLarga(actualizado)}` : ""}.
      {m.versiones.some((v) => v.deLista) && " Los marcados como precio de lista son los de Suzuki antes de bonos: pregunta por el valor de hoy."}
    </p>
  );
}

const Etiqueta = () => <span className="ml-1.5 inline-block rounded bg-cielo px-1.5 py-0.5 align-middle text-xs font-semibold whitespace-nowrap text-azul-texto">Nuevo precio</span>;

/** Precio de una versión: con el de lista tachado y el bono si lo hay, o "precio de lista" si es el único que hay */
function Precio({ v, grande }: { v: { precio: number | null; base: number | null; deLista: boolean }; grande?: boolean }) {
  if (!v.precio) return <span className="text-sm whitespace-nowrap text-azul-texto">A consultar</span>;
  return (
    <span className={grande ? "block" : "text-right whitespace-nowrap"}>
      {v.base && <s className="mr-1.5 text-sm text-texto-2">{plata(v.base)}</s>}
      <span className={grande ? "font-display text-[40px] leading-tight font-semibold text-tinta" : "font-semibold"}>{plata(v.precio)}</span>
      {v.base && <small className="block text-[13px] font-semibold text-ok">Bono de marca {plata(v.base - v.precio)}</small>}
      {v.deLista && <small className="block text-[13px] text-texto-2">Precio de lista</small>}
    </span>
  );
}
