/* Íconos de los botones de acción de la solicitud. Cada uno tiene su animación al pasar el cursor (globals.css, .boton-accion). */

const base = "icono-accion size-[22px] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]";

export type Anim = "timbre" | "burbuja" | "hoja" | "tarjeta" | "pila" | "avion";

export function IconoAccion({ anim }: { anim: Anim }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={base} data-anim={anim}>
      {anim === "timbre" && <path d="M5 4h3.5l1.6 4-2.2 1.4a11 11 0 0 0 6.7 6.7l1.4-2.2 4 1.6V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" />}
      {anim === "burbuja" && (
        <>
          <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" />
          <path d="M9 10.5c.3 1.6 1.9 3.3 3.6 3.8l1.2-1.1 1.6.8" />
        </>
      )}
      {anim === "hoja" && (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </>
      )}
      {anim === "tarjeta" && (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <circle cx="8.5" cy="11" r="2" />
          <path d="M5.8 16c.5-1.4 1.5-2.1 2.7-2.1s2.2.7 2.7 2.1M14 10h4M14 13.5h3" />
        </>
      )}
      {anim === "pila" && (
        <>
          <path d="M9 3h6l4 4v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M7 7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" />
          <path d="M15 3v4h4" />
        </>
      )}
      {anim === "avion" && <path d="M21 3 3 10.5l6.5 2.5L12 20l3-6.5M21 3l-8.5 10.5M21 3 15 13.5" />}
    </svg>
  );
}
