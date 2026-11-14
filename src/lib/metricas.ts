import "server-only";

/**
 * Puente con el panel de monitoreo del VPS (repositorio MetricasVPS).
 *
 * El catálogo le cuenta al monitor quién está conectado y qué está haciendo, por la red
 * interna de Docker (http://metricas-app:4000). Nunca debe afectar al catálogo:
 * - si las variables no están configuradas, no hace nada;
 * - si el monitor está caído o lento, se rinde a los 1,5 s y sigue como si nada.
 */

export type EventoMetricas = {
  tipo: "latido" | "salida" | "formulario_enviado";
  sid: string;
  ruta: string;
  rol: "visitante" | "asesora" | "admin";
  nombre?: string;
  dispositivo: string;
  escribiendo?: boolean;
};

const URL_INGESTA = process.env.METRICAS_INGESTA_URL;
const TOKEN = process.env.METRICAS_TOKEN;

export const COOKIE_PRESENCIA = "presencia_sid";
export const SID_VALIDO = /^[A-Za-z0-9_-]{8,64}$/;

export function reportarAMetricas(evento: EventoMetricas) {
  if (!URL_INGESTA || !TOKEN) return;
  fetch(URL_INGESTA, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(evento),
    signal: AbortSignal.timeout(1500),
  }).catch(() => {
    // El monitor es opcional: un fallo aquí no se le muestra a nadie
  });
}

/** "Móvil · Android · Chrome" a partir del User-Agent (sin guardar el User-Agent completo). */
export function describirDispositivo(ua: string | null) {
  if (!ua) return "Desconocido";
  const tipo = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Móvil" : "Escritorio";
  const so = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(ua)
      ? "iOS"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac OS X/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Otro";
  const nav = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : /Safari\//.test(ua)
              ? "Safari"
              : "";
  return [tipo, so, nav].filter(Boolean).join(" · ");
}

export const esBot = (ua: string | null) => !ua || /bot|crawler|spider|preview|facebookexternalhit|whatsapp/i.test(ua);
