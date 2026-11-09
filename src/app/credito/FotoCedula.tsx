"use client";

import { useState } from "react";

export interface Foto {
  blob: Blob;
  url: string;
  aviso?: string;
}

/**
 * Comprime la foto en el celular antes de enviarla: una foto de 4 MB queda en
 * unos 300 KB. Así el cliente no gasta sus datos y el envío es rápido.
 * También revisa el brillo para avisar si la foto quedó oscura o con reflejo.
 */
async function procesar(archivo: File): Promise<Foto> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const max = 1600;
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * k);
    cv.height = Math.round(img.naturalHeight * k);
    cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);

    const muestra = document.createElement("canvas");
    muestra.width = muestra.height = 40;
    const mx = muestra.getContext("2d")!;
    mx.drawImage(img, 0, 0, 40, 40);
    const px = mx.getImageData(0, 0, 40, 40).data;
    let brillo = 0;
    for (let i = 0; i < px.length; i += 4) brillo += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    brillo /= 1600;

    let aviso: string | undefined;
    if (brillo < 60) aviso = "La foto se ve oscura. Si los datos no se leen bien, tómala de nuevo con más luz.";
    else if (brillo > 225) aviso = "La foto se ve muy clara o con reflejo. Revisa que los datos se lean.";
    else if (Math.max(img.naturalWidth, img.naturalHeight) < 800)
      aviso = "La foto tiene baja resolución. Si puedes, tómala de nuevo más cerca.";

    const blob = await new Promise<Blob>((ok, mal) =>
      cv.toBlob((b) => (b ? ok(b) : mal(new Error("sin blob"))), "image/jpeg", 0.85),
    );
    return { blob, url: URL.createObjectURL(blob), aviso };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FotoCedula({
  titulo,
  descripcion,
  foto,
  alCambiar,
  error,
}: {
  titulo: string;
  descripcion: string;
  foto?: Foto;
  alCambiar: (f: Foto) => void;
  error?: string;
}) {
  const [leyendo, setLeyendo] = useState(false);
  const [errorLectura, setErrorLectura] = useState<string>();

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite elegir la misma foto otra vez
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      setErrorLectura("El archivo debe ser una foto.");
      return;
    }
    setLeyendo(true);
    setErrorLectura(undefined);
    try {
      if (foto) URL.revokeObjectURL(foto.url);
      alCambiar(await procesar(archivo));
    } catch {
      setErrorLectura("No pudimos leer esa imagen. Intenta con otra foto.");
    } finally {
      setLeyendo(false);
    }
  }

  const mensajeError = errorLectura ?? error;
  const boton = "flex min-h-12 min-w-36 flex-1 cursor-pointer items-center justify-center rounded-lg border px-4 font-semibold focus-within:ring-2 focus-within:ring-azul";

  return (
    <section data-campo={titulo} className="col-span-2">
      <h3 className="font-display text-xl font-semibold">{titulo}</h3>
      <p className="mb-2 text-[15px] text-texto-2">{descripcion}</p>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no pasa por el optimizador
        <img
          src={foto.url}
          alt={`Foto del ${titulo.toLowerCase()} de tu cédula`}
          className="block aspect-[1.585] w-full rounded-2xl border border-linea-2 bg-fondo object-contain"
        />
      ) : (
        <div
          className={`grid aspect-[1.585] w-full place-items-center rounded-2xl border-2 border-dashed bg-superficie text-texto-2 ${
            mensajeError ? "border-senal" : "border-linea-2"
          }`}
        >
          {leyendo ? "Procesando foto…" : `Ubica aquí el ${titulo.toLowerCase()}`}
        </div>
      )}
      {foto?.aviso && <p className="mt-2 rounded-lg bg-ambar-fondo p-2.5 text-sm text-ambar">{foto.aviso}</p>}
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        <label className={`${boton} ${foto ? "border-linea-2 bg-superficie" : "border-azul bg-azul text-white"}`}>
          <input type="file" accept="image/*" capture="environment" onChange={elegir} className="sr-only" />
          {foto ? "Tomar de nuevo" : "Tomar foto"}
        </label>
        <label className={`${boton} border-linea-2 bg-superficie`}>
          <input type="file" accept="image/*" onChange={elegir} className="sr-only" />
          Subir desde galería
        </label>
      </div>
      {mensajeError && <p className="mt-1.5 text-sm text-senal">{mensajeError}</p>}
    </section>
  );
}
