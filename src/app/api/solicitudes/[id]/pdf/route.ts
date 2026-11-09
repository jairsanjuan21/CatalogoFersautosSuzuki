import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { ipDeLaPeticion } from "@/lib/limite";
import { ErrorPdf, generarDocumento, type TipoPdf } from "@/modulos/pdf/documentos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/solicitudes/:id/pdf?tipo=formulario|cedula  (solo la asesora) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await auth.api.getSession({ headers: request.headers });
  if (!sesion) return NextResponse.json({ mensaje: "Inicia sesión." }, { status: 401 });
  // El admin es una cuenta técnica: no descarga datos de clientes
  if (sesion.user.role !== "asesora") return NextResponse.json({ mensaje: "No tienes acceso." }, { status: 403 });

  const { id } = await params;
  const tipo = request.nextUrl.searchParams.get("tipo") as TipoPdf;
  if (!UUID.test(id) || (tipo !== "formulario" && tipo !== "cedula")) {
    return NextResponse.json({ mensaje: "Solicitud no válida." }, { status: 400 });
  }

  try {
    const doc = await generarDocumento(id, tipo);
    const accion = tipo === "formulario" ? "PDF del formulario descargado" : "PDF de la cédula descargado";
    const ip = ipDeLaPeticion(request.headers);
    await Promise.all([
      db.insert(t.historial).values({ solicitudId: id, actor: "asesora", usuarioId: sesion.user.id, descripcion: accion }),
      db.insert(t.auditoria).values({
        actor: "asesora",
        usuarioId: sesion.user.id,
        accion,
        entidad: "solicitudes",
        entidadId: doc.radicado,
        ip: ip === "desconocida" ? null : ip,
        detalle: { archivo: doc.nombre, sha256: doc.sha256 },
      }),
    ]);

    return new NextResponse(Buffer.from(doc.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${doc.nombre}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof ErrorPdf) {
      const status = e.codigo === "NO_EXISTE" ? 404 : 409;
      return NextResponse.json({ mensaje: e.message }, { status });
    }
    console.error("Error generando PDF", e);
    return NextResponse.json({ mensaje: "No se pudo generar el PDF." }, { status: 500 });
  }
}
