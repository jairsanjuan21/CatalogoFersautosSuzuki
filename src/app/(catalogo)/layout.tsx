import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { datosAsesora } from "@/modulos/catalogo/consultas";
import { enlaceWhatsapp } from "@/lib/formato";

const ICONO_WHATSAPP = (
  <svg viewBox="0 0 24 24" aria-hidden className="size-[22px] flex-none fill-none stroke-current stroke-[1.9] [stroke-linecap:round] [stroke-linejoin:round]">
    <path d="M4 20l1.4-4A8 8 0 1112 20a8 8 0 01-4-1z" />
  </svg>
);

/** Tema cálido (propuesta C) solo para el catálogo: ver .catalogo en globals.css */
export default function LayoutCatalogo({ children }: { children: React.ReactNode }) {
  return (
    <div className="catalogo">
      <header className="sticky top-0 z-30 border-b border-linea/70 bg-fondo/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/" className="font-display text-[26px] leading-none font-bold text-tinta">
            Fersautos
            <small className="block font-panel text-[13px] font-medium text-texto-2">Suzuki en Cúcuta</small>
          </Link>
          <nav className="flex items-center gap-6 text-[15px] font-semibold text-texto-4">
            <Link href="/#modelos" className="hidden hover:text-azul-texto sm:inline">Modelos</Link>
            <Link href="/#credito" className="hidden hover:text-azul-texto md:inline">Cómo te acompaño</Link>
            <Link href="/credito?origen=catalogo" className="cat-brillo flex min-h-12 items-center rounded-xl bg-azul px-4.5 font-semibold text-white hover:bg-azul-hover">
              Solicitar crédito
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <Suspense>
        <Pie />
      </Suspense>
    </div>
  );
}

async function Pie() {
  await connection();
  const a = await datosAsesora();
  if (!a) return null;
  const whatsapp = a.whatsapp ? enlaceWhatsapp(a.whatsapp, `Hola ${a.primerNombre}, quiero información sobre los Suzuki.`) : null;
  return (
    <>
      {whatsapp && (
        <section className="cat-al-ver mx-auto mt-16 max-w-6xl px-5">
          <div className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[28px] bg-[#14213d] px-7 py-9 text-white md:px-11">
            <div aria-hidden className="cat-mancha absolute -top-24 -right-16 size-72 rounded-full bg-[#b4380f]/35 blur-2xl" />
            <div className="relative">
              <h2 className="font-display text-[clamp(28px,4vw,38px)] leading-tight font-semibold">¿Ya sabes cuál te gusta?</h2>
              <p className="mt-1.5 text-[17px] text-[#cfd6e6]">Cuéntame y yo te cotizo al día.</p>
            </div>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="cat-pulso relative flex min-h-14 items-center gap-2.5 rounded-2xl bg-whatsapp px-7 text-[17px] font-bold text-whatsapp-texto">
              {ICONO_WHATSAPP}
              Escríbeme por WhatsApp
            </a>
          </div>
        </section>
      )}
      <footer className="mt-14 border-t border-linea py-8 pb-28 text-sm text-texto-2">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-5 px-5">
          <p>
            <strong className="font-display text-xl font-semibold text-tinta">{a.nombre}</strong>
            <br />
            Asesora comercial Suzuki
            <br />
            Fersautos, sede {a.sede}, {a.ciudad}
          </p>
          <p className="max-w-[52ch]">
            Precios en pesos colombianos con IVA incluido, sujetos a cambio sin previo aviso. Las imágenes son de referencia. El crédito está
            sujeto a la aprobación de la entidad financiera.
          </p>
        </div>
        <div className="mx-auto mt-4 flex max-w-6xl justify-between gap-3 px-5 text-[13px]">
          <Link href="/galeria" className="hover:text-texto">Familia Suzuki</Link>
          {/* Discreto a propósito: la seguridad está en el inicio de sesión, no en esconder el enlace */}
          <Link href="/ingresar" className="hover:text-texto">Acceso asesora</Link>
        </div>
      </footer>
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="cat-pulso fixed right-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-20 flex min-h-[54px] items-center gap-2 rounded-full bg-whatsapp px-5 font-bold text-whatsapp-texto shadow-[0_14px_30px_-10px_rgb(6_36_15/0.55)]"
        >
          {ICONO_WHATSAPP}
          Escríbeme
        </a>
      )}
    </>
  );
}
