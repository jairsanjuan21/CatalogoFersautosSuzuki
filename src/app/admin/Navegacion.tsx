"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonSalir } from "@/componentes/BotonSalir";

const ENLACES = [
  { href: "/admin", texto: "Resumen", icono: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" },
  { href: "/admin/catalogo", texto: "Catálogo", icono: "M3 15l2-6q1-3 4-3h6q3 0 4 3l2 6v4H3zM7.5 16h.01M16.5 16h.01" },
  { href: "/admin/configuracion", texto: "Configuración", icono: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4" },
  { href: "/admin/usuarios", texto: "Usuarios", icono: "M9 8m-3.5 0a3.5 3.5 0 107 0 3.5 3.5 0 10-7 0M2 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5" },
  { href: "/admin/auditoria", texto: "Auditoría", icono: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4" },
  { href: "/admin/sistema", texto: "Sistema", icono: "M3 12h4l3-7 4 14 3-7h4" },
  { href: "/admin/datos-personales", texto: "Datos personales", icono: "M4 10h16v11H4zM8 10V7a4 4 0 018 0v3" },
];

export function BarraAdmin({ ruta }: { ruta: string | null }) {
  const activo = (href: string) => (ruta === null ? false : href === "/admin" ? ruta === "/admin" : ruta.startsWith(href));
  return (
    <nav aria-label="Administración" className="sticky top-0 z-20 border-b border-linea bg-superficie lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-62 lg:flex-col lg:border-r lg:border-b-0 lg:p-3.5 lg:pt-5">
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2 lg:px-2 lg:pt-0 lg:pb-5">
        <span aria-hidden className="grid size-9 place-items-center rounded-[10px] bg-heroe text-base font-extrabold text-white">F</span>
        <span className="flex flex-col leading-tight">
          <strong className="text-[15px]">Fersautos</strong>
          <span className="text-xs text-texto-3">Administración</span>
        </span>
      </div>
      <ul className="flex gap-1 overflow-x-auto px-2.5 pb-2.5 [scrollbar-width:none] lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
        {ENLACES.map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              aria-current={activo(e.href) ? "page" : undefined}
              className="flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium whitespace-nowrap text-texto-4 hover:bg-superficie-2 aria-[current=page]:bg-cielo aria-[current=page]:font-semibold aria-[current=page]:text-azul-texto"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] flex-none fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]">
                <path d={e.icono} />
              </svg>
              {e.texto}
            </Link>
          </li>
        ))}
        <li className="lg:hidden">
          <BotonSalir variante="lateral" />
        </li>
      </ul>
      <div className="mt-auto hidden flex-col gap-2 border-t border-linea pt-3 lg:flex">
        <BotonSalir variante="lateral" />
        <p className="px-3 text-xs text-texto-3">Cuenta técnica: sin acceso a los datos financieros de los clientes.</p>
      </div>
    </nav>
  );
}

export function NavegacionAdmin() {
  return <BarraAdmin ruta={usePathname()} />;
}
