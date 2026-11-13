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
    <nav aria-label="Administración" className="sticky top-0 z-20 bg-[#1c2738] text-[#c9d3e1] lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col">
      <div className="font-display px-5 pt-4 pb-1.5 text-xl font-bold text-white lg:pt-6">
        Fersautos <span className="ml-1.5 rounded bg-senal px-1.5 py-0.5 align-[3px] font-sans text-xs font-semibold text-white">Admin</span>
      </div>
      <ul className="flex gap-1 overflow-x-auto px-2.5 pb-2.5 [scrollbar-width:none] lg:flex-col lg:overflow-visible">
        {ENLACES.map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              aria-current={activo(e.href) ? "page" : undefined}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] whitespace-nowrap aria-[current=page]:bg-[#2c3b54] aria-[current=page]:font-semibold aria-[current=page]:text-white"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] flex-none fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]">
                <path d={e.icono} />
              </svg>
              {e.texto}
            </Link>
          </li>
        ))}
        {/* En el celular el menú es una fila horizontal: "Cerrar sesión" va al final de ella */}
        <li className="lg:hidden">
          <BotonSalir variante="oscuro" />
        </li>
      </ul>
      <div className="mt-auto hidden border-t border-[#2c3b54] px-2.5 py-3 lg:block">
        <BotonSalir variante="oscuro" />
        <p className="mt-2 px-3 text-[13px]">Cuenta técnica: sin acceso a los datos financieros de los clientes.</p>
      </div>
    </nav>
  );
}

export function NavegacionAdmin() {
  return <BarraAdmin ruta={usePathname()} />;
}
