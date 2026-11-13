"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonSalir } from "@/componentes/BotonSalir";
import { SelectorTema } from "@/componentes/SelectorTema";

const ICONOS = {
  inicio: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  solicitudes: "M7 3h10v18H7zM10 8h4M10 12h4M10 16h2",
  precios: "M3 12V4h8l10 10-8 8zM7.5 8.5h.01",
  compartir: "M6 12m-2.5 0a2.5 2.5 0 105 0 2.5 2.5 0 10-5 0M18 6m-2.5 0a2.5 2.5 0 105 0 2.5 2.5 0 10-5 0M18 18m-2.5 0a2.5 2.5 0 105 0 2.5 2.5 0 10-5 0M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6",
  perfil: "M12 8m-4 0a4 4 0 108 0 4 4 0 10-8 0M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
  ventas: "M4 20V10M10 20V4M16 20v-7M22 20H2",
};

const ENLACES = [
  { href: "/panel", texto: "Inicio", icono: ICONOS.inicio },
  { href: "/panel/solicitudes", texto: "Solicitudes", icono: ICONOS.solicitudes },
  { href: "/panel/ventas", texto: "Ventas", icono: ICONOS.ventas },
  // "Catálogo" agrupa Precios, Modelos y Galería (ver SubnavCatalogo); abre en Precios, lo de todos los días
  { href: "/panel/precios", texto: "Catálogo", icono: ICONOS.precios, secciones: ["/panel/precios", "/panel/catalogo", "/panel/galeria"] },
  { href: "/panel/compartir", texto: "Compartir", icono: ICONOS.compartir },
  // En el celular, Perfil va en la barra superior para que la inferior no tenga 6 botones
  { href: "/panel/perfil", texto: "Perfil", icono: ICONOS.perfil, soloEscritorio: true },
];

/** La barra en sí. Sin ruta (mientras carga) no resalta ninguna sección. */
export function BarraNavegacion({ ruta }: { ruta: string | null }) {
  const activo = (e: (typeof ENLACES)[number]) =>
    ruta === null ? false : e.href === "/panel" ? ruta === "/panel" : ("secciones" in e && e.secciones ? e.secciones : [e.href]).some((h) => ruta.startsWith(h));
  return (
    <nav
      aria-label="Secciones del panel"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-linea bg-superficie pb-[env(safe-area-inset-bottom)] lg:inset-y-0 lg:right-auto lg:w-60 lg:flex-col lg:gap-0.5 lg:border-t-0 lg:border-r lg:p-3.5 lg:pt-5"
    >
      <div className="hidden items-center gap-2.5 px-2 pb-5 lg:flex">
        <span aria-hidden className="grid size-9 place-items-center rounded-[10px] bg-heroe text-base font-extrabold text-white">F</span>
        <span className="flex flex-col leading-tight">
          <strong className="text-[15px]">Fersautos</strong>
          <span className="text-xs text-texto-3">Panel de Natalia</span>
        </span>
      </div>
      {ENLACES.map((e) => (
        <Link
          key={e.href}
          href={e.href}
          aria-current={activo(e) ? "page" : undefined}
          className={`${"soloEscritorio" in e ? "hidden lg:flex" : "flex"} flex-1 flex-col items-center gap-0.5 px-0.5 pt-2 pb-2.5 text-xs text-texto-2 aria-[current=page]:font-semibold aria-[current=page]:text-azul-texto lg:flex-none lg:flex-row lg:gap-3 lg:rounded-[10px] lg:px-3 lg:py-2.5 lg:text-sm lg:font-medium lg:text-texto-4 lg:hover:bg-superficie-2 lg:aria-[current=page]:bg-cielo lg:aria-[current=page]:text-azul-texto`}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-[22px] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]">
            <path d={e.icono} />
          </svg>
          {e.texto}
        </Link>
      ))}
      <div className="mt-auto hidden flex-col gap-2 border-t border-linea pt-3 lg:flex">
        <SelectorTema variante="texto" />
        <BotonSalir variante="lateral" />
      </div>
    </nav>
  );
}

/**
 * usePathname() lee la URL de la petición, que solo existe en tiempo de ejecución.
 * Con Cache Components eso debe ir dentro de <Suspense> (ver layout.tsx), y mientras
 * tanto se muestra la misma barra sin sección resaltada.
 */
export function Navegacion() {
  return <BarraNavegacion ruta={usePathname()} />;
}
