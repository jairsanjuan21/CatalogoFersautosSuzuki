import { NextResponse, type NextRequest } from "next/server";
import { almacenamiento } from "@/lib/almacenamiento";

/**
 * Sirve SOLO las fotos públicas. El patrón es estricto a propósito: así es
 * imposible pedir por aquí una cédula (que vive en "solicitudes/...") o
 * escapar de la carpeta con "../".
 */
const PERMITIDA = /^publico\/(modelos\/[0-9a-f-]{36}|asesora)\/[0-9a-f-]{36}-(600|1200)\.webp$/;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ ruta: string[] }> }) {
  const clave = (await params).ruta.join("/");
  if (!PERMITIDA.test(clave)) return new NextResponse("No encontrada", { status: 404 });
  try {
    const datos = await almacenamiento.leer(clave);
    return new NextResponse(new Uint8Array(datos), {
      headers: {
        "Content-Type": "image/webp",
        // El nombre lleva un identificador único: si la foto cambia, cambia la URL.
        // Por eso el navegador la puede guardar un año sin volver a preguntar.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("No encontrada", { status: 404 });
  }
}
