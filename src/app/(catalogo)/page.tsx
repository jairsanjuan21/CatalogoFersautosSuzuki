import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { datosAsesora, modelosCatalogo } from "@/modulos/catalogo/consultas";
import { atributosFoto } from "@/modulos/fotos/fotos";
import { enlaceWhatsapp, nombreVersion } from "@/lib/formato";
import { Modelos, type TarjetaModelo } from "./Modelos";
import { FotosEntregas } from "./FotosEntregas";
import { fotosPublicas, fotosRecientes, SECCIONES } from "@/modulos/galeria/consultas";
import { FranjaEntregas } from "./FranjaEntregas";
import { textoPromocion, TIPO_TEXTO } from "./textos";

export const metadata: Metadata = {
  title: "Estrena tu Suzuki con Natalia | Fersautos Cúcuta",
  description: "Modelos Suzuki con precios actualizados y solicitud de crédito desde el celular. Fersautos, sede Diagonal Santander, Cúcuta.",
  openGraph: { title: "Estrena tu Suzuki con Natalia", description: "Mira los modelos y solicita tu crédito desde el celular.", type: "website", locale: "es_CO" },
};

export default function Inicio() {
  return (
    <main className="mx-auto max-w-6xl px-5">
      <Suspense fallback={<p className="py-10 text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </main>
  );
}

async function Contenido() {
  await connection();
  const [asesora, modelos, familia, clientes, recientes] = await Promise.all([
    datosAsesora(),
    modelosCatalogo(),
    fotosPublicas("familia", 6),
    fotosPublicas("clientes", 6),
    fotosRecientes(12),
  ]);
  if (!asesora) return <p className="py-10 text-senal">El catálogo aún no está configurado.</p>;

  const tarjetas: TarjetaModelo[] = modelos.map((m) => ({
    slug: m.slug,
    linea: m.linea,
    tipo: m.tipo,
    tipoTexto: TIPO_TEXTO[m.tipo],
    puestos: m.puestos,
    precio: m.precio,
    combustible: m.combustible,
    transmisiones: m.transmisiones,
    nuevoPrecio: m.nuevoPrecio,
    versionEntrada: m.versionEntrada ? nombreVersion(m.versionEntrada) : null,
    colores: m.colores.map(({ nombre, hex }) => ({ nombre, hex })),
    promocion: m.promocion ? textoPromocion(m.promocion) : null,
    foto: m.portada ? atributosFoto(m.portada) : null,
  }));
  const iniciales = asesora.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const whatsapp = asesora.whatsapp ? enlaceWhatsapp(asesora.whatsapp, `Hola ${asesora.primerNombre}, quiero información sobre los Suzuki.`) : null;
  const titular = "Estrena tu Suzuki conmigo, de principio a fin".split(" ");
  const sello = `ASESORA SUZUKI · FERSAUTOS · ${asesora.ciudad.toUpperCase()} ·`;
  const lineas = [...new Set(modelos.map((m) => m.linea))];

  return (
    <>
      {/* PORTADA: Natalia es la protagonista */}
      <section className="grid items-center gap-10 pt-6 pb-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-14 md:pt-10">
        <div className="relative mx-auto w-full max-w-[480px] md:order-none">
          <div aria-hidden className="cat-mancha absolute -inset-6 -z-0 rounded-[42%_58%_55%_45%/50%_45%_55%_50%] bg-linea" />
          <div className="cat-revela relative aspect-[4/5] overflow-hidden rounded-[28px] bg-cielo">
            {asesora.foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto optimizada en WebP con srcset
              <img {...atributosFoto(asesora.foto, "(min-width: 768px) 40vw, 100vw")} alt={`Foto de ${asesora.nombre}`} className="absolute inset-0 size-full object-cover" />
            ) : (
              <span aria-hidden className="absolute inset-0 grid place-items-center font-display text-[140px] font-semibold text-tinta/85">{iniciales}</span>
            )}
          </div>
          <div aria-hidden className="cat-sello absolute -top-6 right-1 size-24 rounded-full bg-acento md:-top-8 md:-right-10 md:size-36">
            <svg viewBox="0 0 100 100" className="size-full">
              <defs>
                <path id="circulo-sello" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" />
              </defs>
              <text fill="#fff" fontSize="7.6" fontWeight="700">
                <textPath href="#circulo-sello" textLength="234" lengthAdjust="spacing">{sello}</textPath>
              </text>
            </svg>
            {/* El centro no gira: solo el texto da vueltas */}
            <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto size-[34%] fill-none stroke-white stroke-[2.6] [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <div className="cat-flota absolute -bottom-5 left-4 max-w-[270px] rounded-2xl bg-superficie px-4.5 py-3.5 shadow-[0_18px_40px_-20px_rgb(20_33_61/0.5)] md:-right-6 md:left-auto">
            <strong className="block font-display text-xl font-semibold text-tinta">{asesora.nombre}</strong>
            <span className="text-sm text-texto-2">Asesora comercial Suzuki</span>
          </div>
        </div>

        <div>
          <p className="cat-entra mb-3.5 text-[15px] font-semibold text-azul-texto" style={{ animationDelay: "0.1s" }}>
            Hola, soy {asesora.primerNombre}
          </p>
          <h1 className="font-display text-[clamp(40px,6.4vw,76px)] leading-[1.02] font-semibold tracking-[-0.02em] text-tinta">
            {titular.map((palabra, i) => (
              <span key={i}>
                <span className="cat-palabra" style={{ animationDelay: `${0.25 + i * 0.08}s` }}>{palabra}</span>{" "}
              </span>
            ))}
          </h1>
          <p className="cat-entra mt-5 mb-7 max-w-[48ch] text-[19px] leading-relaxed text-texto-4" style={{ animationDelay: "0.9s" }}>
            Escoge tu carro, solicita el crédito desde el celular y yo te acompaño hasta el día de la entrega.
          </p>
          <div className="cat-entra flex flex-wrap gap-3" style={{ animationDelay: "1.05s" }}>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="cat-pulso relative flex min-h-14 items-center gap-2.5 rounded-2xl bg-whatsapp px-7 text-[17px] font-bold text-whatsapp-texto">
                <svg viewBox="0 0 24 24" aria-hidden className="size-[22px] fill-none stroke-current stroke-[1.9] [stroke-linecap:round] [stroke-linejoin:round]">
                  <path d="M4 20l1.4-4A8 8 0 1112 20a8 8 0 01-4-1z" />
                </svg>
                Escríbeme por WhatsApp
              </a>
            )}
            <Link href="/credito?origen=catalogo" className="cat-brillo flex min-h-14 items-center rounded-2xl bg-acento px-7 text-[17px] font-bold text-white hover:bg-acento-hover">
              Solicitar mi crédito
            </Link>
          </div>
          {asesora.frase && (
            <blockquote className="cat-entra mt-7 max-w-[46ch] border-l-0 font-display text-xl leading-snug text-texto-4 italic" style={{ animationDelay: "1.2s" }}>
              “{asesora.frase}”
            </blockquote>
          )}
          <p className="cat-entra mt-5 flex items-center gap-2 text-[15px] text-texto-2" style={{ animationDelay: "1.3s" }}>
            <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] flex-none fill-none stroke-current stroke-[1.8]">
              <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            Fersautos, sede {asesora.sede}, {asesora.ciudad}
          </p>
        </div>
      </section>

      {/* Cinta con los modelos que corre sin parar */}
      {lineas.length > 0 && (
        <div aria-hidden className="cat-cinta-caja relative -mx-5 mt-6 overflow-hidden border-y border-linea bg-tinta py-3.5 text-fondo md:mx-0 md:rounded-2xl">
          <div className="cat-cinta flex w-max">
            {[0, 1].map((copia) => (
              <div key={copia} className="flex">
                {[...lineas, ...lineas].map((l, i) => (
                  <span key={`${copia}-${i}`} className="flex items-center gap-6 pr-6 font-display text-2xl font-semibold whitespace-nowrap">
                    Suzuki {l}
                    <svg viewBox="0 0 10 10" className="size-2.5 fill-[var(--acento)]"><circle cx="5" cy="5" r="5" /></svg>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cat-al-ver">
        <FranjaEntregas nombre={asesora.primerNombre} fotos={recientes.map((f) => ({ id: f.id, pie: f.pie, ...atributosFoto(f.clave) }))} />
      </div>

      {/* MODELOS: banda blanca de borde a borde */}
      <section id="modelos" className="relative isolate mt-14 scroll-mt-20 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-y before:border-linea before:bg-superficie">
        <div className="relative py-14">
          <div className="cat-al-ver">
            <h2 className="font-display text-[clamp(34px,4.5vw,44px)] leading-[1.05] font-semibold text-tinta">Modelos disponibles</h2>
            <p className="mt-2 text-[17px] text-texto-2">Yo actualizo los precios. Si no ves el precio, escríbeme y te cotizo al día.</p>
          </div>
          <Modelos modelos={tarjetas} />
        </div>
      </section>

      <div className="cat-al-ver">
        <FotosEntregas id="familia" {...SECCIONES.familia} fotos={familia} verTodas />
      </div>
      <div className="cat-al-ver">
        <FotosEntregas id="clientes" {...SECCIONES.clientes} fotos={clientes} verTodas />
      </div>

      <section id="credito" className="mt-16 scroll-mt-20">
        <div className="cat-al-ver">
          <h2 className="font-display text-[clamp(34px,4.5vw,44px)] leading-[1.05] font-semibold text-tinta">Así te acompaño con el crédito</h2>
          <p className="mt-2 text-[17px] text-texto-2">Sin filas y sin papeleo en el concesionario.</p>
        </div>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ["Llenas la solicitud", "Desde el celular, en unos 8 minutos, con foto de tu cédula y tu firma."],
            ["Yo reviso y la radico", "Confirmo el valor de tu carro y envío tu solicitud a estudio de crédito."],
            ["Te aviso la respuesta", "Te contacto apenas la entidad financiera responda y coordinamos la entrega."],
          ].map(([titulo, texto], i) => (
            <li key={titulo} className="cat-al-ver group border-t-[3px] border-tinta pt-5">
              <span className="block font-display text-[56px] leading-none font-semibold text-acento transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-4deg]">{i + 1}</span>
              <strong className="mt-2 block font-display text-2xl font-semibold text-tinta">{titulo}</strong>
              <span className="mt-1.5 block text-base leading-relaxed text-texto-4">{texto}</span>
            </li>
          ))}
        </ol>
        <div className="cat-al-ver mt-8">
          <Link href="/credito?origen=catalogo" className="cat-brillo inline-flex min-h-14 items-center rounded-2xl bg-acento px-7 text-[17px] font-bold text-white hover:bg-acento-hover">
            Empezar mi solicitud
          </Link>
        </div>
      </section>
    </>
  );
}
