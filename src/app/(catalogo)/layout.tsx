import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { datosAsesora } from "@/modulos/catalogo/consultas";
import { enlaceWhatsapp } from "@/lib/formato";

export default function LayoutCatalogo({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <Link href="/" className="font-display text-2xl leading-none font-extrabold text-azul-texto">
          Fersautos
          <small className="block font-sans text-[13px] font-medium text-texto-2">Suzuki en Cúcuta</small>
        </Link>
        <Link href="/credito?origen=catalogo" className="flex min-h-12 items-center rounded-xl bg-azul px-4.5 font-semibold text-white hover:bg-azul-hover">
          Solicitar crédito
        </Link>
      </header>
      {children}
      <Suspense>
        <Pie />
      </Suspense>
    </>
  );
}

async function Pie() {
  await connection();
  const a = await datosAsesora();
  if (!a) return null;
  return (
    <>
      <footer className="mt-14 border-t border-linea py-6 pb-28 text-sm text-texto-2">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-5 px-5">
          <p>
            <strong className="font-display text-lg text-texto">{a.nombre}</strong>
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
      {a.whatsapp && (
        <a
          href={enlaceWhatsapp(a.whatsapp, `Hola ${a.primerNombre}, quiero información sobre los Suzuki.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-20 flex min-h-[52px] items-center gap-2 rounded-full bg-azul px-4.5 font-semibold text-white shadow-lg"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current stroke-[1.8]">
            <path d="M4 20l1.4-4A8 8 0 1112 20a8 8 0 01-4-1z" />
          </svg>
          Escríbeme
        </a>
      )}
    </>
  );
}
