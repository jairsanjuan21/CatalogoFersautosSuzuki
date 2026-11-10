/**
 * Comprime una foto en el navegador antes de subirla.
 * Las Server Actions aceptan hasta 1 MB, así que se intenta con calidad alta y,
 * si una foto muy detallada sigue pesando demasiado, se reduce de forma
 * progresiva hasta que quepa. Solo funciona en el navegador.
 */
const INTENTOS: [maxLado: number, calidad: number][] = [
  [2000, 0.85],
  [1600, 0.78],
  [1280, 0.7],
  [1280, 0.55],
];

export async function comprimirImagen(archivo: File, maxLado = 2000, limiteBytes = 850 * 1024): Promise<Blob> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    let ultimo: Blob | null = null;
    for (const [lado, calidad] of INTENTOS.filter(([l]) => l <= maxLado)) {
      const k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(img.naturalWidth * k);
      lienzo.height = Math.round(img.naturalHeight * k);
      lienzo.getContext("2d")!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      ultimo = await new Promise<Blob>((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo comprimir"))), "image/jpeg", calidad));
      if (ultimo.size <= limiteBytes) return ultimo;
    }
    if (!ultimo) throw new Error("No se pudo comprimir");
    return ultimo; // si aún así pesa mucho, el servidor responde con un mensaje claro
  } finally {
    URL.revokeObjectURL(url);
  }
}
