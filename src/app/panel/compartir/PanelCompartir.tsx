"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Canal = "whatsapp" | "estados" | "instagram" | "facebook";
export type Estadisticas = Record<string, { recientes: number; vendidas: number }>;

const CANALES: { id: Canal; nombre: string; uso: string }[] = [
  { id: "whatsapp", nombre: "WhatsApp", uso: "Para enviarlo a un cliente por chat." },
  { id: "estados", nombre: "Estados de WhatsApp", uso: "Para publicarlo en tus estados." },
  { id: "instagram", nombre: "Instagram", uso: "Para tu biografía o el sticker “Enlace” de tus historias." },
  { id: "facebook", nombre: "Facebook", uso: "Para publicaciones en tu perfil o en grupos." },
];

/** Resultados de una red en dos etiquetas: se leen igual en el celular y en el computador */
function Resultados({ recientes, vendidas }: { recientes: number; vendidas: number }) {
  return (
    <p className="mt-2 flex flex-wrap gap-1.5 text-sm">
      <span className="rounded-full bg-cielo px-2.5 py-0.5 text-azul-texto">
        <b>{recientes}</b> {recientes === 1 ? "solicitud" : "solicitudes"} en 30 días
      </span>
      <span className={`rounded-full px-2.5 py-0.5 ${vendidas ? "bg-ok-fondo text-ok" : "bg-fondo text-texto-2"}`}>
        <b>{vendidas}</b> {vendidas === 1 ? "vendida" : "vendidas"} en total
      </span>
    </p>
  );
}

/** Copia al portapapeles y avisa por 2 segundos */
function Copiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Navegadores viejos o sin permiso: se selecciona el texto para copiarlo a mano
      window.prompt("Copia este texto:", texto);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <button type="button" onClick={copiar} className="min-h-10 rounded-lg border border-linea-2 bg-superficie px-3.5 text-sm font-semibold">
      {copiado ? "¡Copiado!" : etiqueta}
    </button>
  );
}

