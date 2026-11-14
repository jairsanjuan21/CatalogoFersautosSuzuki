"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Le avisa al monitor del VPS que esta pestaña sigue abierta y en qué página está.
 * - Un "latido" cada 15 s mientras la pestaña está visible (si se oculta, deja de latir y a los 45 s cuenta como ida).
 * - Un latido inmediato al cambiar de página o al empezar a escribir en el formulario.
 * - Al cerrar la pestaña, un aviso de salida con sendBeacon (el navegador lo entrega aunque la página se esté cerrando).
 * No manda datos personales: solo la ruta y un id aleatorio de la visita.
 */

const COOKIE = "presencia_sid";
const CADA_MS = 15_000;

function idDeVisita() {
  const actual = document.cookie.match(/(?:^|;\s*)presencia_sid=([A-Za-z0-9_-]+)/)?.[1];
  if (actual) return actual;
  const nuevo = crypto.randomUUID().replace(/-/g, "");
  // Cookie de sesión (sin fecha): se borra al cerrar el navegador
  document.cookie = `${COOKIE}=${nuevo}; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  return nuevo;
}

export function Presencia() {
  const ruta = usePathname();
  const ultimoInput = useRef(0);
  const rutaActual = useRef(ruta);

  useEffect(() => {
    idDeVisita();
    const latir = () => {
      if (document.visibilityState !== "visible") return;
      const escribiendo = Date.now() - ultimoInput.current < 20_000;
      fetch("/api/presencia", {
        method: "POST",
        body: JSON.stringify({ tipo: "latido", ruta: rutaActual.current, escribiendo }),
        keepalive: true,
      }).catch(() => {});
    };

    latir();
    const intervalo = setInterval(latir, CADA_MS);

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") latir();
    };
    const alSalir = () => navigator.sendBeacon("/api/presencia", JSON.stringify({ tipo: "salida", ruta: rutaActual.current }));
    let avisado = 0;
    const alEscribir = () => {
      ultimoInput.current = Date.now();
      // Primer tecleo (o uno nuevo tras 20 s): se avisa de inmediato que alguien está llenando el formulario
      if (Date.now() - avisado > 20_000) {
        avisado = Date.now();
        latir();
      }
    };

    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("pagehide", alSalir);
    document.addEventListener("input", alEscribir, { passive: true });
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("pagehide", alSalir);
      document.removeEventListener("input", alEscribir);
    };
  }, []);

  // Cambio de página dentro de la app (Next no recarga): latido inmediato con la ruta nueva
  const primera = useRef(true);
  useEffect(() => {
    rutaActual.current = ruta;
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (document.visibilityState === "visible") {
      fetch("/api/presencia", { method: "POST", body: JSON.stringify({ tipo: "latido", ruta }), keepalive: true }).catch(() => {});
    }
  }, [ruta]);

  return null;
}
