/**
 * Extrae el identificador de 11 caracteres de cualquier enlace de YouTube
 * (o lo acepta suelto). Devuelve null si no es de YouTube.
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s   (navegador)
 *   https://youtu.be/dQw4w9WgXcQ?si=abc                 (botón "Compartir" de la app)
 *   https://youtube.com/shorts/dQw4w9WgXcQ              (Shorts)
 *   https://www.youtube.com/embed/dQw4w9WgXcQ  ·  /live/…  ·  m.youtube.com
 */
const ID = /^[A-Za-z0-9_-]{11}$/;

export function idDeYoutube(texto: string): string | null {
  const t = texto.trim();
  if (ID.test(t)) return t;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const [, tipo, valor] = url.pathname.split("/");
      if (["shorts", "embed", "live", "v"].includes(tipo)) id = valor ?? null;
    }
  }
  return id && ID.test(id) ? id : null;
}

/** Miniatura que YouTube publica para cada video (no requiere llave) */
export const miniaturaYoutube = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
