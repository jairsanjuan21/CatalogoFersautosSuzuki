import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { desc } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { almacenamiento } from "@/lib/almacenamiento";
import type { Solicitud } from "@/validacion/solicitud";

export class ErrorSolicitud extends Error {
  constructor(
    public codigo: "CLAUSULA_DESACTUALIZADA" | "IMAGEN_INVALIDA" | "FIRMA_INVALIDA" | "PLAZO_NO_DISPONIBLE",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

type Origen = (typeof t.origenSolicitud.enumValues)[number];

export interface NuevaSolicitud {
  datos: Solicitud;
  archivos: { cedulaFrente: Buffer; cedulaReves: Buffer; firma: Buffer };
  origen: Origen;
  ip: string | null;
  agenteUsuario: string | null;
}

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/**
 * Normaliza una foto de cédula: endereza según la orientación de la cámara,
 * limita el tamaño y re-codifica en JPEG. Al re-codificar se BORRAN los
 * metadatos EXIF, que pueden incluir la ubicación GPS de quien tomó la foto.
 */
async function procesarFoto(original: Buffer, lado: string) {
  try {
    const imagen = sharp(original, { failOn: "error" });
    const meta = await imagen.metadata();
    if (!meta.width || !meta.height || Math.max(meta.width, meta.height) < 400) {
      throw new ErrorSolicitud("IMAGEN_INVALIDA", `La foto del ${lado} es muy pequeña. Tómala de nuevo más cerca.`);
    }
    return await imagen
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    if (e instanceof ErrorSolicitud) throw e;
    throw new ErrorSolicitud("IMAGEN_INVALIDA", `No pudimos leer la foto del ${lado}. Intenta con otra foto.`);
  }
}

async function procesarFirma(original: Buffer) {
  try {
    const imagen = sharp(original, { failOn: "error" });
    const meta = await imagen.metadata();
    if (meta.format !== "png" || !meta.width || meta.width < 100) throw new Error();
    // Cuenta los píxeles que de verdad tienen tinta (canal alfa > 0).
    // Un lienzo vacío o con un punto suelto no es una firma.
    const { data } = await sharp(original).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
    let pintados = 0;
    for (const alfa of data) if (alfa > 32) pintados++;
    if (pintados < 150) throw new Error();
    return await imagen.trim().png({ compressionLevel: 9 }).toBuffer();
  } catch {
    throw new ErrorSolicitud("FIRMA_INVALIDA", "No recibimos una firma válida. Firma de nuevo en el recuadro.");
  }
}

export async function crearSolicitud(entrada: NuevaSolicitud) {
  const { datos } = entrada;

  // 1. El cliente debe haber aceptado la versión vigente de la cláusula
  const [clausula] = await db.select().from(t.clausulas).orderBy(desc(t.clausulas.version)).limit(1);
  if (!clausula || clausula.version !== datos.consentimiento.clausulaVersion) {
    throw new ErrorSolicitud(
      "CLAUSULA_DESACTUALIZADA",
      "El texto de la autorización cambió. Recarga la página y vuelve a aceptarlo.",
    );
  }

  // El plazo debe estar entre los que Natalia ofrece hoy (se configuran en el panel)
  const [conf] = await db.select({ plazos: t.configuracion.plazosMeses }).from(t.configuracion).limit(1);
  if (conf && !conf.plazos.includes(datos.vehiculo.plazoMeses)) {
    throw new ErrorSolicitud("PLAZO_NO_DISPONIBLE", "Ese plazo ya no está disponible. Recarga la página y elige otro.");
  }

  // 2. Procesar archivos antes de tocar la base de datos (si una foto está mala, no queda nada a medias)
  const [frente, reves, firma] = await Promise.all([
    procesarFoto(entrada.archivos.cedulaFrente, "frente"),
    procesarFoto(entrada.archivos.cedulaReves, "respaldo"),
    procesarFirma(entrada.archivos.firma),
  ]);

  const id = randomUUID();
  const archivos = [
    { tipo: "cedula_frente" as const, datos: frente, mime: "image/jpeg", ext: "jpg" },
    { tipo: "cedula_reves" as const, datos: reves, mime: "image/jpeg", ext: "jpg" },
    { tipo: "firma" as const, datos: firma, mime: "image/png", ext: "png" },
  ].map((a) => ({ ...a, clave: `solicitudes/${id}/${a.tipo}.${a.ext}` }));

  // 3. Guardar archivos; si la base de datos falla después, se borran (compensación)
  await Promise.all(archivos.map((a) => almacenamiento.guardar(a.clave, a.datos, a.mime)));

  try {
    const ahora = new Date();
    const { vehiculo, personal, contacto, actividad: act, finanzas, referencias, conyuge } = datos;
    const esEmpleado = act.actividad === "empleado";

    const radicado = await db.transaction(async (tx) => {
      const [creada] = await tx
        .insert(t.solicitudes)
        .values({
          id,
          origen: entrada.origen,
          lineaInteres: vehiculo.lineaInteres,
          cuotaInicial: vehiculo.cuotaInicial,
          plazoMeses: vehiculo.plazoMeses,
          ...personal,
          ...contacto,
          arrendadorNombre: contacto.tipoVivienda === "arrendada" ? contacto.arrendadorNombre : null,
          arrendadorTelefono: contacto.tipoVivienda === "arrendada" ? contacto.arrendadorTelefono : null,
          valorArriendo: contacto.tipoVivienda === "arrendada" ? contacto.valorArriendo : null,
          actividad: act.actividad,
          empresa: act.empresa,
          direccionEmpresa: act.direccionEmpresa,
          telefonoEmpresa: act.telefonoEmpresa,
          antiguedad: act.antiguedad,
          cargo: esEmpleado ? act.cargo : null,
          tipoContrato: esEmpleado ? act.tipoContrato : null,
          anteriorEmpresa: esEmpleado && act.tieneEmpleoAnterior ? act.anteriorEmpresa : null,
          anteriorCargo: esEmpleado && act.tieneEmpleoAnterior ? act.anteriorCargo : null,
          anteriorAntiguedad: esEmpleado && act.tieneEmpleoAnterior ? act.anteriorAntiguedad : null,
          anteriorTelefono: esEmpleado && act.tieneEmpleoAnterior ? act.anteriorTelefono : null,
          anteriorTipoContrato: esEmpleado && act.tieneEmpleoAnterior ? act.anteriorTipoContrato : null,
          ingresosMensuales: finanzas.ingresosMensuales,
          egresosMensuales: finanzas.egresosMensuales,
          declaraRenta: finanzas.declaraRenta,
          monedaExtranjera: finanzas.monedaExtranjera,
          clausulaId: clausula.id,
          aceptaAutorizacionEn: ahora,
          aceptaDatosEn: ahora,
          ipFirma: entrada.ip,
          agenteUsuario: entrada.agenteUsuario?.slice(0, 300),
        })
        .returning({ radicado: t.solicitudes.radicado });

      await tx.insert(t.referencias).values([
        { solicitudId: id, tipo: "familiar", ...referencias.familiar },
        { solicitudId: id, tipo: "personal", ...referencias.personal },
        { solicitudId: id, tipo: "comercial", ...referencias.comercial },
      ]);

      if (conyuge.conyuge) await tx.insert(t.conyuges).values({ solicitudId: id, ...conyuge.conyuge });
      if (finanzas.inmueble) await tx.insert(t.inmuebles).values({ solicitudId: id, ...finanzas.inmueble });
      if (finanzas.vehiculo) await tx.insert(t.vehiculosCliente).values({ solicitudId: id, ...finanzas.vehiculo });

      await tx.insert(t.documentos).values(
        archivos.map((a) => ({
          solicitudId: id,
          tipo: a.tipo,
          claveArchivo: a.clave,
          tipoMime: a.mime,
          tamanoBytes: a.datos.length,
          sha256: sha256(a.datos),
        })),
      );

      await tx.insert(t.historial).values({
        solicitudId: id,
        actor: "cliente",
        descripcion: "Solicitud recibida desde el formulario",
      });

      await tx.insert(t.auditoria).values({
        actor: "cliente",
        accion: "Envió una solicitud de crédito",
        entidad: "solicitudes",
        entidadId: creada.radicado,
        ip: entrada.ip,
        detalle: { origen: entrada.origen },
      });

      return creada.radicado;
    });

    // TODO fase 3: avisar a Natalia por Telegram
    return { id, radicado };
  } catch (e) {
    await Promise.allSettled(archivos.map((a) => almacenamiento.borrar(a.clave)));
    throw e;
  }
}
