import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { almacenamiento } from "@/lib/almacenamiento";
import { obtenerSolicitudCompleta } from "@/modulos/solicitudes/consultar";
import { generarFormularioFns01 } from "./formulario-fns01";
import { generarPdfCedula } from "./cedula";

export type TipoPdf = "formulario" | "cedula";

export class ErrorPdf extends Error {
  constructor(
    public codigo: "NO_EXISTE" | "SIN_VALOR" | "SIN_ARCHIVOS",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** "Gómez Ruiz" → "GomezRuiz" para el nombre del archivo */
const paraArchivo = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9]/g, "");

/**
 * Genera el PDF pedido. Se arma en el momento a partir de los datos actuales,
 * así siempre refleja el último valor del vehículo que puso Natalia.
 */
export async function generarDocumento(solicitudId: string, tipo: TipoPdf) {
  const s = await obtenerSolicitudCompleta(solicitudId);
  if (!s) throw new ErrorPdf("NO_EXISTE", "La solicitud no existe.");

  const archivo = (tipo: (typeof t.tipoArchivo.enumValues)[number]) => {
    const d = s.documentos.find((x) => x.tipo === tipo && !x.eliminadoEn);
    return d ? almacenamiento.leer(d.claveArchivo) : null;
  };
  const base = `${paraArchivo(s.primerApellido)}${paraArchivo(s.segundoApellido ?? "")}_${s.numeroIdentificacion}`;

  let bytes: Uint8Array;
  let nombre: string;

  if (tipo === "formulario") {
    if (s.valorVehiculo === null) {
      throw new ErrorPdf("SIN_VALOR", "Primero asigna el modelo y el valor del vehículo.");
    }
    const [[conf], firma] = await Promise.all([db.select().from(t.configuracion).limit(1), archivo("firma")]);
    bytes = await generarFormularioFns01(
      s,
      {
        asesoraNombre: conf.asesoraNombre,
        asesoraCc: conf.asesoraCc,
        ciudad: conf.ciudad,
        sede: conf.sede,
        marca: conf.marcaPorDefecto,
        plan: conf.planFinanciacion,
      },
      firma,
    );
    nombre = `FNS01_${base}.pdf`;
  } else {
    const [frente, reves] = await Promise.all([archivo("cedula_frente"), archivo("cedula_reves")]);
    if (!frente || !reves) throw new ErrorPdf("SIN_ARCHIVOS", "Las fotos de la cédula ya no están disponibles.");
    bytes = await generarPdfCedula({
      nombre: [s.nombres, s.primerApellido, s.segundoApellido].filter(Boolean).join(" "),
      documento: `${s.tipoIdentificacion === "cc" ? "C.C." : "C.E."} ${Number(s.numeroIdentificacion).toLocaleString("es-CO")}`,
      radicado: s.radicado,
      frente,
      reves,
    });
    nombre = `CEDULA_${base}.pdf`;
  }

  return {
    bytes,
    nombre,
    radicado: s.radicado,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
