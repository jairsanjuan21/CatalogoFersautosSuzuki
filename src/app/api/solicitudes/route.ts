import { NextResponse, type NextRequest } from "next/server";
import { ARCHIVOS, erroresPorCampo, esquemaSolicitud } from "@/validacion/solicitud";
import { crearSolicitud, ErrorSolicitud } from "@/modulos/solicitudes/crear";
import { ipDeLaPeticion, permitir } from "@/lib/limite";
import { origenSolicitud } from "@/db/esquema";

const respuesta = (status: number, cuerpo: object) => NextResponse.json(cuerpo, { status });

async function leerArchivo(datos: FormData, campo: string, tipos: readonly string[], maxBytes: number) {
  const archivo = datos.get(campo);
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Falta el archivo." };
  if (!tipos.includes(archivo.type)) return { error: "Formato de archivo no permitido." };
  if (archivo.size > maxBytes) return { error: "El archivo es demasiado grande." };
  return { buffer: Buffer.from(await archivo.arrayBuffer()) };
}

export async function POST(request: NextRequest) {
  const ip = ipDeLaPeticion(request.headers);

  // Máximo 5 envíos por hora desde la misma IP
  if (!permitir(`solicitud:${ip}`, 5, 60 * 60 * 1000)) {
    return respuesta(429, { mensaje: "Recibimos varias solicitudes desde tu conexión. Intenta de nuevo en un rato." });
  }

  let formulario: FormData;
  try {
    formulario = await request.formData();
  } catch {
    return respuesta(400, { mensaje: "No pudimos leer la solicitud." });
  }

  // Campo trampa: es invisible para las personas; si viene lleno, lo llenó un bot
  if (String(formulario.get("sitio_web") ?? "") !== "") {
    return respuesta(400, { mensaje: "No pudimos procesar la solicitud." });
  }

  let json: unknown;
  try {
    json = JSON.parse(String(formulario.get("datos") ?? ""));
  } catch {
    return respuesta(400, { mensaje: "No pudimos leer la solicitud." });
  }

  const validacion = esquemaSolicitud.safeParse(json);
  if (!validacion.success) {
    return respuesta(422, { mensaje: "Revisa los datos marcados.", errores: erroresPorCampo(validacion.error) });
  }

  const [frente, reves, firma] = await Promise.all([
    leerArchivo(formulario, "cedulaFrente", ARCHIVOS.tiposFoto, ARCHIVOS.maxBytesFoto),
    leerArchivo(formulario, "cedulaReves", ARCHIVOS.tiposFoto, ARCHIVOS.maxBytesFoto),
    leerArchivo(formulario, "firma", ["image/png"], ARCHIVOS.maxBytesFirma),
  ]);
  const erroresArchivos: Record<string, string> = {};
  if (frente.error) erroresArchivos["documento.cedulaFrente"] = frente.error;
  if (reves.error) erroresArchivos["documento.cedulaReves"] = reves.error;
  if (firma.error) erroresArchivos["firma"] = firma.error;
  if (Object.keys(erroresArchivos).length) {
    return respuesta(422, { mensaje: "Revisa los archivos.", errores: erroresArchivos });
  }

  const origenPedido = String(formulario.get("origen") ?? "");
  const origen = (origenSolicitud.enumValues as readonly string[]).includes(origenPedido)
    ? (origenPedido as (typeof origenSolicitud.enumValues)[number])
    : "directo";

  try {
    const { radicado } = await crearSolicitud({
      datos: validacion.data,
      archivos: { cedulaFrente: frente.buffer!, cedulaReves: reves.buffer!, firma: firma.buffer! },
      origen,
      ip: ip === "desconocida" ? null : ip,
      agenteUsuario: request.headers.get("user-agent"),
    });
    return respuesta(201, { radicado });
  } catch (e) {
    if (e instanceof ErrorSolicitud) {
      const status = e.codigo === "CLAUSULA_DESACTUALIZADA" ? 409 : 422;
      return respuesta(status, { mensaje: e.message, codigo: e.codigo });
    }
    console.error("Error al crear la solicitud", e);
    return respuesta(500, { mensaje: "Tuvimos un problema guardando tu solicitud. Intenta de nuevo en unos minutos." });
  }
}
