import Link from "next/link";
import { atributosFoto, urlFoto } from "@/modulos/fotos/fotos";

type Foto = { id: string; clave: string; pie: string | null };

/** Cuadrícula de fotos de entregas. Tocar una abre la versión grande. */
export function FotosEntregas({ id, titulo, descripcion, fotos, verTodas }: { id: string; titulo: string; descripcion: string; fotos: Foto[]; verTodas?: boolean }) {
  if (!fotos.length) return null; // una sección vacía no se muestra
  return (
    <section id={id} className="mt-12 scroll-mt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-4xl leading-none font-bold">{titulo}</h2>
          <p className="mt-1.5 text-texto-2">{descripcion}</p>
        </div>
        {verTodas && (
          <Link href={`/galeria#${id}`} className="font-semibold text-azul-texto">
            Ver todas ›
          </Link>
        )}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3">
        {fotos.map((f) => (
          <li key={f.id}>
            <a href={urlFoto(f.clave, 1200)} target="_blank" rel="noopener" className="group relative block overflow-hidden rounded-xl bg-cielo">
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas en WebP con srcset */}
              <img {...atributosFoto(f.clave, "(min-width: 768px) 33vw, 50vw")} alt={f.pie ?? titulo} loading="lazy" className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105" />
              {f.pie && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pt-8 pb-2.5 text-sm leading-snug text-white">{f.pie}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
