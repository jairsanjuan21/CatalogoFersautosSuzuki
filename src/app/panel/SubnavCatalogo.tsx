import Link from "next/link";

const PESTANAS = [
  { href: "/panel/precios", texto: "Precios" },
  { href: "/panel/catalogo", texto: "Modelos" },
  { href: "/panel/galeria", texto: "Galería" },
] as const;

/** Pestañas de la sección Catálogo. Recibe cuál está activa (sin usePathname: no necesita JavaScript). */
export function SubnavCatalogo({ activa }: { activa: (typeof PESTANAS)[number]["texto"] }) {
  return (
    <nav aria-label="Catálogo" className="mt-4 flex gap-1 rounded-xl border border-linea bg-superficie p-1">
      {PESTANAS.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={p.texto === activa ? "page" : undefined}
          className="flex min-h-10 flex-1 items-center justify-center rounded-lg text-[15px] text-texto-2 aria-[current=page]:bg-azul aria-[current=page]:font-semibold aria-[current=page]:text-white"
        >
          {p.texto}
        </Link>
      ))}
    </nav>
  );
}