export function PanelCompartir({ base, primerNombre, modelos, estadisticas }: { base: string; primerNombre: string; modelos: { slug: string; linea: string }[]; estadisticas: Estadisticas }) {
  const [destino, setDestino] = useState("catalogo");
  const modelo = destino.startsWith("modelo:") ? modelos.find((m) => `modelo:${m.slug}` === destino) : undefined;

  const url = (origen: string) =>
    destino === "credito" ? `${base}/credito?origen=${origen}` : modelo ? `${base}/modelo/${modelo.slug}?origen=${origen}` : `${base}/?origen=${origen}`;
  const frase = destino === "credito" ? "solicitar tu crédito desde el celular en unos minutos" : modelo ? `conocer el Suzuki ${modelo.linea} y solicitar tu crédito` : "ver los Suzuki disponibles y solicitar tu crédito";
  const mensaje = (c: Canal) => {
    const u = url(c);
    if (c === "whatsapp") return `¡Hola! Soy ${primerNombre}, asesora Suzuki en Fersautos. Aquí puedes ${frase}: ${u}`;
    if (c === "estados") return `Estrena tu Suzuki con ${primerNombre}. Entra aquí para ${frase}: ${u}`;
    if (c === "facebook") return `¿Pensando en estrenar carro? Te acompaño en todo el proceso para que estrenes tu Suzuki. Entra aquí para ${frase}: ${u}`;
    return u; // Instagram: solo el enlace
  };

  return (
    <>
      <div className="mt-5 rounded-xl border border-azul bg-cielo p-4">
        <p className="font-semibold">¿Para qué sirve?</p>
        <p className="mt-1 text-[15px]">
          Cada red tiene su <b>propio enlace</b>. Cuando un cliente entra por uno y llena la solicitud, el sistema sabe de qué red vino. Así ves dónde te
          conviene publicar más. Usa siempre el enlace de la red donde lo vas a poner.
        </p>
      </div>

      <label htmlFor="destino" className="mt-5 mb-1 block text-sm font-semibold">¿A dónde lleva el enlace?</label>
      <select id="destino" value={destino} onChange={(e) => setDestino(e.target.value)} className="min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 sm:w-auto">
        <option value="catalogo">Al catálogo (inicio)</option>
        <option value="credito">Directo al formulario de crédito</option>
        <optgroup label="A un modelo">
          {modelos.map((m) => <option key={m.slug} value={`modelo:${m.slug}`}>{m.linea}</option>)}
        </optgroup>
      </select>
      <p className="mt-1 text-[13px] text-texto-2">
        Aunque el cliente pase por el catálogo o un modelo antes de llenar la solicitud, se sigue contando la red por la que llegó.
      </p>

      <div className="mt-4 space-y-3">
        {CANALES.map((c) => {
          const e = estadisticas[c.id] ?? { recientes: 0, vendidas: 0 };
          const texto = mensaje(c.id);
          return (
            <section key={c.id} className="rounded-xl border border-linea bg-superficie p-4">
              <h2 className="font-display text-xl font-bold">{c.nombre}</h2>
              <p className="text-sm text-texto-2">{c.uso}</p>
              <Resultados {...e} />
              <p className="mt-3 rounded-lg bg-fondo px-3 py-2.5 text-[15px] break-words">{texto}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {c.id === "whatsapp" && (
                  <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center rounded-lg bg-azul px-3.5 text-sm font-semibold text-white">
                    Abrir WhatsApp
                  </a>
                )}
                {c.id === "facebook" && (
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url(c.id))}`} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center rounded-lg bg-azul px-3.5 text-sm font-semibold text-white">
                    Compartir en Facebook
                  </a>
                )}
                <Copiar texto={texto} etiqueta={c.id === "instagram" ? "Copiar enlace" : "Copiar mensaje"} />
                {c.id !== "instagram" && <Copiar texto={url(c.id)} etiqueta="Copiar solo el enlace" />}
              </div>
              {c.id === "instagram" && <p className="mt-2 text-[13px] text-texto-2">Instagram no deja abrirse con un mensaje escrito: pega el enlace en tu biografía o en el sticker “Enlace” de una historia.</p>}
            </section>
          );
        })}
        <CodigoQr url={url("qr")} estadisticas={estadisticas.qr ?? { recientes: 0, vendidas: 0 }} />
      </div>
    </>
  );
}

function CodigoQr({ url, estadisticas }: { url: string; estadisticas: { recientes: number; vendidas: number } }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    // Nivel de corrección "M": el código sigue leyéndose aunque se manche o se arrugue un poco
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1a2330", light: "#ffffff" } }).then(setSvg);
  }, [url]);

  async function descargarPng() {
    const datos = await QRCode.toDataURL(url, { width: 1200, margin: 2, errorCorrectionLevel: "M" }); // grande para imprimir nítido
    const a = document.createElement("a");
    a.href = datos;
    a.download = "qr-natalia-suzuki.png";
    a.click();
  }
  function descargarSvg() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    a.download = "qr-natalia-suzuki.svg";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="rounded-xl border border-linea bg-superficie p-4">
      <h2 className="font-display text-xl font-bold">Código QR</h2>
      <p className="text-sm text-texto-2">Para imprimir en tarjetas, volantes o la vitrina de la sede.</p>
      <Resultados {...estadisticas} />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {/* El SVG lo genera la librería a partir de la URL: no contiene contenido de terceros */}
        <div className="size-44 rounded-lg border border-linea bg-white p-2" role="img" aria-label={`Código QR que lleva a ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="flex flex-col gap-2">
          <button type="button" onClick={descargarPng} className="min-h-10 rounded-lg bg-azul px-3.5 text-sm font-semibold text-white">Descargar para imprimir (PNG)</button>
          <button type="button" onClick={descargarSvg} disabled={!svg} className="min-h-10 rounded-lg border border-linea-2 bg-superficie px-3.5 text-sm font-semibold">Descargar para diseño (SVG)</button>
          <p className="max-w-56 text-[13px] text-texto-2">El SVG sirve para quien haga el diseño de tus tarjetas: no pierde calidad a ningún tamaño.</p>
        </div>
      </div>
    </section>
  );
}
